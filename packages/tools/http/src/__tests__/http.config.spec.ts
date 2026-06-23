import { describe, expect, it, jest } from '@jest/globals';
import { AxiosError } from 'axios';
import { HttpMethod } from '@joktec/utils';
import { HttpConfig, HttpRetryConfig } from '../http.config';

describe('HttpConfig', () => {
  it('should normalize headers, curlirize, and retry config defaults', () => {
    const config = new HttpConfig({
      conId: 'default',
      curlirize: 'true' as unknown as boolean,
      headers: { 'x-client': 'joktec' },
      retryConfig: {
        statusCodesToRetry: [
          [500, 600],
          [400, 500],
          [500, 600],
        ],
      },
    } as unknown as HttpConfig);

    expect(config.headers).toEqual({ accept: 'application/json', 'x-client': 'joktec' });
    expect(config.curlirize).toBe(true);
    expect(config.retryConfig).toBeInstanceOf(HttpRetryConfig);
    expect(config.retryConfig.statusCodesToRetry).toEqual([
      [400, 500],
      [500, 600],
    ]);
  });

  it('should build axios-retry behavior from method and status ranges', () => {
    const log = { error: jest.fn() };
    const config = new HttpConfig({
      conId: 'default',
      retryConfig: {
        retryDelay: 250,
        httpMethodsToRetry: [HttpMethod.POST],
        statusCodesToRetry: [[500, 600]],
      },
    } as unknown as HttpConfig);
    const retryConfig = config.getRetryConfig(log as never);
    const error = {
      status: 503,
      config: { method: HttpMethod.POST, url: '/articles' },
    } as AxiosError;

    expect(retryConfig.retryDelay(2, error)).toBe(500);
    expect(retryConfig.retryCondition(error)).toBe(true);

    retryConfig.onRetry(1, error, error.config);
    retryConfig.onMaxRetryTimesExceeded(error, 3);

    expect(log.error).toHaveBeenCalledWith('%s %s error, retry count: %s', HttpMethod.POST, '/articles', 1);
    expect(log.error).toHaveBeenCalledWith(
      '%s %s error, reach max retry times exceeded. Last count: %s',
      HttpMethod.POST,
      '/articles',
      3,
    );
  });
});
