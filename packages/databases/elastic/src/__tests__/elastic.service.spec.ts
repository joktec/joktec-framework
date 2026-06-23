import { describe, expect, it, jest } from '@jest/globals';
import { createMock } from '@golevelup/ts-jest';
import { LogService } from '@joktec/core';
import { HttpService } from '@joktec/http';
import { ElasticConfig } from '../elastic.config';
import { ElasticService } from '../elastic.service';

const createService = () => {
  const httpService = createMock<HttpService>();
  const service = new ElasticService();
  jest
    .spyOn(service, 'getConfig')
    .mockReturnValue(new ElasticConfig({ conId: 'default', baseURL: 'http://localhost:9200' } as ElasticConfig));
  jest.spyOn(service, 'getClient').mockReturnValue(httpService);
  Object.assign(service as unknown as Record<string, unknown>, {
    logService: createMock<LogService>(),
    httpService,
  });
  return { service, httpService };
};

describe('ElasticService', () => {
  it('should build search requests and return response data', async () => {
    const { service, httpService } = createService();
    httpService.request.mockResolvedValue({ data: { hits: { hits: [] } } } as never);

    await expect(
      service.search({
        index: 'articles',
        search: { query: { match_all: {} } },
        curlirize: true,
      }),
    ).resolves.toEqual({ hits: { hits: [] } });

    expect(httpService.request).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'http://localhost:9200',
        url: 'articles/_search',
        method: 'GET',
        data: expect.objectContaining({ index: 'articles', search: { query: { match_all: {} } } }),
        params: { pretty: true },
        headers: { accept: 'application/json', 'Content-Type': 'application/json' },
        curlirize: true,
      }),
    );
  });

  it('should build index requests against the document endpoint', async () => {
    const { service, httpService } = createService();
    httpService.request.mockResolvedValue({ data: { result: 'created' } } as never);

    await expect(service.index({ index: 'articles', id: 'article-1', doc: { title: 'JokTec' } })).resolves.toEqual({
      result: 'created',
    });

    expect(httpService.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'articles/_doc/article-1',
        method: 'POST',
        data: { title: 'JokTec' },
      }),
    );
  });

  it('should build get and delete requests against the document endpoint', async () => {
    const { service, httpService } = createService();
    httpService.request.mockResolvedValueOnce({ data: { _id: 'article-1', found: true } } as never);
    httpService.request.mockResolvedValueOnce({ data: { result: 'deleted' } } as never);

    await expect(service.get({ index: 'articles', id: 'article-1' })).resolves.toEqual({
      _id: 'article-1',
      found: true,
    });
    await expect(service.delete({ index: 'articles', id: 'article-1' })).resolves.toEqual({ result: 'deleted' });

    expect(httpService.request).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ url: 'articles/_doc/article-1', method: 'GET' }),
    );
    expect(httpService.request).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ url: 'articles/_doc/article-1', method: 'DELETE' }),
    );
  });
});
