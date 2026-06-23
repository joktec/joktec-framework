import { jest } from '@jest/globals';
import { mockFirebaseApp } from './firebase-admin-app';

export const getAppCheck = jest.fn((app = mockFirebaseApp) => ({ app }));
