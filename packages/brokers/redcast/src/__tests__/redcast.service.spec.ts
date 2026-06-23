import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createMock } from '@golevelup/ts-jest';
import { ConfigService, LogService } from '@joktec/core';
import { mockRedisInstances } from '../__mocks__/ioredis';
import { RedcastConfig } from '../redcast.config';
import { RedcastMetricService, RedcastMetricStatus } from '../redcast.metric';
import { RedcastService } from '../redcast.service';

class TestRedcastService extends RedcastService {
  boot(config: RedcastConfig) {
    return this.clientInit(config);
  }

  exposeStop(client: any, conId?: string) {
    return this.stop(client, conId);
  }
}

const attachServices = (service: RedcastService, metric: jest.Mocked<RedcastMetricService>): RedcastService => {
  Object.assign(service as unknown as Record<string, unknown>, {
    PinoLogger: createMock<LogService>(),
    ConfigService: createMock<ConfigService>({ get: jest.fn().mockReturnValue({ retries: 0 }) }),
    RedcastMetricService: metric,
    logService: createMock<LogService>(),
    configService: createMock<ConfigService>(),
  });
  return service;
};

describe('RedcastService', () => {
  let service: TestRedcastService;
  let metric: jest.Mocked<RedcastMetricService>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRedisInstances.length = 0;

    metric = { send: jest.fn(), receive: jest.fn() } as unknown as jest.Mocked<RedcastMetricService>;
    service = attachServices(new TestRedcastService(metric), metric) as TestRedcastService;
    await service.boot(new RedcastConfig({ conId: 'default', host: 'localhost', port: 6379 } as RedcastConfig));
  });

  it('should initialize main and role-specific redis clients', () => {
    expect(mockRedisInstances).toHaveLength(4);
    expect(mockRedisInstances[0].options).toEqual(
      expect.objectContaining({ host: 'localhost', port: 6379, db: undefined, readOnly: false }),
    );
    expect((service as any).logService.info).toHaveBeenCalledWith(
      '`%s` redcast ping response: %s (Redis version: %s)',
      'default',
      'PONG',
      '7.2.0',
    );
  });

  it('should publish messages and push queue messages through publisher connection', async () => {
    await service.publish('events', ['one', 'two']);
    await service.sendToQueue('jobs', ['a', 'b']);

    const publisher = mockRedisInstances[1];
    expect(publisher.publish).toHaveBeenCalledWith('events', 'one');
    expect(publisher.publish).toHaveBeenCalledWith('events', 'two');
    expect(publisher.rpush).toHaveBeenCalledWith('jobs', 'a', 'b');
  });

  it('should subscribe and record handler success and failure metrics', async () => {
    const callback = jest
      .fn<(channel: string, message: string) => Promise<void>>()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('fail'));

    await service.subscribe('events', callback);
    const subscriber = mockRedisInstances[2];
    const handler = subscriber.handlers.message[0];
    await handler('events', 'payload');
    await handler('events', 'payload');

    expect(subscriber.subscribe).toHaveBeenCalledWith('events');
    expect(callback).toHaveBeenCalledWith('events', 'payload');
    expect(metric.receive).toHaveBeenCalledWith('subscribe', RedcastMetricStatus.SUCCESS, 'events', 'default');
    expect(metric.receive).toHaveBeenCalledWith('subscribe', RedcastMetricStatus.ERROR, 'events', 'default');
  });

  it('should write stream messages after redis version check and close all connections', async () => {
    await service.sendToStream('events.stream', ['one', 'two']);
    await service.exposeStop(service.getClient(), 'default');

    const publisher = mockRedisInstances[1];
    expect(mockRedisInstances[0].info).toHaveBeenCalledWith('server');
    expect(publisher.xadd).toHaveBeenCalledWith('events.stream', '*', 'message', 'one');
    expect(publisher.xadd).toHaveBeenCalledWith('events.stream', '*', 'message', 'two');
    expect(mockRedisInstances.every(instance => instance.quit.mock.calls.length === 1)).toBe(true);
  });
});
