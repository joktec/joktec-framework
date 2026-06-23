import 'reflect-metadata';
import { describe, expect, it, jest } from '@jest/globals';
import { MailerAuth, MailerConfig, MailerEngine, MailerOAuth2, MailerPreview, MailerTemplate } from '../mailer.config';

describe('MailerConfig', () => {
  it('should hydrate password auth and template preview options', () => {
    const config = new MailerConfig({
      conId: 'smtp',
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      sender: 'noreply@example.com',
      auth: { user: 'user@example.com', pass: 'secret' },
      template: {
        dir: './templates',
        engine: MailerEngine.HBS,
        preview: { dir: '/tmp/mail-preview', open: { wait: false } },
      },
    } as MailerConfig);

    expect(config.auth).toBeInstanceOf(MailerAuth);
    expect(config.template).toBeInstanceOf(MailerTemplate);
    expect(config.template.preview).toBeInstanceOf(MailerPreview);
    expect(config.template.preview).toMatchObject({ dir: '/tmp/mail-preview', open: { wait: false } });
  });

  it('should hydrate oauth auth when pass is omitted', () => {
    const config = new MailerConfig({
      conId: 'smtp',
      host: 'smtp.example.com',
      auth: { user: 'user@example.com', clientId: 'client-id', refreshToken: 'refresh-token' },
    } as MailerConfig);

    expect(config.auth).toBeInstanceOf(MailerOAuth2);
    expect(config.auth).toMatchObject({ clientId: 'client-id', refreshToken: 'refresh-token' });
  });

  it('should bind nodemailer logger methods to LogService', () => {
    const config = new MailerConfig({ conId: 'smtp', host: 'smtp.example.com' } as MailerConfig);
    const logger = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
    };
    const boundLogger = config.bindingLogger(logger as never);

    boundLogger.info({ event: 'connected' } as never);
    boundLogger.error({ event: 'failed' } as never);

    expect(logger.info).toHaveBeenCalledWith({ event: 'connected' }, '`%s` Mailer client connecting', 'smtp');
    expect(logger.error).toHaveBeenCalledWith({ event: 'failed' }, '`%s` Mailer client connecting', 'smtp');
  });
});
