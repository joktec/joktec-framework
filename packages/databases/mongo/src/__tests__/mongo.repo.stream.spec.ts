import { describe, expect, it, jest } from '@jest/globals';
import { DEFAULT_CON_ID } from '@joktec/core';
import { MongoSchema } from '../models';
import { MongoRepo } from '../mongo.repo';
import { MongoService } from '../mongo.service';

class StreamSchema extends MongoSchema {
  name!: string;
}

class StreamRepo extends MongoRepo<StreamSchema> {
  constructor(mongoService: MongoService) {
    super(mongoService, StreamSchema);
  }
}

describe('MongoRepo stream', () => {
  it('should assert stream coverage before opening model watch', async () => {
    const stream = { close: jest.fn() };
    const model = { watch: jest.fn<any>().mockReturnValue(stream) };
    const mongoService = {
      assertCoverage: jest.fn<any>().mockResolvedValue({ canUseStream: true }),
      getModel: jest.fn<any>().mockReturnValue(model),
    } as unknown as MongoService;
    const repo = new StreamRepo(mongoService);
    Object.assign(repo as any, { PinoLogger: { setContext: jest.fn() } });
    const pipeline = [{ $match: { operationType: 'insert' } }];

    await expect(repo.watch(pipeline)).resolves.toBe(stream);

    expect(mongoService.assertCoverage).toHaveBeenCalledWith('stream', DEFAULT_CON_ID);
    expect(model.watch).toHaveBeenCalledWith(pipeline, {});
  });
});
