import type { Redis as RedisClient } from 'ioredis';
import { consumerPrefix, preflightDependencies, redisDependency } from './helpers';

const Redis = jest.requireActual('ioredis').default || jest.requireActual('ioredis').Redis || jest.requireActual('ioredis');

describe('consumer broker scenario', () => {
  let publisher: RedisClient;
  let subscriber: RedisClient;
  let consumer: RedisClient;

  beforeAll(async () => {
    await preflightDependencies([redisDependency]);
    publisher = new Redis({ host: 'localhost', port: 6379, password: 'root', db: 0, lazyConnect: true });
    subscriber = new Redis({ host: 'localhost', port: 6379, password: 'root', db: 0, lazyConnect: true });
    consumer = new Redis({ host: 'localhost', port: 6379, password: 'root', db: 0, lazyConnect: true });
    await Promise.all([publisher.connect(), subscriber.connect(), consumer.connect()]);
  });

  afterAll(async () => {
    await Promise.all([publisher?.quit(), subscriber?.quit(), consumer?.quit()]);
  });

  it('should publish and receive a Redis pub/sub message', async () => {
    const channel = `${consumerPrefix}:channel`;
    const message = JSON.stringify({ runId: consumerPrefix, action: 'pubsub' });

    const received = new Promise<string>(resolve => {
      subscriber.once('message', (_channel, payload) => resolve(payload));
    });

    await subscriber.subscribe(channel);
    await publisher.publish(channel, message);

    await expect(received).resolves.toBe(message);
  });

  it('should push and consume a Redis queue message', async () => {
    const queue = `${consumerPrefix}:queue`;
    const message = JSON.stringify({ runId: consumerPrefix, action: 'queue' });

    await publisher.rpush(queue, message);
    const result = await consumer.brpop(queue, 5);

    expect(result).toEqual([queue, message]);
  });
});
