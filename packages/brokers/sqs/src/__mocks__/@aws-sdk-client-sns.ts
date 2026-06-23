import { jest } from '@jest/globals';

export const mockSnsInstances: SNS[] = [];

export class SNS {
  config: unknown;
  createTopic = jest.fn(async ({ Name }: { Name: string }) => ({ TopicArn: `arn:aws:sns:local:000000000000:${Name}` }));
  publish = jest.fn(async (_input: unknown) => ({ MessageId: 'sns-message-1' }));
  subscribe = jest.fn(async (_input: unknown) => ({
    SubscriptionArn: 'arn:aws:sns:local:000000000000:subscription/jobs',
  }));
  listTopics = jest.fn(async () => ({ Topics: [] }));
  destroy = jest.fn();

  constructor(config: unknown) {
    this.config = config;
    mockSnsInstances.push(this);
  }
}
