import { describe, expect, it } from '@jest/globals';
import { RedcastConfig } from '../redcast.config';

describe('RedcastConfig', () => {
  it('should hydrate redis connection settings', () => {
    const config = new RedcastConfig({
      conId: 'cache',
      host: 'localhost',
      port: 6379,
      password: 1234,
      database: 2,
      readonly: true,
    } as RedcastConfig);

    expect(config.host).toBe('localhost');
    expect(config.port).toBe(6379);
    expect(config.password).toBe(1234);
    expect(config.database).toBe(2);
    expect(config.readonly).toBe(true);
  });
});
