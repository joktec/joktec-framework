import { describe, expect, it, jest } from '@jest/globals';
import { HttpMethod } from '@joktec/utils';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { HttpConfig } from '../http.config';
import { HttpService } from '../http.service';

const createService = (config: HttpConfig): HttpService => {
  const service = new HttpService();
  jest.spyOn(service, 'getConfig').mockReturnValue(config);
  return service;
};

describe('HttpService', () => {
  it('should merge client/request config and apply authorization helpers', () => {
    const service = createService(
      new HttpConfig({
        conId: 'default',
        baseURL: 'https://api.example.com/',
        headers: { 'x-client': 'joktec' },
        params: { locale: 'en' },
      } as unknown as HttpConfig),
    );

    const config = service.buildConfig({
      url: '/articles',
      method: HttpMethod.GET,
      params: { page: 1 },
      authorization: {
        bearerToken: 'Bearer test-token',
        apiKey: { key: 'x-api-key', value: 'secret', addTo: 'header' },
      },
    });

    expect(config).toMatchObject({
      baseURL: 'https://api.example.com',
      url: '/articles',
      method: HttpMethod.GET,
      params: { locale: 'en', page: 1 },
      headers: {
        accept: 'application/json',
        'x-client': 'joktec',
        Authorization: 'Bearer test-token',
        'x-api-key': 'secret',
      },
    });
  });

  it('should add api keys to query params and basic auth when requested', () => {
    const service = createService(
      new HttpConfig({
        conId: 'default',
        baseURL: 'https://api.example.com',
      } as unknown as HttpConfig),
    );

    const config = service.buildConfig({
      url: '/profile',
      authorization: {
        basicAuth: { username: 'root', password: 'root' },
        apiKey: { key: 'api_key', value: 'query-secret', addTo: 'query' },
      },
    });

    expect(config.auth).toEqual({ username: 'root', password: 'root' });
    expect(config.params).toMatchObject({ api_key: 'query-secret' });
  });

  it('should create axios proxy agents and remove raw proxy config', () => {
    const service = createService(
      new HttpConfig({
        conId: 'default',
        baseURL: 'https://api.example.com',
      } as unknown as HttpConfig),
    );

    const config = service.buildConfig({
      url: '/articles',
      proxy: {
        protocol: 'http',
        host: '127.0.0.1',
        port: 8080,
        auth: { username: 'proxy-user', password: 'proxy-pass' },
      },
    });

    expect(config.proxy).toBeUndefined();
    expect(config.httpAgent).toBeDefined();
    expect(config.httpsAgent).toBeDefined();
    expect(config.httpAgent).toBeInstanceOf(HttpProxyAgent);
    expect(config.httpsAgent).toBeInstanceOf(HttpsProxyAgent);
    const httpAgent = config.httpAgent as unknown as Record<string, unknown>;
    expect(httpAgent.url).toMatchObject({
      protocol: 'http:',
      hostname: '127.0.0.1',
      port: '8080',
      username: 'proxy-user',
      password: 'proxy-pass',
    });
    expect(httpAgent.options).toMatchObject({
      keepAlive: true,
    });
  });

  it('should delegate request to the selected axios client', async () => {
    const service = createService(
      new HttpConfig({
        conId: 'default',
        baseURL: 'https://api.example.com',
      } as unknown as HttpConfig),
    );
    const axiosClient = {
      request: jest.fn(async (_config: unknown) => ({ status: 200, data: { success: true } })),
    };
    jest.spyOn(service, 'getClient').mockReturnValue(axiosClient as never);
    Object.assign(service as unknown as Record<string, unknown>, {
      PinoLogger: { setContext: jest.fn(), debug: jest.fn(), error: jest.fn() },
      HttpMetricService: {
        duration: jest.fn().mockReturnValue(jest.fn().mockReturnValue(3)),
        trackStatus: jest.fn(),
      },
    });

    await expect(service.request({ url: '/health', method: HttpMethod.GET })).resolves.toEqual({
      status: 200,
      data: { success: true },
    });

    expect(axiosClient.request).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'https://api.example.com',
        url: '/health',
        method: HttpMethod.GET,
      }),
    );
  });
});
