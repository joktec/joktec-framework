import { jest } from '@jest/globals';

export const getMessaging = jest.fn(app => ({ app, kind: 'messaging' }));
