import { jest } from '@jest/globals';

export const mockConnections: MockConnection[] = [];
export const mockChannels: MockChannel[] = [];

export class MockChannel {
  on = jest.fn((_event: string, _handler: (...args: any[]) => void) => this);
  close = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
  sendToQueue = jest.fn((_queue: string, _content: Buffer, _options?: unknown) => true);
  publish = jest.fn((_exchange: string, _routingKey: string, _content: Buffer, _options?: unknown) => true);
  waitForConfirms = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
  prefetch = jest.fn<(_count: number) => Promise<void>>().mockResolvedValue(undefined);
  consume = jest
    .fn<(_queue: string, _handler: (msg: unknown) => Promise<void>, _options?: unknown) => Promise<void>>()
    .mockResolvedValue(undefined);
  ack = jest.fn((_msg: unknown) => undefined);
  reject = jest.fn((_msg: unknown, _requeue?: boolean) => undefined);
  assertQueue = jest.fn(async (queue: string, _options?: unknown) => ({ queue, messageCount: 0, consumerCount: 0 }));
  assertExchange = jest.fn(async (exchange: string, type: string, _options?: unknown) => ({ exchange, type }));
  checkQueue = jest.fn(async (queue: string) => ({ queue, messageCount: 0, consumerCount: 0 }));
  purgeQueue = jest.fn(async (_queue: string) => ({ messageCount: 0 }));
  cancel = jest.fn(async (_consumerTag: string) => ({}));
  bindQueue = jest.fn(async (_queue: string, _exchange: string, _routingKey: string) => ({}));
}

export class MockConnection {
  on = jest.fn();
  close = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
  createConfirmChannel = jest.fn(async () => {
    const channel = new MockChannel();
    mockChannels.push(channel);
    return channel;
  });
}

export const connect = jest.fn(async () => {
  const connection = new MockConnection();
  mockConnections.push(connection);
  return connection;
});

export default { connect };
