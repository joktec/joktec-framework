import { instanceToPlain, toInt } from '@joktec/utils';
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { lookup } from 'geoip-lite';
import { head, isEmpty, uniq } from 'lodash';
import requestIp from 'request-ip';
import { catchError, Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import useragent from 'useragent';
import { ExpressRequest, ExpressResponse, GeoIp, IBaseRequest, IResponseDto, UserAgent } from '../models';
import {
  DEFAULT_REQUEST_CAST_OPTIONS,
  castRequestValue,
  shouldResolveSearchBody,
  type ExpressRequestCastOptions,
} from './express/request-cast';
import type { ExpressResponseType } from './express/express.type';

@Injectable()
export class ExpressInterceptor<T = any> implements NestInterceptor<T, ExpressResponseType<T>> {
  /**
   * Main Nest interceptor entrypoint.
   *
   * The interceptor snapshots the original request, enriches request metadata,
   * finalizes query/search-body shapes, then wraps successful responses into the
   * default JokTec response envelope.
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<ExpressRequest<T>>();
    const res = context.switchToHttp().getResponse<ExpressResponse<T>>();

    this.backupQuery(req, res);
    this.injectRequest(req);

    return next.handle().pipe(
      map((data: T) => this.transformResponse(data)),
      catchError(err => this.handleError(err)),
    );
  }

  /**
   * Snapshot original request inputs before interceptor normalization.
   *
   * `res.locals` keeps raw query/body/params available for downstream code that
   * needs to compare the original HTTP payload with the normalized request.
   */
  protected backupQuery(req: ExpressRequest, res: ExpressResponse) {
    res.locals.query = req.query;
    res.locals.body = req.body;
    res.locals.params = req.params;
  }

  /**
   * Enrich and finalize the Express request object.
   *
   * This method intentionally owns the Express 5 `req.query` replacement via
   * `Object.defineProperty`. Express 5 exposes `req.query` as a getter, so
   * assigning onto a single returned object is not stable across later reads.
   *
   * Override this only when an application needs to add request-scoped fields
   * around the full core flow. Prefer overriding `resolverLanguage`,
   * `resolverTimezone`, `resolverQuery` or `resolverSearchBody` for normal app
   * customization.
   */
  protected injectRequest(req: ExpressRequest) {
    req.locale = this.resolverLanguage(req);
    req.timezone = this.resolverTimezone(req);
    req.userAgent = this.resolverUserAgent(req);
    req.geoIp = this.resolverGeoIP(req);
    if (shouldResolveSearchBody(req, this.resolverRequestCastOptions(req))) {
      req.body = this.resolverSearchBody(req);
    }

    const overrideQuery = Object.assign(req.query || {}, this.resolverQuery(req));
    Object.defineProperty(req, 'query', { value: overrideQuery, writable: false });
  }

  /**
   * Resolve the request locale from the `Accept-Language` header.
   *
   * Applications that use i18n modules can override this method to add their
   * own fallback while preserving the base header parser through `super`.
   */
  protected resolverLanguage(req: ExpressRequest): string {
    if (!req.headers['accept-language']) return null;
    const acceptLanguage: string = req.headers['accept-language'] as string;
    const regex = /((([a-zA-Z]+(-[a-zA-Z0-9]+){0,2})|\*)(;q=[0-1](\.[0-9]+)?)?)*/g;
    const strings = acceptLanguage.match(regex);
    const languages = strings
      .filter(m => !isEmpty(m))
      .map(m => {
        const bits = m.split(';');
        const ietf = bits[0].split('-');
        const hasScript = ietf.length === 3;
        return {
          code: ietf[0],
          script: hasScript ? ietf[1] : null,
          region: hasScript ? ietf[2] : ietf[1],
          quality: bits[1] ? parseFloat(bits[1].split('=')[1]) : 1.0,
        };
      })
      .filter(r => r)
      .sort((a, b) => b.quality - a.quality)
      .map(lang => lang.code);
    return head(uniq(languages));
  }

  /**
   * Resolve the request timezone from the `Accept-Timezone` header.
   *
   * Defaults to `UTC` so downstream services always receive a stable timezone
   * value even when the client omits the header.
   */
  protected resolverTimezone(req: ExpressRequest): string {
    return !req.headers['accept-timezone'] ? 'UTC' : (req.headers['accept-timezone'] as string);
  }

  /**
   * Parse the `User-Agent` header into the shared `UserAgent` model.
   */
  protected resolverUserAgent(req: ExpressRequest): UserAgent {
    if (!req.headers['user-agent']) return null;
    return useragent.parse(req.headers['user-agent']);
  }

  /**
   * Resolve client IP and GeoIP metadata for request-level observability.
   */
  protected resolverGeoIP(req: ExpressRequest): GeoIp {
    const ipAddress = requestIp.getClientIp(req);
    return { ipAddress, ...lookup(ipAddress) };
  }

  /**
   * Resolve the normalized query contract consumed by controllers and services.
   *
   * The default implementation casts query-string primitives, resolves
   * page/offset pagination defaults, and guarantees `condition`, `sort`,
   * `limit`, `offset`, and `language` fields exist in the query object.
   *
   * This is the main extension point for application-level query defaults such
   * as default sort, default language, or app-specific condition enrichment.
   */
  protected resolverQuery(req: ExpressRequest): IBaseRequest<any> {
    const castedQuery = castRequestValue(req.query || {}, this.resolverRequestCastOptions(req).query, {
      mode: 'query',
      path: [],
    });
    const rawPage = castedQuery?.page;
    const rawLimit = castedQuery?.limit;
    const rawOffset = castedQuery?.offset;

    const page = toInt(rawPage);
    const limit = toInt(rawLimit, 20);
    const offset = toInt(rawOffset);

    let resolvedPage: number | undefined;
    let resolvedOffset: number | undefined;

    if (page && page > 0) {
      resolvedPage = page;
      resolvedOffset = (page - 1) * limit;
    } else if (offset !== undefined && offset >= 0) {
      resolvedPage = undefined;
      resolvedOffset = offset;
    } else {
      resolvedPage = 1;
      resolvedOffset = 0;
    }

    const query: IBaseRequest<any> = {
      ...castedQuery,
      condition: castedQuery?.condition || {},
      sort: castedQuery?.sort || {},
      limit,
      offset: resolvedOffset,
      language: castedQuery?.language || req.locale || '*',
    };

    if (resolvedPage !== undefined) query.page = resolvedPage;
    else delete query.page;

    return query;
  }

  /**
   * Resolve the normalized body for `GET/POST /resource/search` requests.
   *
   * JSON bodies already keep numbers, booleans and nulls in their real shape,
   * so the default search body policy only fixes date strings.
   *
   * Override this when an application has a different search-body contract.
   * Create/update request bodies are intentionally not handled here.
   */
  protected resolverSearchBody(req: ExpressRequest): any {
    return castRequestValue(req.body, this.resolverRequestCastOptions(req).searchBody, { mode: 'body', path: [] });
  }

  /**
   * Override this single policy method for advanced request casting needs.
   *
   * Normal projects should prefer overriding resolver methods such as
   * `resolverQuery`, `resolverSearchBody`, `resolverLanguage` or
   * `resolverTimezone` instead of changing low-level casting behavior.
   */
  protected resolverRequestCastOptions(_req: ExpressRequest): ExpressRequestCastOptions {
    return DEFAULT_REQUEST_CAST_OPTIONS;
  }

  /**
   * Transform successful handler output into the default JokTec response shape.
   *
   * Applications usually override this to apply i18n messages, transformer
   * groups, field masking, or custom response envelopes.
   */
  protected transformResponse(data: T): ExpressResponseType<T> {
    if (typeof data === 'object') {
      return {
        timestamp: new Date(),
        success: true,
        errorCode: 0,
        message: 'Success',
        data: data ? instanceToPlain<T>(data) : undefined,
      } as IResponseDto<T>;
    }
    return data;
  }

  /**
   * Forward errors into Nest's exception pipeline.
   *
   * Keep this method small unless an app must map external error shapes before
   * they reach global exception filters.
   */
  protected handleError(err: any): Observable<any> {
    return throwError(() => err);
  }
}
