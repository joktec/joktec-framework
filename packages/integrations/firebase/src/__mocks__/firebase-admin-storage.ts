import { jest } from '@jest/globals';

export const getStorage = jest.fn(app => ({ app, kind: 'storage' }));
