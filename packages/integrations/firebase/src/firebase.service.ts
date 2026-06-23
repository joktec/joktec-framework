import { AbstractClientService, DEFAULT_CON_ID, Injectable } from '@joktec/core';
import { cert, getApp, initializeApp } from 'firebase-admin/app';
import { getAppCheck } from 'firebase-admin/app-check';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase, getDatabaseWithUrl } from 'firebase-admin/database';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getStorage } from 'firebase-admin/storage';
import { omit } from 'lodash';
import { FirebaseClient, FirebaseInstance } from './firebase.client';
import { FirebaseConfig } from './firebase.config';
import {
  FirebaseApp,
  FirebaseAuth,
  FirebaseDatabase,
  FirebaseFirestore,
  FirebaseMessaging,
  FirebaseStorage,
} from './models';

@Injectable()
export class FirebaseService extends AbstractClientService<FirebaseConfig, FirebaseInstance> implements FirebaseClient {
  constructor() {
    super('firebase', FirebaseConfig);
  }

  async init(config: FirebaseConfig): Promise<FirebaseInstance> {
    const opts = omit(config, ['credential']);
    return initializeApp(
      {
        ...opts,
        credential: cert(config.credential),
      },
      config.conId,
    );
  }

  async start(client: FirebaseInstance, conId: string = DEFAULT_CON_ID): Promise<void> {
    const appCheck = getAppCheck(client);
    this.logService.info('`%s` AppCheck successful: %s', conId, appCheck.app.name);
    this.logService.debug(appCheck.app.options, '`%s` AppCheck options', conId);
  }

  async stop(client: FirebaseInstance, conId: string = DEFAULT_CON_ID): Promise<void> {
    // Do nothing
  }

  public getApp(conId: string = DEFAULT_CON_ID): FirebaseApp {
    return getApp(conId);
  }

  public auth(conId: string = DEFAULT_CON_ID): FirebaseAuth {
    return getAuth(this.getClient(conId));
  }

  public database(url?: string, conId: string = DEFAULT_CON_ID): FirebaseDatabase {
    const app = this.getClient(conId);
    return url ? getDatabaseWithUrl(url, app) : getDatabase(app);
  }

  public messaging(conId: string = DEFAULT_CON_ID): FirebaseMessaging {
    return getMessaging(this.getClient(conId));
  }

  public storage(conId: string = DEFAULT_CON_ID): FirebaseStorage {
    return getStorage(this.getClient(conId));
  }

  public firestore(conId: string = DEFAULT_CON_ID): FirebaseFirestore {
    return getFirestore(this.getClient(conId));
  }
}
