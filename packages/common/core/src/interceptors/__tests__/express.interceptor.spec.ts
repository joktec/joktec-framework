import { ExpressRequest } from '../../models';
import { ExpressInterceptor } from '../express.interceptor';

class TestExpressInterceptor extends ExpressInterceptor {
  inject(req: Partial<ExpressRequest>) {
    this.injectRequest(req as ExpressRequest);
    return req.query;
  }

  resolveQuery(req: Partial<ExpressRequest>) {
    return this.resolverQuery(req as ExpressRequest);
  }

  resolveBody(req: Partial<ExpressRequest>) {
    const request = { headers: {}, query: {}, ...req } as ExpressRequest;
    this.injectRequest(request);
    return request.body;
  }
}

describe('ExpressInterceptor', () => {
  const interceptor = new TestExpressInterceptor();

  it('casts query string primitives and date operators without casting ObjectId-like strings', () => {
    const query = interceptor.resolveQuery({
      locale: 'en',
      query: {
        page: '2',
        limit: '10',
        condition: JSON.stringify({
          active: 'true',
          deletedAt: 'null',
          count: '42',
          code: '2026-01-01',
          authorId: '507f1f77bcf86cd799439011',
          createdAt: { $lte: '2026-06-26T00:00:00.000Z' },
        }),
      } as any,
    });

    expect(query.page).toEqual(2);
    expect(query.limit).toEqual(10);
    expect(query.offset).toEqual(10);
    expect(query.condition).toMatchObject({
      active: true,
      deletedAt: null,
      count: 42,
      code: '2026-01-01',
      authorId: '507f1f77bcf86cd799439011',
    });
    expect((query.condition as any).createdAt.$lte).toBeInstanceOf(Date);
  });

  it('replaces request query with the normalized query contract after injection', () => {
    const query = interceptor.inject({
      headers: {},
      locale: 'en',
      query: {
        page: '2',
        limit: '10',
        condition: {
          active: 'true',
          createdAt: { $lte: '2026-06-26T00:00:00.000Z' },
        },
      } as any,
    });

    expect(query.page).toEqual(2);
    expect(query.limit).toEqual(10);
    expect(query.offset).toEqual(10);
    expect((query.condition as any).active).toEqual(true);
    expect((query.condition as any).createdAt.$lte).toBeInstanceOf(Date);
  });

  it('freezes the normalized query over an Express getter that returns a fresh object', () => {
    const req: Partial<ExpressRequest> = {
      headers: {},
      locale: 'en',
    };

    Object.defineProperty(req, 'query', {
      configurable: true,
      get: () =>
        ({
          page: '2',
          limit: '10',
          condition: { active: 'true' },
        }) as any,
    });

    const query = interceptor.inject(req);

    expect(query).toBe(req.query);
    expect(query.page).toEqual(2);
    expect(query.limit).toEqual(10);
    expect(query.offset).toEqual(10);
    expect((query.condition as any).active).toEqual(true);
  });

  it('casts date strings in search request bodies without coercing clear JSON body primitives', () => {
    const body = interceptor.resolveBody({
      method: 'POST',
      originalUrl: '/crons/1/histories/search',
      body: {
        condition: {
          active: 'false',
          count: '42',
          createdAt: { $gte: '2026-06-25T00:00:00.000Z', $lte: '2026-06-26T00:00:00.000Z' },
        },
      },
    });

    expect(body.condition.active).toEqual('false');
    expect(body.condition.count).toEqual('42');
    expect(body.condition.createdAt.$gte).toBeInstanceOf(Date);
    expect(body.condition.createdAt.$lte).toBeInstanceOf(Date);
  });

  it('does not cast non-search request bodies', () => {
    const body = interceptor.resolveBody({
      method: 'POST',
      originalUrl: '/articles',
      body: {
        createdAt: '2026-06-26T00:00:00.000Z',
      },
    });

    expect(body.createdAt).toEqual('2026-06-26T00:00:00.000Z');
  });
});
