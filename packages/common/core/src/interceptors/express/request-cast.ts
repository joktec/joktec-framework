import { DateStringCastMode, isDateStringCastable, isJsonObjectString, isNumberString } from '@joktec/utils';
import { ExpressRequest } from '../../models';

export type ExpressCastDateMode = DateStringCastMode;

/**
 * Runtime casting switches for request payload normalization.
 *
 * Query strings normally need full primitive casting because every value enters
 * Express as a string. JSON bodies already preserve most primitives, so body
 * casting can stay narrower and only fix date strings where needed.
 */
export interface ExpressCastOptions {
  boolean?: boolean;
  date?: ExpressCastDateMode;
  json?: boolean;
  nullish?: boolean;
  number?: boolean;
}

export interface ExpressRequestCastOptions {
  /** Query-string casting policy. Query values arrive from Express as strings. */
  query?: ExpressCastOptions;
  /** Search body casting policy. JSON bodies usually only need date fixes. */
  searchBody?: ExpressCastOptions;
  /** HTTP methods that may carry a framework search body. */
  searchBodyMethods?: string[];
  /** Route suffix used to identify search endpoints. */
  searchBodyPathSuffix?: string;
}

/** Internal recursion context used while walking request values. */
type ExpressCastContext = {
  key?: string;
  mode: 'body' | 'query';
  path: string[];
};

/** Default request casting policy used by ExpressInterceptor. */
export const DEFAULT_REQUEST_CAST_OPTIONS: ExpressRequestCastOptions = {
  query: { boolean: true, date: 'operator-and-date-key', json: true, nullish: true, number: true },
  searchBody: { boolean: false, date: 'operator-and-date-key', json: false, nullish: false, number: false },
  searchBodyMethods: ['GET', 'POST'],
  searchBodyPathSuffix: '/search',
};

/** Check whether the current request should pass through search-body normalization. */
export function shouldResolveSearchBody(req: ExpressRequest, options: ExpressRequestCastOptions): boolean {
  const path = (req.originalUrl || req.url || '').split('?')[0];
  const methods = options.searchBodyMethods || [];
  return methods.includes(req.method) && path.endsWith(options.searchBodyPathSuffix || '/search');
}

/**
 * Recursively cast request values according to the selected policy.
 *
 * This is an interceptor-internal helper, not an application extension point.
 * Application code should prefer overriding `resolverQuery`,
 * `resolverSearchBody`, or `resolverRequestCastOptions`.
 */
export function castRequestValue(value: any, options: ExpressCastOptions = {}, context: ExpressCastContext): any {
  if (Array.isArray(value)) return value.map(item => castRequestValue(item, options, context));
  if (value && typeof value === 'object') {
    return Object.keys(value).reduce((acc, key) => {
      const casted = castRequestValue(value[key], options, { ...context, key, path: [...context.path, key] });
      if (casted !== undefined) acc[key] = casted;
      return acc;
    }, {});
  }

  if (typeof value !== 'string') return value;

  const normalized = value.trim();
  if (options.json && isJsonObjectString(normalized)) return castRequestValue(JSON.parse(normalized), options, context);
  if (options.nullish && normalized === 'null') return null;
  if (options.nullish && normalized === 'undefined') return undefined;
  if (options.boolean && ['true', 'false'].includes(normalized)) return normalized === 'true';
  if (options.date && isDateStringCastable(normalized, options.date, context)) return new Date(normalized);
  if (options.number && isNumberString(normalized)) return Number(normalized);
  return value;
}
