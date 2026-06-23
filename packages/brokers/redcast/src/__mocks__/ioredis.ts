import { jest } from '@jest/globals';

type Handler = (...args: any[]) => void | Promise<void>;

export const mockRedisInstances: Redis[] = [];

export class Command {
  constructor(
    public name: string,
    public args: string[] = [],
  ) {}
}

export class Redis {
  options: unknown;
  handlers: Record<string, Handler[]> = {};
  sendCommand = jest.fn(async () => 'OK');
  duplicate = jest.fn(() => new Redis(this.options));
  on = jest.fn((event: string, handler: Handler) => {
    this.handlers[event] = [...(this.handlers[event] || []), handler];
    return this;
  });
  ping = jest.fn(async () => 'PONG');
  info = jest.fn(async (_section?: string) => 'redis_version:7.2.0\r\n');
  quit = jest.fn(async () => 'OK');
  publish = jest.fn(async (_channel: string, _message: string) => 1);
  subscribe = jest.fn(async (_channel: string) => 1);
  psubscribe = jest.fn(async (_pattern: string) => 1);
  unsubscribe = jest.fn(async (_channel: string) => 1);
  punsubscribe = jest.fn(async (_pattern: string) => 1);
  rpush = jest.fn(async (_queue: string, ...messages: string[]) => messages.length);
  xadd = jest.fn(async (_stream: string, _id: string, _field: string, _message: string) => '1-0');
  xack = jest.fn(async (_stream: string, _group: string, _id: string) => 1);
  xdel = jest.fn(async (_stream: string, _id: string) => 1);
  xgroup = jest.fn(async (..._args: string[]) => 'OK');
  xreadgroup = jest.fn(async (..._args: string[]) => null);
  brpop = jest.fn(async (_queue: string, _timeout: number) => null);
  rpoplpush = jest.fn(async (_queue: string, _processingQueue: string) => null);
  del = jest.fn(async (_key: string) => 1);
  expire = jest.fn(async (_key: string, _ttl: number) => 1);

  constructor(options?: unknown) {
    this.options = options;
    mockRedisInstances.push(this);
  }
}

export default Redis;
