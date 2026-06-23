import { jest } from '@jest/globals';

export const getFirestore = jest.fn(app => ({ app, kind: 'firestore' }));
