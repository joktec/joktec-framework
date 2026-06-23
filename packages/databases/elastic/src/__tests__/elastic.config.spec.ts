import { describe, expect, it } from '@jest/globals';
import { ElasticConfig } from '../elastic.config';

describe('ElasticConfig', () => {
  it('should build a default baseURL from normalized protocol, host, and port', () => {
    const config = new ElasticConfig({ conId: 'default' } as ElasticConfig);

    expect(config.protocol).toBe('http');
    expect(config.host).toBe('localhost');
    expect(config.port).toBe(9200);
    expect(config.baseURL).toBe('http://localhost:9200');
  });

  it('should preserve explicit baseURL over host components', () => {
    const config = new ElasticConfig({
      conId: 'default',
      protocol: 'https',
      host: 'elastic.local',
      port: 9243,
      baseURL: 'https://search.example.com',
    } as ElasticConfig);

    expect(config.baseURL).toBe('https://search.example.com');
  });
});
