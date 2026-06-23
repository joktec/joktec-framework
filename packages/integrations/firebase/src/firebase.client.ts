import { Client } from '@joktec/core';
import { App } from 'firebase-admin/app';
import { FirebaseConfig } from './firebase.config';
import { FirebaseAuth, FirebaseDatabase, FirebaseFirestore, FirebaseMessaging, FirebaseStorage } from './models';

export type FirebaseInstance = App;

export interface FirebaseClient extends Client<FirebaseConfig, FirebaseInstance> {
  auth(conId?: string): FirebaseAuth;

  database(url?: string, conId?: string): FirebaseDatabase;

  messaging(conId?: string): FirebaseMessaging;

  storage(conId?: string): FirebaseStorage;

  firestore(conId?: string): FirebaseFirestore;
}
