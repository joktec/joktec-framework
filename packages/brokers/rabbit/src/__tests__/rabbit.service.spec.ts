import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createMock } from '@golevelup/ts-jest';
import { ConfigService, LogService } from '@joktec/core';
import { connect } from 'amqplib';
import { mockChannels, mockConnections } from '../__mocks__/amqplib';
import { RabbitConfig } from '../rabbit.config';
import { RabbitMetricService, RabbitMetricStatus } from '../rabbit.metric';
import { RabbitService } from '../rabbit.service';

class TestRabbitService extends RabbitService {
  boot(config: RabbitConfig) {
    return this.clientInit(config);
  }

  exposeStop(client: any, conId?: string) {
    return this.stop(client, conId);
  }
}

const attachServices = (service: RabbitService, metric: jest.Mocked<RabbitMetricService>): RabbitService => {
  Object.assign(service as unknown as Record<string, unknown>, {
    PinoLogger: createMock<LogService>(),
    ConfigService: createMock<ConfigService>({ get: jest.fn().mockReturnValue({ retries: 0 }) }),
    RabbitMetricService: metric,
    logService: createMock<LogService>(),
    configService: createMock<ConfigService>(),
  });
  return service;
};

describe('RabbitService', () => {
  let service: TestRabbitService;
  let metric: jest.Mocked<RabbitMetricService>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConnections.length = 0;
    mockChannels.length = 0;

    metric = { send: jest.fn(), receive: jest.fn() } as unknown as jest.Mocked<RabbitMetricService>;
    service = attachServices(new TestRabbitService({}, metric), metric) as TestRabbitService;
    await service.boot(new RabbitConfig({ conId: 'default', hostname: 'localhost' } as RabbitConfig));
  });

  it('should initialize connection and send messages through a confirm channel', async () => {
    await service.sendToQueue('mail.jobs', ['one', 'two']);

    expect(connect).toHaveBeenCalledWith(expect.objectContaining({ hostname: 'localhost' }));
    expect(mockConnections[0].createConfirmChannel).toHaveBeenCalledTimes(1);
    expect(mockChannels[0].sendToQueue).toHaveBeenCalledWith('mail.jobs', Buffer.from('one'), {});
    expect(mockChannels[0].sendToQueue).toHaveBeenCalledWith('mail.jobs', Buffer.from('two'), {});
    expect(mockChannels[0].waitForConfirms).toHaveBeenCalled();
  });

  it('should publish routed messages to an exchange', async () => {
    await service.publish('events', [
      { key: 'article.created', content: 'one' },
      { key: 'article.updated', content: 'two' },
    ]);

    expect(mockChannels[0].publish).toHaveBeenCalledWith('events', 'article.created', Buffer.from('one'), {});
    expect(mockChannels[0].publish).toHaveBeenCalledWith('events', 'article.updated', Buffer.from('two'), {});
  });

  it('should consume messages, auto commit successes, and reject failures', async () => {
    const callback = jest
      .fn<() => Promise<void>>()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('fail'));
    const message = { content: Buffer.from('payload') } as any;

    await service.consume('mail.jobs', callback, { autoCommit: true, prefetchMessages: 2, requeue: false });
    const onMessage = mockChannels[0].consume.mock.calls[0][1] as (msg: any) => Promise<void>;
    await onMessage(message);
    await onMessage(message);

    expect(mockChannels[0].prefetch).toHaveBeenCalledWith(2);
    expect(mockChannels[0].ack).toHaveBeenCalledWith(message);
    expect(mockChannels[0].reject).toHaveBeenCalledWith(message, false);
    expect(metric.receive).toHaveBeenCalledWith('consume', RabbitMetricStatus.SUCCESS, 'mail.jobs', 'default');
    expect(metric.receive).toHaveBeenCalledWith('consume', RabbitMetricStatus.ERROR, 'mail.jobs', 'default');
  });

  it('should assert, bind queues, and close channels on stop', async () => {
    await service.binding('mail.jobs', { exchangeKey: 'events', routingKey: 'mail.#' });
    await service.exposeStop(service.getClient(), 'default');

    expect(mockChannels[0].assertExchange).toHaveBeenCalledWith('events', 'topic', {
      channelKey: 'default',
      durable: true,
    });
    expect(mockChannels[0].assertQueue).toHaveBeenCalledWith('mail.jobs', { channelKey: 'default', durable: true });
    expect(mockChannels[0].bindQueue).toHaveBeenCalledWith('mail.jobs', 'events', 'mail.#');
    expect(mockChannels[0].close).toHaveBeenCalled();
    expect(mockConnections[0].close).toHaveBeenCalled();
  });
});
