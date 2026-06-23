import 'reflect-metadata';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createMock } from '@golevelup/ts-jest';
import { ConfigService, LogService } from '@joktec/core';
import PushNotifications from 'node-pushnotifications';
import { NotifierConfig } from '../notifier.config';
import { NotifierService } from '../notifier.service';
import { pushNotificationInstances } from '../__mocks__/node-pushnotifications';

class TestNotifierService extends NotifierService {
  exposeInit(config: NotifierConfig) {
    return this.init(config);
  }
}

const attachDecoratorServices = <T extends NotifierService>(service: T): T => {
  Object.assign(service as unknown as Record<string, unknown>, {
    PinoLogger: createMock<LogService>(),
    ConfigService: createMock<ConfigService>({
      parse: jest.fn((_configClass: unknown, _configKey: string) => ({})),
    }),
  });
  return service;
};

describe('NotifierService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pushNotificationInstances.length = 0;
  });

  it('should initialize node-pushnotifications with normalized fcm credentials', async () => {
    const service = attachDecoratorServices(new TestNotifierService());
    const config = new NotifierConfig({
      conId: 'default',
      isAlwaysUseFCM: true,
      fcm: {
        appName: 'joktec',
        credential: {
          projectId: 'project-id',
          clientEmail: 'firebase@example.com',
          privateKey: 'private-key',
        },
      },
    } as NotifierConfig);

    const client = await service.exposeInit(config);

    expect(PushNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        isAlwaysUseFCM: true,
        fcm: {
          appName: 'joktec',
          credential: {
            projectId: 'project-id',
            clientEmail: 'firebase@example.com',
            privateKey: 'private-key',
          },
        },
      }),
    );
    expect(client).toBe(pushNotificationInstances[0]);
  });

  it('should delegate send requests to the configured notifier client', async () => {
    const service = new NotifierService();
    const client = {
      send: jest.fn(async (_regIds: string[], _data: object) => [
        { method: 'fcm', success: 1, failure: 0, message: [] },
      ]),
    };
    jest.spyOn(service, 'getClient').mockReturnValue(client as never);

    await expect(
      service.send({
        regIds: ['device-1'],
        data: { title: 'Welcome', body: 'Hello', custom: { userId: 1 } },
      }),
    ).resolves.toEqual([{ method: 'fcm', success: 1, failure: 0, message: [] }]);

    expect(client.send).toHaveBeenCalledWith(['device-1'], {
      title: 'Welcome',
      body: 'Hello',
      custom: { userId: 1 },
    });
  });
});
