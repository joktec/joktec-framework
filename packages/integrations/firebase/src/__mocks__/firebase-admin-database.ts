import { jest } from '@jest/globals';

export const getDatabase = jest.fn(app => ({ app, kind: 'database' }));
export const getDatabaseWithUrl = jest.fn((url, app) => ({ app, kind: 'database', url }));
