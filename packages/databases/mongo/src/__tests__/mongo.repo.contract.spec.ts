import { describe, expect, it, jest } from '@jest/globals';
import { ICondition } from '@joktec/core';
import { IMongoOptions, IMongoRequest, IMongoUpdate, MongoSchema, ObjectId } from '../models';
import { MongoRepo } from '../mongo.repo';
import { MongoService } from '../mongo.service';

class ContractSchema extends MongoSchema {
  title!: string;
  authorId?: string;
  author?: { _id?: string; name?: string };
}

class ContractRepo extends MongoRepo<ContractSchema> {
  modelStub: any;
  findMock = jest.fn();
  qbMock = jest.fn();

  constructor(mongoService: MongoService, conId = 'analytics') {
    super(mongoService, ContractSchema, conId);
    Object.assign(this as unknown as Record<string, unknown>, {
      PinoLogger: { setContext: jest.fn() },
      ConfigService: {},
    });
  }

  exposeModel() {
    return this.model;
  }

  exposeTransform(docs: any | any[], options?: { normalize?: boolean }) {
    return this.transform(docs, options);
  }

  qb(query?: IMongoRequest<ContractSchema>, options: IMongoOptions<ContractSchema> = {}): any {
    return this.qbMock(query, options) as any;
  }

  async find(
    query: IMongoRequest<ContractSchema>,
    options: IMongoOptions<ContractSchema> = {},
  ): Promise<ContractSchema[]> {
    return this.findMock(query, options) as Promise<ContractSchema[]>;
  }
}

describe('MongoRepo contracts', () => {
  it('should resolve models using the repository connection id', () => {
    const model = { modelName: 'ContractSchema' };
    const mongoService = { getModel: jest.fn().mockReturnValue(model) } as unknown as MongoService;
    const repo = new ContractRepo(mongoService, 'analytics');

    expect(repo.exposeModel()).toBe(model);
    expect(mongoService.getModel).toHaveBeenCalledWith(ContractSchema, 'analytics');
  });

  it('should use countDocuments for near queries instead of estimatedDocumentCount', async () => {
    const countDocuments = (jest.fn() as any).mockResolvedValue(7);
    const estimatedDocumentCount = (jest.fn() as any).mockResolvedValue(99);
    const repo = new ContractRepo({ getModel: jest.fn() } as unknown as MongoService);
    repo.qbMock.mockReturnValue({ countDocuments, estimatedDocumentCount });

    await expect(repo.count({ near: [0, 0] } as unknown as IMongoRequest<ContractSchema>)).resolves.toBe(7);
    expect(countDocuments).toHaveBeenCalledTimes(1);
    expect(estimatedDocumentCount).not.toHaveBeenCalled();
  });

  it('should pass options to updateMany follow-up reads', async () => {
    const exec = (jest.fn() as any).mockResolvedValue({});
    const updateMany = jest.fn().mockReturnValue({ exec });
    const repo = new ContractRepo({ getModel: jest.fn() } as unknown as MongoService);
    repo.qbMock.mockReturnValue({ updateMany });
    (repo.findMock as any).mockResolvedValue([]);

    const condition: ICondition<ContractSchema> = { title: 'draft' };
    const body: IMongoUpdate<ContractSchema> = { title: 'published' };
    const options = { session: 'session' } as unknown as IMongoOptions<ContractSchema>;

    await repo.updateMany(condition, body, options);

    expect(repo.findMock).toHaveBeenCalledWith({ condition }, options);
  });

  it('should pass options to deleteMany pre-read queries', async () => {
    const exec = (jest.fn() as any).mockResolvedValue([]);
    const destroyManyExec = (jest.fn() as any).mockResolvedValue({});
    const destroyMany = jest.fn().mockReturnValue({ exec: destroyManyExec });
    const repo = new ContractRepo({ getModel: jest.fn().mockReturnValue({ destroyMany }) } as unknown as MongoService);
    repo.qbMock.mockReturnValue({ exec });

    const condition: ICondition<ContractSchema> = { title: 'draft' };
    const options = { session: 'session' } as unknown as IMongoOptions<ContractSchema>;

    await repo.deleteMany(condition, options);

    expect(repo.qbMock).toHaveBeenCalledWith({ condition }, options);
    expect(destroyMany).toHaveBeenCalledWith(condition, options);
  });

  it('should normalize ObjectId values in transformed output documents', () => {
    const repo = new ContractRepo({ getModel: jest.fn() } as unknown as MongoService);
    const id = '656c096ad77a68cf9c495e28';
    const authorId = '656c096ad77a68cf9c495e29';
    const authorNestedId = '656c096ad77a68cf9c495e30';

    const result = repo.exposeTransform({
      _id: ObjectId.create(id),
      title: 'article',
      authorId: ObjectId.create(authorId),
      author: {
        _id: ObjectId.create(authorNestedId),
        name: 'Author',
      },
    }) as ContractSchema;

    expect(result).toEqual(
      expect.objectContaining({
        _id: id,
        title: 'article',
        authorId,
        author: { _id: authorNestedId, name: 'Author' },
      }),
    );
  });

  it('should preserve ObjectId values when transforming write payloads', () => {
    const repo = new ContractRepo({ getModel: jest.fn() } as unknown as MongoService);
    const id = ObjectId.create('656c096ad77a68cf9c495e28');

    const result = repo.exposeTransform({ snapshot: { id } }, { normalize: false }) as any;

    expect(result.snapshot.id).toBeInstanceOf(ObjectId);
    expect(String(result.snapshot.id)).toBe(String(id));
  });
});
