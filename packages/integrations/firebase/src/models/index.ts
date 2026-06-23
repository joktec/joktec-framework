import { App } from 'firebase-admin/app';
import { Auth } from 'firebase-admin/auth';
import { Database } from 'firebase-admin/database';
import { Firestore } from 'firebase-admin/firestore';
import { Messaging } from 'firebase-admin/messaging';
import { Storage } from 'firebase-admin/storage';

export type FirebaseApp = App;
export type FirebaseAuth = Auth;
export type FirebaseDatabase = Database;
export type FirebaseMessaging = Messaging;
export type FirebaseStorage = Storage;
export type FirebaseFirestore = Firestore;
