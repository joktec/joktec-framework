import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createMock } from '@golevelup/ts-jest';
import { ConfigService, LogService } from '@joktec/core';
import { getAppCheck } from 'firebase-admin/app-check';
import { cert, getApp, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase, getDatabaseWithUrl } from 'firebase-admin/database';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getStorage } from 'firebase-admin/storage';
import { mockFirebaseApp } from '../__mocks__/firebase-admin-app';
import { FirebaseConfig } from '../firebase.config';
import { FirebaseService } from '../firebase.service';

class TestFirebaseService extends FirebaseService {
  exposeInit(config: FirebaseConfig) {
    return this.init(config);
  }

  exposeStart(client: any, conId?: string) {
    return this.start(client, conId);
  }
}

const attachServices = (service: FirebaseService): FirebaseService => {
  Object.assign(service as unknown as Record<string, unknown>, {
    PinoLogger: createMock<LogService>(),
    ConfigService: createMock<ConfigService>(),
    logService: createMock<LogService>(),
  });
  return service;
};

describe('FirebaseService', () => {
  let service: TestFirebaseService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = attachServices(new TestFirebaseService()) as TestFirebaseService;
  });

  it('should initialize firebase admin app with certificate credentials', async () => {
    const config = new FirebaseConfig({
      conId: 'primary',
      credential: { projectId: 'joktec-test', clientEmail: 'firebase@example.com', privateKey: 'private-key' },
      databaseURL: 'https://example.firebaseio.com',
    } as FirebaseConfig);

    const app = await service.exposeInit(config);

    expect(cert).toHaveBeenCalledWith(config.credential);
    expect(initializeApp).toHaveBeenCalledWith(
      expect.objectContaining({ credential: { credential: config.credential }, databaseURL: config.databaseURL }),
      'primary',
    );
    expect(app.name).toBe('primary');
  });

  it('should log app check details on start', async () => {
    await service.exposeStart(mockFirebaseApp as any, 'default');

    expect(getAppCheck).toHaveBeenCalledWith(mockFirebaseApp);
    expect((service as any).logService.info).toHaveBeenCalled();
    expect((service as any).logService.debug).toHaveBeenCalledWith(
      mockFirebaseApp.options,
      expect.any(String),
      'default',
    );
  });

  it('should resolve firebase feature clients from registered app clients', () => {
    jest.spyOn(service, 'getClient').mockReturnValue(mockFirebaseApp as any);

    expect(service.getApp('custom')).toEqual(expect.objectContaining({ name: 'custom' }));
    expect(service.auth()).toEqual({ app: mockFirebaseApp, kind: 'auth' });
    expect(service.database()).toEqual({ app: mockFirebaseApp, kind: 'database' });
    expect(service.database('https://example.firebaseio.com')).toEqual({
      app: mockFirebaseApp,
      kind: 'database',
      url: 'https://example.firebaseio.com',
    });
    expect(service.messaging()).toEqual({ app: mockFirebaseApp, kind: 'messaging' });
    expect(service.storage()).toEqual({ app: mockFirebaseApp, kind: 'storage' });
    expect(service.firestore()).toEqual({ app: mockFirebaseApp, kind: 'firestore' });
    expect(getApp).toHaveBeenCalledWith('custom');
    expect(getAuth).toHaveBeenCalledWith(mockFirebaseApp);
    expect(getDatabase).toHaveBeenCalledWith(mockFirebaseApp);
    expect(getDatabaseWithUrl).toHaveBeenCalledWith('https://example.firebaseio.com', mockFirebaseApp);
    expect(getMessaging).toHaveBeenCalledWith(mockFirebaseApp);
    expect(getStorage).toHaveBeenCalledWith(mockFirebaseApp);
    expect(getFirestore).toHaveBeenCalledWith(mockFirebaseApp);
  });
});
