import { describe, expect, it } from '@jest/globals';
import { RabbitConfig } from '../rabbit.config';

describe('RabbitConfig', () => {
  it('should hydrate connection settings and preserve defaults', () => {
    const config = new RabbitConfig({
      conId: 'main',
      hostname: 'rabbit.local',
      port: 5673,
      username: 'root',
      password: 'root',
    } as RabbitConfig);

    expect(config.hostname).toBe('rabbit.local');
    expect(config.protocol).toBe('amqp');
    expect(config.port).toBe(5673);
    expect(config.vhost).toBe('/');
  });
});
