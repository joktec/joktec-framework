import 'reflect-metadata';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from '@jest/globals';
import { NotifierApn, NotifierApnToken, NotifierFcm, NotifierFcmCredential, NotifierGcm } from '../configs';
import { NotifierConfig } from '../notifier.config';

describe('NotifierConfig', () => {
  const credentialFiles: string[] = [];

  afterEach(() => {
    credentialFiles.forEach(file => fs.rmSync(file, { force: true }));
    credentialFiles.length = 0;
  });

  it('should hydrate nested provider configs', () => {
    const config = new NotifierConfig({
      conId: 'default',
      fcm: {
        appName: 'joktec',
        credential: {
          projectId: 'project-id',
          clientEmail: 'firebase@example.com',
          privateKey: 'private-key',
        },
      },
      gcm: { id: 'gcm-id', phonegap: true },
      apn: { token: { key: 'apn-key', keyId: 'key-id', teamId: 'team-id' }, production: true },
    } as NotifierConfig);

    expect(config.fcm).toBeInstanceOf(NotifierFcm);
    expect(config.fcm.credential).toBeInstanceOf(NotifierFcmCredential);
    expect(config.gcm).toBeInstanceOf(NotifierGcm);
    expect(config.apn).toBeInstanceOf(NotifierApn);
    expect(config.apn.token).toBeInstanceOf(NotifierApnToken);
  });

  it('should convert object credentials into node-pushnotifications fcm credential config', () => {
    const fcm = new NotifierFcm({
      appName: 'joktec',
      credential: {
        projectId: 'project-id',
        clientEmail: 'firebase@example.com',
        privateKey: 'private-key',
      },
    } as NotifierFcm);

    expect(fcm.getCredential()).toEqual({
      appName: 'joktec',
      credential: {
        projectId: 'project-id',
        clientEmail: 'firebase@example.com',
        privateKey: 'private-key',
      },
    });
  });

  it('should read service account credentials from a file path', () => {
    const credentialPath = path.join(os.tmpdir(), `joktec-fcm-${Date.now()}.json`);
    credentialFiles.push(credentialPath);
    fs.writeFileSync(
      credentialPath,
      JSON.stringify({ project_id: 'project-id', client_email: 'firebase@example.com' }),
    );
    const fcm = new NotifierFcm({ appName: 'joktec', credential: credentialPath } as NotifierFcm);

    expect(fcm.getCredential()).toEqual({
      appName: 'joktec',
      serviceAccountKey: {
        project_id: 'project-id',
        client_email: 'firebase@example.com',
      },
    });
  });
});
