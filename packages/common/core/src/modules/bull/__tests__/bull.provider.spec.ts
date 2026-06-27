import { describe, expect, it, jest } from '@jest/globals';
import { ConfigService } from '../../config';
import { createBullFinalConfig } from '../bull.provider';

function mockConfigService(bull: object): ConfigService {
  return {
    get: jest.fn().mockImplementation((path: string) => (path === 'bull' ? bull : undefined)),
    parseOrThrow: jest.fn(),
  } as unknown as ConfigService;
}

describe('createBullFinalConfig', () => {
  it('uses module board options when external config omits board', () => {
    const configService = mockConfigService({ host: 'localhost', port: 6379, password: 'root', db: 1 });

    const config = createBullFinalConfig(configService, {
      board: {
        enable: true,
        path: 'bulls',
        username: 'admin',
        password: 'admin',
        queues: ['module_queue'],
      },
    });

    expect(config.connection).toMatchObject({ host: 'localhost', port: 6379, password: 'root', db: 1 });
    expect(config.board).toMatchObject({ enable: true, path: '/bulls', queues: ['module_queue'] });
    expect(config.queues).toEqual(['module_queue']);
  });

  it('lets external config override module board options', () => {
    const configService = mockConfigService({
      host: 'localhost',
      port: 6379,
      board: { enable: true, path: 'admin-bulls', queues: ['config_queue'] },
    });

    const config = createBullFinalConfig(configService, {
      board: { enable: true, path: 'module-bulls', queues: ['module_queue'] },
    });

    expect(config.board).toMatchObject({ enable: true, path: '/admin-bulls', queues: ['config_queue'] });
    expect(config.queues).toEqual(['config_queue']);
  });

  it('keeps queues available when bull board route is disabled', () => {
    const configService = mockConfigService({ host: 'localhost', port: 6379 });

    const config = createBullFinalConfig(configService, {
      queues: ['queue_ui_only'],
      board: { enable: false },
    });

    expect(config.board).toMatchObject({ enable: false, queues: ['queue_ui_only'] });
    expect(config.queues).toEqual(['queue_ui_only']);
  });
});
