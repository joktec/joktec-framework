import { describe, expect, it } from '@jest/globals';
import { SqsAssumeRoleConfig, SqsConfig } from '../sqs.config';

describe('SqsConfig', () => {
  it('should hydrate AWS SQS defaults and assume role config', () => {
    const config = new SqsConfig({
      conId: 'local',
      region: 'ap-southeast-1',
      endpoint: 'http://localhost:9324',
      accessKeyId: 'root',
      secretAccessKey: 'root',
      sslEnabled: false,
      timeout: 1000,
      assumeRole: { roleArn: 'arn:aws:iam::000000000000:role/test' },
    } as unknown as SqsConfig);

    expect(config.clientName).toBe('SQS');
    expect(config.sslEnabled).toBe(false);
    expect(config.timeout).toBe(1000);
    expect(config.assumeRole).toBeInstanceOf(SqsAssumeRoleConfig);
  });
});
