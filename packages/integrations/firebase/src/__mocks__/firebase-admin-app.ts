import { jest } from '@jest/globals';

export const mockFirebaseApp = {
  name: 'default',
  options: { projectId: 'joktec-test' },
};

export const cert = jest.fn((credential: unknown) => ({ credential }));
export const initializeApp = jest.fn((options: unknown, name?: string) => ({ ...mockFirebaseApp, name, options }));
export const getApp = jest.fn((name?: string) => ({ ...mockFirebaseApp, name }));
