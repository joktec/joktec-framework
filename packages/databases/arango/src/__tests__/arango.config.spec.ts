import { describe, expect, it } from '@jest/globals';
import { ArangoConfig, BasicCredentials, BearerCredentials } from '../arango.config';

describe('ArangoConfig', () => {
  it('should hydrate numeric and boolean options', () => {
    const config = new ArangoConfig({
      conId: 'default',
      url: 'http://localhost:8529',
      databaseName: 'joktec',
      arangoVersion: '31000' as any,
      maxRetries: '3' as any,
      precaptureStackTraces: 'true' as any,
    } as ArangoConfig);

    expect(config.arangoVersion).toBe(31000);
    expect(config.maxRetries).toBe(3);
    expect(config.precaptureStackTraces).toBe(true);
  });

  it('should expose basic and bearer credential contracts', () => {
    expect(new BasicCredentials({ username: 'root', password: 'root' })).toEqual({
      username: 'root',
      password: 'root',
    });
    expect(new BearerCredentials({ token: 'token' })).toEqual({ token: 'token' });
  });
});
