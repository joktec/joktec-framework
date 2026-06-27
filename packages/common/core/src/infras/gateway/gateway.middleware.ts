import { getTimeString, joinUrl, toArray } from '@joktec/utils';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { NextFunction, Request, Response } from 'express';
import { Counter, Histogram } from 'prom-client';
import { createBullFinalConfig, ConfigService, LogService } from '../../modules';
import { GATEWAY_DURATION_METRIC, GATEWAY_TOTAL_METRIC, GatewayStatus } from './gateway.metric';

@Injectable()
export class GatewayMetricMiddleware implements NestMiddleware {
  private bullBoardPaths?: string[];

  constructor(
    private logService: LogService,
    private configService: ConfigService,
    @InjectMetric(GATEWAY_DURATION_METRIC) private gatewayDurationMetric: Histogram<string>,
    @InjectMetric(GATEWAY_TOTAL_METRIC) private gatewayTotalMetric: Counter<string>,
  ) {
    this.logService.setContext(GatewayMetricMiddleware.name);
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, baseUrl, path, originalUrl } = req;
    if (this.shouldSkipMetric(originalUrl)) {
      next();
      return;
    }

    const metricPath = `${method} ${baseUrl + path}`;
    const duration = this.gatewayDurationMetric.startTimer({ path: metricPath });

    res.on('finish', () => {
      const elapsedTime = duration() * 1000.0;
      const timeString = getTimeString(elapsedTime);
      const statusCode = res.statusCode;

      req['responseTime'] = elapsedTime;
      if (statusCode >= 200 && statusCode < 400) {
        this.gatewayTotalMetric.inc({ path: metricPath, status: GatewayStatus.SUCCESS, statusCode });
        this.logService.info('http: [%s] %s (%s) %s', method, originalUrl, timeString, statusCode);
      } else {
        let className: string = 'Unknown';
        try {
          const stack = new Error().stack?.split(/\r\n|\r|\n/);
          className = stack[1].split(/\b(\s)/)[2];
        } catch {
          this.logService.debug('Error to get className');
        }

        this.gatewayTotalMetric.inc({ path: metricPath, status: GatewayStatus.FAILED, statusCode, className });
        if (statusCode >= 400 && statusCode < 500) {
          this.logService.warn('http: [%s] %s (%s) %s', method, originalUrl, timeString, statusCode);
        } else {
          this.logService.error('http: [%s] %s (%s) %s', method, originalUrl, timeString, statusCode);
        }
      }
    });

    next();
  }

  private shouldSkipMetric(originalUrl: string): boolean {
    const requestPath = originalUrl.split('?')[0];
    const skipPaths = ['/health', '/metrics', '/swagger', '/swagger-json', '/favicon.ico', ...this.getBullBoardPaths()];
    return skipPaths.some(path => requestPath === path || requestPath.startsWith(`${path}/`));
  }

  private getBullBoardPaths(): string[] {
    if (this.bullBoardPaths) return this.bullBoardPaths;

    try {
      const contextPath = this.configService.get<string>('gateway.contextPath', '');
      const board = createBullFinalConfig(this.configService).board;
      if (!board?.enable || !board.path) {
        this.bullBoardPaths = [];
        return this.bullBoardPaths;
      }

      this.bullBoardPaths = toArray(joinUrl('', { paths: [contextPath, board.path] }) || board.path);
      return this.bullBoardPaths;
    } catch {
      this.bullBoardPaths = [];
      return this.bullBoardPaths;
    }
  }
}
