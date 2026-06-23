import { describe, expect, it, jest } from '@jest/globals';
import { createMock } from '@golevelup/ts-jest';
import { LogService } from '@joktec/core';
import { ICacheStore } from '../cache.client';
import { CacheService } from '../cache.service';

const attachDecoratorServices = (service: CacheService): CacheService => {
  Object.assign(service as unknown as Record<string, unknown>, {
    PinoLogger: createMock<LogService>(),
    CacheMetricService: { track: jest.fn() },
  });
  return service;
};

const createService = (store: jest.Mocked<ICacheStore>): CacheService => {
  const service = attachDecoratorServices(new CacheService());
  jest.spyOn(service, 'getClient').mockReturnValue(store);
  return service;
};

describe('CacheService', () => {
  it('should connect and disconnect cache stores', async () => {
    const service = new CacheService();
    const store = createMock<ICacheStore>();

    await service.start(store);
    await service.stop(store);

    expect(store.connect).toHaveBeenCalledTimes(1);
    expect(store.disconnect).toHaveBeenCalledTimes(1);
  });

  it('should store values with namespace metadata and ttl', async () => {
    const store = createMock<ICacheStore>();
    const service = createService(store);

    await service.set('profile:1', { id: 1 }, { namespace: 'users', expiry: 30 }, 'redis');

    expect(store.setItem).toHaveBeenCalledWith(
      'users:profile:1',
      JSON.stringify({ conId: 'redis', namespace: 'users', value: { id: 1 } }),
      30,
    );
  });

  it('should return parsed cached values and null on cache miss', async () => {
    const store = createMock<ICacheStore>();
    store.getItem
      .mockResolvedValueOnce(JSON.stringify({ value: { id: 1, name: 'JokTec' } }))
      .mockResolvedValueOnce(null);
    const service = createService(store);

    await expect(service.get('profile:1', { namespace: 'users' }, 'redis')).resolves.toEqual({
      id: 1,
      name: 'JokTec',
    });
    await expect(service.get('missing', { namespace: 'users' }, 'redis')).resolves.toBeNull();

    expect(store.getItem).toHaveBeenNthCalledWith(1, 'users:profile:1');
    expect(store.getItem).toHaveBeenNthCalledWith(2, 'users:missing');
  });

  it('should delete namespaced keys through the selected store', async () => {
    const store = createMock<ICacheStore>();
    store.delItem.mockResolvedValue(['users:profile:1']);
    const service = createService(store);

    await expect(service.del('profile:1', { namespace: 'users' }, 'redis')).resolves.toEqual(['users:profile:1']);

    expect(store.delItem).toHaveBeenCalledWith('users:profile:1');
  });
});
