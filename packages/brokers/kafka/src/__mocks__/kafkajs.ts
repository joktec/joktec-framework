import { jest } from '@jest/globals';

export const logLevel = {
  NOTHING: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 4,
  DEBUG: 5,
};

export const Partitioners = {
  LegacyPartitioner: jest.fn(() => 'legacy-partitioner'),
};

export const mockKafkaInstances: MockKafka[] = [];
export const mockProducerInstances: MockProducer[] = [];
export const mockConsumerInstances: MockConsumer[] = [];

export class MockProducer {
  connect = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
  disconnect = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
  send = jest.fn<(_record: unknown) => Promise<void>>().mockResolvedValue(undefined);
  sendBatch = jest.fn<(_batch: unknown) => Promise<void>>().mockResolvedValue(undefined);
}

export class MockConsumer {
  connect = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
  disconnect = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
  subscribe = jest.fn<(_subscription: unknown) => Promise<void>>().mockResolvedValue(undefined);
  run = jest.fn<(_config: unknown) => Promise<void>>().mockResolvedValue(undefined);
}

export class MockKafka {
  config: unknown;
  producer = jest.fn((_config?: unknown) => {
    const producer = new MockProducer();
    mockProducerInstances.push(producer);
    return producer;
  });
  consumer = jest.fn((_config?: unknown) => {
    const consumer = new MockConsumer();
    mockConsumerInstances.push(consumer);
    return consumer;
  });

  constructor(config: unknown) {
    this.config = config;
    mockKafkaInstances.push(this);
  }
}

export const Kafka = jest.fn((config: unknown) => new MockKafka(config));
