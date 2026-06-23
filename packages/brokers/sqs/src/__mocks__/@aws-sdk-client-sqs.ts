import { jest } from '@jest/globals';

export const mockSqsInstances: SQS[] = [];

export class SQS {
  config: unknown;
  getQueueUrl = jest.fn(async ({ QueueName }: { QueueName: string }) => ({
    QueueUrl: `http://localhost:9324/queue/${QueueName}`,
  }));
  sendMessage = jest.fn(async (_input: unknown) => ({ MessageId: 'message-1' }));
  receiveMessage = jest.fn(async (_input: unknown) => ({ Messages: [] }));
  deleteMessage = jest.fn(async (_input: unknown) => ({}));
  getQueueAttributes = jest.fn(async (_input: unknown) => ({
    Attributes: { QueueArn: 'arn:aws:sqs:local:000000000000:jobs' },
  }));
  setQueueAttributes = jest.fn(async (_input: unknown) => ({}));
  listQueues = jest.fn(async () => ({ QueueUrls: [] }));
  destroy = jest.fn();

  constructor(config: unknown) {
    this.config = config;
    mockSqsInstances.push(this);
  }
}

export interface Message {
  Body?: string;
  ReceiptHandle?: string;
}

export type SQSClientConfig = Record<string, unknown>;
