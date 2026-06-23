import 'reflect-metadata';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createMock } from '@golevelup/ts-jest';
import { ConfigService, LogService } from '@joktec/core';
import { MailerConfig, MailerEngine } from '../mailer.config';
import { MailerMetricService } from '../mailer.metric';
import { MailerService } from '../mailer.service';
import { mockTransport, createTransport } from '../__mocks__/nodemailer';

class TestMailerService extends MailerService {
  exposeInit(config: MailerConfig) {
    return this.init(config);
  }
}

const createTemplateDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'joktec-mailer-'));

const attachDecoratorServices = (service: MailerService): MailerService => {
  Object.assign(service as unknown as Record<string, unknown>, {
    PinoLogger: createMock<LogService>(),
    ConfigService: createMock<ConfigService>(),
    MailerMetricService: createMock<MailerMetricService>({
      track: jest.fn(),
    }),
    logService: createMock<LogService>(),
  });
  return service;
};

describe('MailerService', () => {
  let templateDir: string;

  beforeEach(() => {
    jest.clearAllMocks();
    templateDir = createTemplateDir();
  });

  afterEach(() => {
    fs.rmSync(templateDir, { force: true, recursive: true });
  });

  it('should initialize transport and register compile/preview hooks when templates are enabled', async () => {
    const service = attachDecoratorServices(new TestMailerService()) as TestMailerService;
    const config = new MailerConfig({
      conId: 'smtp',
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      template: {
        dir: templateDir,
        engine: MailerEngine.HBS,
        preview: true,
      },
    } as MailerConfig);

    await expect(service.exposeInit(config)).resolves.toBe(mockTransport);

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.example.com',
        port: 587,
        secure: false,
      }),
    );
    expect(mockTransport.use).toHaveBeenCalledWith('compile', expect.any(Function));
    expect(mockTransport.use).toHaveBeenCalledWith('stream', expect.any(Function));
  });

  it('should compile handlebars, ejs, and pug templates', async () => {
    const service = attachDecoratorServices(new MailerService());
    const config = new MailerConfig({
      conId: 'smtp',
      host: 'smtp.example.com',
      template: {
        dir: templateDir,
        engine: MailerEngine.HBS,
      },
    } as MailerConfig);
    jest.spyOn(service, 'getConfig').mockReturnValue(config);
    fs.writeFileSync(path.join(templateDir, 'welcome.hbs'), 'Hello {{name}}');
    fs.writeFileSync(path.join(templateDir, 'welcome.ejs'), 'Hello <%= name %>');
    fs.writeFileSync(path.join(templateDir, 'welcome.pug'), 'p Hello #{name}');

    await expect(service.compile({ name: 'welcome.hbs', context: { name: 'JokTec' } })).resolves.toBe('Hello JokTec');
    await expect(
      service.compile({ name: 'welcome.ejs', context: { name: 'JokTec' }, engine: MailerEngine.EJS }),
    ).resolves.toBe('Hello JokTec');
    await expect(
      service.compile({ name: 'welcome.pug', context: { name: 'JokTec' }, engine: MailerEngine.PUG }),
    ).resolves.toBe('<p>Hello JokTec</p>');
  });

  it('should reject missing template files', async () => {
    const service = attachDecoratorServices(new MailerService());
    jest.spyOn(service, 'getConfig').mockReturnValue(
      new MailerConfig({
        conId: 'smtp',
        host: 'smtp.example.com',
        template: { dir: templateDir, engine: MailerEngine.HBS },
      } as MailerConfig),
    );

    await expect(service.compile({ name: 'missing.hbs', context: {} })).rejects.toThrow('TEMPLATE_PATH_NOT_FOUND');
  });

  it('should send email with configured default sender', async () => {
    const service = attachDecoratorServices(new MailerService());
    const config = new MailerConfig({
      conId: 'smtp',
      host: 'smtp.example.com',
      sender: 'noreply@example.com',
    } as MailerConfig);
    const client = {
      sendMail: jest.fn(async (_message: unknown) => ({ messageId: 'mail-1', accepted: ['user@example.com'] })),
    };
    jest.spyOn(service, 'getConfig').mockReturnValue(config);
    jest.spyOn(service, 'getClient').mockReturnValue(client as never);

    await expect(service.send({ to: 'user@example.com', subject: 'Welcome', text: 'Hello' })).resolves.toEqual({
      messageId: 'mail-1',
      accepted: ['user@example.com'],
    });

    expect(client.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'noreply@example.com',
        to: 'user@example.com',
        subject: 'Welcome',
      }),
    );
  });
});
