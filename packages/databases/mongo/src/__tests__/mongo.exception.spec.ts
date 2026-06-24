import { describe, expect, it, jest } from '@jest/globals';
import {
  BadRequestException,
  RequestTimeoutException,
  ServiceUnavailableException,
  ValidationException,
} from '@joktec/core';
import { Error as MongooseError } from 'mongoose';
import { MongoCatch, MongoException } from '../mongo.exception';

class MongoCatchHarness {
  constructor() {
    Object.assign(this as unknown as Record<string, unknown>, {
      PinoLogger: { setContext: jest.fn() },
      LogService: { error: jest.fn() },
      ConfigService: {},
    });
  }

  @MongoCatch
  async throwError(err: unknown) {
    throw err;
  }
}

describe('MongoCatch', () => {
  const createHarness = () => new MongoCatchHarness();

  it('should convert duplicate key errors into validation exceptions', async () => {
    await expect(
      createHarness().throwError({ code: 11000, keyValue: { email: 'user@example.com' } }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('should convert cast errors into validation exceptions', async () => {
    await expect(
      createHarness().throwError(new MongooseError.CastError('ObjectId', 'bad-id', '_id')),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('should classify document not found errors as bad request exceptions', async () => {
    await expect(createHarness().throwError(new MongooseError.DocumentNotFoundError(null))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('should classify server selection errors as service unavailable exceptions', async () => {
    await expect(
      createHarness().throwError({ name: 'MongoServerSelectionError', message: 'unavailable' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('should classify timeout errors as request timeout exceptions', async () => {
    await expect(createHarness().throwError({ name: 'MongoTimeoutError', message: 'timeout' })).rejects.toBeInstanceOf(
      RequestTimeoutException,
    );
  });

  it('should classify transient transaction labels as mongo exceptions', async () => {
    await expect(
      createHarness().throwError({
        message: 'write conflict',
        hasErrorLabel: (label: string) => label === 'TransientTransactionError',
      }),
    ).rejects.toBeInstanceOf(MongoException);
  });
});
