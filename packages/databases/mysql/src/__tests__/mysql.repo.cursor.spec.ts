import { CursorPagination } from '@joktec/core';
import { Column, Entity as MysqlEntity, PrimaryGeneratedColumn } from 'typeorm';
import { Dialect } from '../mysql.config';
import { MysqlModel } from '../models';
import { MysqlRepo } from '../mysql.repo';
import { MysqlService } from '../mysql.service';

@MysqlEntity()
class TestMysqlEntity extends MysqlModel {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;
}

class TestMysqlRepo extends MysqlRepo<TestMysqlEntity, number> {
  constructor(mysqlService: MysqlService) {
    super(mysqlService, TestMysqlEntity);
  }
}

const createQueryBuilder = (items: TestMysqlEntity[]) => {
  const qb = {
    alias: TestMysqlEntity.name,
    addOrderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    withDeleted: jest.fn().mockReturnThis(),
    comment: jest.fn().mockReturnThis(),
    cache: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(items),
    getCount: jest.fn().mockResolvedValue(3),
    getOne: jest.fn().mockResolvedValue(items[0] || null),
  };
  return qb;
};

const createTypeormRepository = (qb: ReturnType<typeof createQueryBuilder>) => ({
  metadata: {
    primaryColumns: [{ propertyName: 'id' }],
    deleteDateColumn: { propertyName: 'deletedAt' },
    columns: [
      { propertyName: 'id', propertyPath: 'id' },
      { propertyName: 'title', propertyPath: 'title' },
      { propertyName: 'createdAt', propertyPath: 'createdAt' },
    ],
    relations: [],
  },
  createQueryBuilder: jest.fn().mockReturnValue(qb),
  softRemove: jest.fn(async (entity: TestMysqlEntity) => entity),
  remove: jest.fn(async (entity: TestMysqlEntity) => entity),
});

const createCompositeTypeormRepository = (qb: ReturnType<typeof createQueryBuilder>) => ({
  ...createTypeormRepository(qb),
  metadata: {
    ...createTypeormRepository(qb).metadata,
    primaryColumns: [{ propertyName: 'tenantId' }, { propertyName: 'id' }],
    columns: [
      { propertyName: 'tenantId', propertyPath: 'tenantId' },
      { propertyName: 'id', propertyPath: 'id' },
      { propertyName: 'title', propertyPath: 'title' },
      { propertyName: 'createdAt', propertyPath: 'createdAt' },
    ],
  },
});

const createMysqlService = (repository: ReturnType<typeof createTypeormRepository>) =>
  ({
    getRepository: jest.fn().mockReturnValue(repository),
    getConfig: jest.fn().mockReturnValue({ dialect: Dialect.MYSQL }),
  }) as unknown as MysqlService;

const attachDecoratorServices = (repo: TestMysqlRepo): TestMysqlRepo => {
  Object.assign(repo as unknown as Record<string, unknown>, {
    PinoLogger: { setContext: jest.fn() },
    ConfigService: {},
  });
  return repo;
};

describe('MysqlRepo cursor pagination', () => {
  it('should build a cursor query using requested cursor key and stable tie breaker', async () => {
    const rawItems = [
      { id: 1, title: 'first', createdAt: new Date('2026-01-01T00:00:00.000Z') },
      { id: 2, title: 'second', createdAt: new Date('2026-01-02T00:00:00.000Z') },
      { id: 3, title: 'third', createdAt: new Date('2026-01-03T00:00:00.000Z') },
    ] as TestMysqlEntity[];
    const qb = createQueryBuilder(rawItems);
    const repository = createTypeormRepository(qb);
    const repo = attachDecoratorServices(new TestMysqlRepo(createMysqlService(repository)));

    const result = await repo.paginate({
      cursorKey: 'createdAt',
      limit: 2,
      sort: { createdAt: 'desc' },
    });

    expect(repository.createQueryBuilder).toHaveBeenCalledWith(TestMysqlEntity.name);
    expect(qb.addOrderBy).toHaveBeenCalledWith(`${TestMysqlEntity.name}.createdAt`, 'DESC');
    expect(qb.addOrderBy).toHaveBeenCalledWith(`${TestMysqlEntity.name}.id`, 'DESC');
    expect(qb.take).toHaveBeenCalledWith(3);
    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(3);
    expect(result.hasNextPage).toBe(true);
    expect(result.nextCursor).toEqual(expect.any(String));

    const cursor = CursorPagination.resolve<TestMysqlEntity>({ cursor: result.nextCursor, defaultKeys: ['id'] });
    expect(cursor.keys).toEqual(['createdAt', 'id']);
    expect(cursor.values).toEqual([rawItems[1].createdAt, rawItems[1].id]);
  });

  it('should reject unsafe cursor field names before building SQL', async () => {
    const qb = createQueryBuilder([]);
    const repository = createTypeormRepository(qb);
    const repo = attachDecoratorServices(new TestMysqlRepo(createMysqlService(repository)));

    await expect(repo.paginate({ cursorKey: 'createdAt;drop' as keyof TestMysqlEntity })).rejects.toThrow(
      'MYSQL_INVALID_CURSOR',
    );
  });

  it('should reject cursor keys that are not mapped columns', async () => {
    const qb = createQueryBuilder([]);
    const repository = createTypeormRepository(qb);
    const repo = attachDecoratorServices(new TestMysqlRepo(createMysqlService(repository)));

    await expect(repo.paginate({ cursorKey: 'missingColumn' as keyof TestMysqlEntity })).rejects.toThrow(
      'MYSQL_UNKNOWN_COLUMN',
    );
  });

  it('should reject scalar id lookup for entities with composite primary keys', async () => {
    const qb = createQueryBuilder([]);
    const repository = createCompositeTypeormRepository(qb);
    const repo = attachDecoratorServices(new TestMysqlRepo(createMysqlService(repository)));

    await expect(repo.findOne(1)).rejects.toThrow('MYSQL_COMPOSITE_PRIMARY_KEY_REQUIRES_CONDITION');
  });

  it('should call repository softRemove without losing repository context', async () => {
    const entity = { id: 1, title: 'delete me' } as TestMysqlEntity;
    const qb = createQueryBuilder([]);
    const repository = createTypeormRepository(qb);
    const repo = attachDecoratorServices(new TestMysqlRepo(createMysqlService(repository)));
    jest.spyOn(repo, 'findOne').mockResolvedValue(entity);

    const result = await repo.delete(entity.id);

    expect(repository.softRemove).toHaveBeenCalledWith(entity, {});
    expect(result).toEqual(entity);
  });
});
