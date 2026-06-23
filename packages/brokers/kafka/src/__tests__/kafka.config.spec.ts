import { describe, expect, it, jest } from '@jest/globals';
import { createMock } from '@golevelup/ts-jest';
import { LogService } from '@joktec/core';
import { logLevel } from 'kafkajs';
import { KafkaConfig, KafkaRetryConfig } from '../kafka.config';

describe('KafkaConfig', () => {
  it('should default clientId from conId and hydrate retry config', () => {
    const config = new KafkaConfig({
      conId: 'events',
      brokers: ['localhost:9092'],
      retry: { retries: 3 },
    } as KafkaConfig);

    expect(config.clientId).toBe('events');
    expect(config.retry).toBeInstanceOf(KafkaRetryConfig);
    expect(config.retry.retries).toBe(3);
  });

  it('should bind KafkaJS logs to LogService', () => {
    const logService = createMock<LogService>();
    const config = new KafkaConfig({ conId: 'events', brokers: ['localhost:9092'] } as KafkaConfig);

    config.log(logService);
    config.logCreator(logLevel.INFO)({
      label: 'INFO',
      namespace: 'Connection',
      level: logLevel.INFO,
      log: { timestamp: 'now', logger: 'kafkajs', message: 'connected', broker: 'localhost:9092' },
    });

    expect(logService.info).toHaveBeenCalledWith(
      { broker: 'localhost:9092' },
      '`%s` (%s) %s',
      'events',
      'Connection',
      'connected',
    );
  });
});
