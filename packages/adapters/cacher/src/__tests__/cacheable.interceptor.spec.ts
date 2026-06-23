import { describe, expect, it, jest } from '@jest/globals';
import { CallHandler, ExecutionContext, Reflector } from '@joktec/core';
import { lastValueFrom, of } from 'rxjs';
import { CacheService } from '../cache.service';
import { CacheableInterceptor } from '../interceptors';

const createContext = (): ExecutionContext =>
  ({
    getHandler: jest.fn().mockReturnValue(function handler() {
      return undefined;
    }),
  }) as unknown as ExecutionContext;

describe('CacheableInterceptor', () => {
  it('should return cached value without invoking next handler', async () => {
    const reflector = { get: jest.fn().mockReturnValue({ cacheKey: 'profile:1', namespace: 'users' }) };
    const cacheService = {
      get: jest.fn(async (_key: string, _opts?: unknown, _conId?: string) => ({ id: 1 })),
      set: jest.fn(async (_key: string, _value: unknown, _opts?: unknown, _conId?: string) => undefined),
    };
    const interceptor = new CacheableInterceptor(
      reflector as unknown as Reflector,
      cacheService as unknown as CacheService,
    );
    const next = { handle: jest.fn().mockReturnValue(of({ id: 2 })) } as jest.Mocked<CallHandler>;

    const result = await interceptor.intercept(createContext(), next);

    await expect(lastValueFrom(result)).resolves.toEqual({ id: 1 });
    expect(next.handle).not.toHaveBeenCalled();
    expect(cacheService.set).not.toHaveBeenCalled();
  });

  it('should cache next handler value on cache miss', async () => {
    const reflector = {
      get: jest.fn().mockReturnValue({ cacheKey: 'profile:1', namespace: 'users', expiry: 30, conId: 'redis' }),
    };
    const cacheService = {
      get: jest.fn(async (_key: string, _opts?: unknown, _conId?: string) => null),
      set: jest.fn(async (_key: string, _value: unknown, _opts?: unknown, _conId?: string) => undefined),
    };
    const interceptor = new CacheableInterceptor(
      reflector as unknown as Reflector,
      cacheService as unknown as CacheService,
    );
    const next = { handle: jest.fn().mockReturnValue(of({ id: 2 })) } as jest.Mocked<CallHandler>;

    const result = await interceptor.intercept(createContext(), next);

    await expect(lastValueFrom(result)).resolves.toEqual({ id: 2 });
    expect(cacheService.set).toHaveBeenCalledWith('profile:1', { id: 2 }, { namespace: 'users', expiry: 30 }, 'redis');
  });
});
