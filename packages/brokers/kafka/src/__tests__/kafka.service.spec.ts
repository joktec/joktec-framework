import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createMock } from '@golevelup/ts-jest';
import { ConfigService, LogService } from '@joktec/core';
import { Kafka } from 'kafkajs';
import { mockConsumerInstances, mockKafkaInstances, mockProducerInstances } from '../__mocks__/kafkajs';
import { KafkaConfig } from '../kafka.config';
import { KafkaMetricService, KafkaMetricStatus } from '../kafka.metric';
import { KafkaService } from '../kafka.service';

class TestKafkaService extends KafkaService {
  boot(config: KafkaConfig) {
    return this.clientInit(config);
  }

  exposeStop(client: any, conId?: string) {
    return this.stop(client, conId);
  }
}

const attachServices = (service: KafkaService, metric: jest.Mocked<KafkaMetricService>): KafkaService => {
  Object.assign(service as unknown as Record<string, unknown>, {
    PinoLogger: createMock<LogService>(),
    ConfigService: createMock<ConfigService>({ get: jest.fn().mockReturnValue({ retries: 0 }) }),
    KafkaMetricService: metric,
    logService: createMock<LogService>(),
    configService: createMock<ConfigService>(),
  });
  return service;
};

describe('KafkaService', () => {
  let service: TestKafkaService;
  let metric: jest.Mocked<KafkaMetricService>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockKafkaInstances.length = 0;
    mockProducerInstances.length = 0;
    mockConsumerInstances.length = 0;

    metric = { send: jest.fn(), receive: jest.fn() } as unknown as jest.Mocked<KafkaMetricService>;
    service = attachServices(new TestKafkaService(metric), metric) as TestKafkaService;
    await service.boot(new KafkaConfig({ conId: 'default', brokers: ['localhost:9092'] } as KafkaConfig));
  });

  it('should initialize KafkaJS client and create producers lazily', async () => {
    await service.send('article.created', ['one', Buffer.from('two'), { key: 'k', value: 'three' }]);

    expect(Kafka).toHaveBeenCalledWith(expect.objectContaining({ brokers: ['localhost:9092'], clientId: 'default' }));
    expect(mockKafkaInstances[0].producer).toHaveBeenCalledWith(
      expect.objectContaining({ createPartitioner: expect.any(Function) }),
    );
    expect(mockProducerInstances[0].connect).toHaveBeenCalledTimes(1);
    expect(mockProducerInstances[0].send).toHaveBeenCalledWith({
      topic: 'article.created',
      messages: [{ value: 'one' }, { value: Buffer.from('two') }, { key: 'k', value: 'three' }],
    });
  });

  it('should consume messages and track success/error metrics', async () => {
    const callback = jest
      .fn<() => Promise<void>>()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('fail'));

    await service.consume(['article.created'], 'article-group', callback, { fromBeginning: true });
    const runConfig = mockConsumerInstances[0].run.mock.calls[0][0] as any;

    expect(mockKafkaInstances[0].consumer).toHaveBeenCalledWith({ groupId: 'article-group' });
    expect(mockConsumerInstances[0].subscribe).toHaveBeenCalledWith({
      topics: ['article.created'],
      fromBeginning: true,
    });

    const payload = { topic: 'article.created', partition: 0, message: { value: Buffer.from('payload') } };
    await runConfig.eachMessage(payload);
    await runConfig.eachMessage(payload);

    expect(callback).toHaveBeenCalledTimes(2);
    expect(metric.receive).toHaveBeenCalledWith('consume', KafkaMetricStatus.SUCCESS, 'article.created-0', 'default');
    expect(metric.receive).toHaveBeenCalledWith('consume', KafkaMetricStatus.ERROR, 'article.created-0', 'default');
  });

  it('should send batches with producerKey and disconnect cached producers and consumers on stop', async () => {
    await service.sendBatch({ producerKey: 'bulk', topicMessages: [{ topic: 'article.bulk', messages: [] }] });
    await service.consume(['article.bulk'], 'bulk-group', jest.fn<() => Promise<void>>().mockResolvedValue(undefined));

    await service.exposeStop(service.getClient(), 'default');

    expect(mockProducerInstances[0].sendBatch).toHaveBeenCalledWith({
      producerKey: 'bulk',
      topicMessages: [{ topic: 'article.bulk', messages: [] }],
    });
    expect(mockProducerInstances[0].disconnect).toHaveBeenCalled();
    expect(mockConsumerInstances[0].disconnect).toHaveBeenCalled();
  });
});
