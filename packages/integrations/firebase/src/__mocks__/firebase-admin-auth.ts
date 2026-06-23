import { jest } from '@jest/globals';

export const getAuth = jest.fn(app => ({ app, kind: 'auth' }));
