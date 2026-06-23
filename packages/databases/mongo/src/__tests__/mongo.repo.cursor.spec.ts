import { CursorPagination } from '@joktec/core';
import { IMongoOptions, IMongoRequest, MongoSchema } from '../models';
import { MongoRepo } from '../mongo.repo';
import { MongoService } from '../mongo.service';

class TestMongoSchema extends MongoSchema {
  title!: string;
}

class TestMongoRepo extends MongoRepo<TestMongoSchema> {
  lastFindQuery?: IMongoRequest<TestMongoSchema>;
  lastCountQuery?: IMongoRequest<TestMongoSchema>;

  constructor() {
    super({} as MongoService, TestMongoSchema);
  }

  async find(query: IMongoRequest<TestMongoSchema>, _options: IMongoOptions<TestMongoSchema> = {}) {
    this.lastFindQuery = query;
    return [
      { _id: '65f000000000000000000001', title: 'first' },
      { _id: '65f000000000000000000002', title: 'second' },
      { _id: '65f000000000000000000003', title: 'third' },
    ] as TestMongoSchema[];
  }

  async count(query: IMongoRequest<TestMongoSchema>, _options: IMongoOptions<TestMongoSchema> = {}) {
    this.lastCountQuery = query;
    return 3;
  }
}

const createRepo = (): TestMongoRepo => {
  const repo = new TestMongoRepo();
  Object.assign(repo as unknown as Record<string, unknown>, {
    PinoLogger: { setContext: jest.fn() },
    ConfigService: {},
  });
  return repo;
};

describe('MongoRepo cursor pagination', () => {
  it('should convert cursor requests into find/count queries with stable cursor metadata', async () => {
    const repo = createRepo();

    const result = await repo.paginate({
      condition: { title: 'feed' },
      cursorKey: 'createdAt',
      limit: 2,
      sort: { createdAt: 'asc' },
    });

    expect(repo.lastFindQuery).toMatchObject({
      condition: { title: 'feed' },
      limit: 3,
      sort: { createdAt: 'asc', _id: 'desc' },
    });
    expect(repo.lastFindQuery).not.toHaveProperty('cursorKey');
    expect(repo.lastFindQuery).not.toHaveProperty('offset');
    expect(repo.lastCountQuery).toEqual({ condition: { title: 'feed' } });
    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(3);
    expect(result.hasNextPage).toBe(true);
    expect(result.nextCursor).toEqual(expect.any(String));

    const cursor = CursorPagination.resolve<TestMongoSchema>({ cursor: result.nextCursor, defaultKeys: ['_id'] });
    expect(cursor.keys).toEqual(['createdAt', '_id']);
    expect(cursor.values).toEqual([null, '65f000000000000000000002']);
  });

  it('should merge decoded cursor values with the existing condition', async () => {
    const repo = createRepo();
    const firstPage = await repo.paginate({ cursorKey: '_id', limit: 2 });

    await repo.paginate({
      condition: { title: 'feed' },
      cursor: firstPage.nextCursor,
      limit: 2,
    });

    expect(repo.lastFindQuery?.condition).toEqual({
      $and: [
        { title: 'feed' },
        {
          $or: [{ _id: { $lt: '65f000000000000000000002' } }],
        },
      ],
    });
  });
});
