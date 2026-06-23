import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from '@jest/globals';
import { InternalServerException } from '@joktec/core';
import { FirebaseConfig, FirebaseCredential } from '../firebase.config';

describe('FirebaseConfig', () => {
  it('should hydrate object credentials into FirebaseCredential', () => {
    const config = new FirebaseConfig({
      conId: 'default',
      credential: {
        projectId: 'joktec-test',
        clientEmail: 'firebase@example.com',
        privateKey: 'private-key',
      },
      databaseURL: 'https://example.firebaseio.com',
    } as FirebaseConfig);

    expect(config.credential).toBeInstanceOf(FirebaseCredential);
    expect(config.databaseURL).toBe('https://example.firebaseio.com');
  });

  it('should accept existing credential file paths', () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'joktec-firebase-')), 'service-account.json');
    fs.writeFileSync(file, '{}');

    const config = new FirebaseConfig({ conId: 'default', credential: file } as FirebaseConfig);

    expect(config.credential).toBe(file);
    fs.rmSync(path.dirname(file), { force: true, recursive: true });
  });

  it('should reject missing credential file paths', () => {
    expect(
      () => new FirebaseConfig({ conId: 'default', credential: '/missing/firebase.json' } as FirebaseConfig),
    ).toThrow(InternalServerException);
  });
});
