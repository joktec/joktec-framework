import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createMock } from '@golevelup/ts-jest';
import { ConfigService, LogService } from '@joktec/core';
import { mockSnsInstances } from '../__mocks__/@aws-sdk-client-sns';
import { mockSqsInstances } from '../__mocks__/@aws-sdk-client-sqs';
import { SQS_AUTO_BINDING } from '../models';
import { SqsConfig } from '../sqs.config';
import { SqsMetricService } from '../sqs.metric';
import { SqsService } from '../sqs.service';

class TestSqsService extends SqsService {
  boot(config: SqsConfig) {
    return this.clientInit(config);
  }

  exposeStop(client: any, conId?: string) {
    return this.stop(client, conId);
  }
}

const attachServices = (service: SqsService, metric: jest.Mocked<SqsMetricService>): SqsService => {
  Object.assign(service as unknown as Record<string, unknown>, {
    PinoLogger: createMock<LogService>(),
    ConfigService: createMock<ConfigService>({ get: jest.fn().mockReturnValue({ retries: 0 }) }),
    SqsMetricService: metric,
    logService: createMock<LogService>(),
    configService: createMock<ConfigService>(),
  });
  return service;
};

describe('SqsService', () => {
  let service: TestSqsService;
  let metric: jest.Mocked<SqsMetricService>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSqsInstances.length = 0;
    mockSnsInstances.length = 0;

    metric = { send: jest.fn(), receive: jest.fn() } as unknown as jest.Mocked<SqsMetricService>;
    service = attachServices(new TestSqsService({ [SQS_AUTO_BINDING]: [] } as any, metric), metric) as TestSqsService;
    await service.boot(
      new SqsConfig({
        conId: 'default',
        region: 'ap-southeast-1',
        endpoint: 'http://localhost:9324',
        accessKeyId: 'root',
        secretAccessKey: 'root',
      } as unknown as SqsConfig),
    );
  });

  it('should initialize SQS/SNS clients and resolve queue/topic identifiers', async () => {
    await expect(service.assert('jobs')).resolves.toBe('http://localhost:9324/queue/jobs');
    await expect(service.assertTopic('events')).resolves.toBe('arn:aws:sns:local:000000000000:events');

    expect(mockSqsInstances[0].config).toEqual(
      expect.objectContaining({ region: 'ap-southeast-1', endpoint: 'http://localhost:9324' }),
    );
    expect(mockSnsInstances[0].config).toEqual(
      expect.objectContaining({ region: 'ap-southeast-1', endpoint: 'http://localhost:9324' }),
    );
  });

  it('should send queue messages and publish topic messages', async () => {
    await service.sendToQueue('jobs', ['one', 'two']);
    await service.publish('events', ['created']);

    expect(mockSqsInstances[0].sendMessage).toHaveBeenCalledWith({
      QueueUrl: 'http://localhost:9324/queue/jobs',
      MessageBody: 'one',
    });
    expect(mockSqsInstances[0].sendMessage).toHaveBeenCalledWith({
      QueueUrl: 'http://localhost:9324/queue/jobs',
      MessageBody: 'two',
    });
    expect(mockSnsInstances[0].publish).toHaveBeenCalledWith({
      TopicArn: 'arn:aws:sns:local:000000000000:events',
      Message: 'created',
    });
  });

  it('should bind queue to topic and apply queue policy', async () => {
    await expect(service.bindQueueToTopic('events', 'jobs')).resolves.toBe(
      'arn:aws:sns:local:000000000000:subscription/jobs',
    );

    expect(mockSnsInstances[0].subscribe).toHaveBeenCalledWith({
      TopicArn: 'arn:aws:sns:local:000000000000:events',
      Protocol: 'sqs',
      Endpoint: 'arn:aws:sqs:local:000000000000:jobs',
      ReturnSubscriptionArn: true,
    });
    expect(mockSqsInstances[0].setQueueAttributes).toHaveBeenCalledWith({
      QueueUrl: 'http://localhost:9324/queue/jobs',
      Attributes: { Policy: expect.stringContaining('arn:aws:sns:local:000000000000:events') },
    });
  });

  it('should return null when queue assertion fails and destroy clients on stop', async () => {
    mockSqsInstances[0].getQueueUrl.mockRejectedValueOnce(new Error('missing queue'));

    await expect(service.assert('missing')).resolves.toBeNull();
    await service.exposeStop(service.getClient(), 'default');

    expect(mockSqsInstances[0].destroy).toHaveBeenCalled();
    expect(mockSnsInstances[0].destroy).toHaveBeenCalled();
  });
});
