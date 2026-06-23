import { jest } from '@jest/globals';

jest.setTimeout(Number(process.env.CONSUMER_TEST_TIMEOUT_MS || 180000));
