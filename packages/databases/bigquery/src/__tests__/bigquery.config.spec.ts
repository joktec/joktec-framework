import { describe, expect, it } from '@jest/globals';
import { BigQueryConfig } from '../bigquery.config';

describe('BigQueryConfig', () => {
  it('should hydrate defaults and build fully qualified table names', () => {
    const config = new BigQueryConfig({
      conId: 'default',
      keyFilename: '/tmp/key.json',
      projectId: 'joktec',
      datasetId: 'analytics',
      location: 'asia-southeast1',
    } as BigQueryConfig);

    expect(config.autoRetry).toBe(true);
    expect(config.maxRetries).toBe(5);
    expect(config.getTableName('events')).toBe('joktec.analytics.events');
  });
});
