import { describe, expect, it } from '@jest/globals';
import { CacheConfig, CacheType } from '../cache.config';

describe('CacheConfig', () => {
  it('should default to local cache config', () => {
    const config = new CacheConfig({ conId: 'default' } as CacheConfig);

    expect(config.type).toBe(CacheType.LOCAL);
    expect(config.cacheDir).toBe('./.cacher');
    expect(config.validate()).toEqual([]);
  });

  it('should require host and port for redis cache config', () => {
    const config = new CacheConfig({ conId: 'default', type: CacheType.REDIS } as CacheConfig);

    expect(config.validate()).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'host' }), expect.objectContaining({ path: 'port' })]),
    );
  });

  it('should accept redis cache config with optional auth and database', () => {
    const config = new CacheConfig({
      conId: 'default',
      type: CacheType.REDIS,
      host: 'localhost',
      port: 6379,
      password: 'root',
      database: 1,
    } as CacheConfig);

    expect(config.validate()).toEqual([]);
  });
});
