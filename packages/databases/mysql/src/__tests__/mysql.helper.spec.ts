import { SelectQueryBuilder } from 'typeorm';
import { MysqlHelper } from '../helpers';
import { Dialect } from '../mysql.config';

const metadata = {
  name: 'TestMysqlEntity',
  columns: [
    { propertyName: 'id', propertyPath: 'id' },
    { propertyName: 'title', propertyPath: 'title' },
    { propertyName: 'createdAt', propertyPath: 'createdAt' },
  ],
  relations: [{ propertyName: 'author', propertyPath: 'author' }],
} as any;

const createQueryBuilder = () =>
  ({
    alias: 'TestMysqlEntity',
    andWhere: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
  }) as unknown as SelectQueryBuilder<any>;

describe('MysqlHelper query safety', () => {
  it('should reject unsafe field paths before interpolating identifiers', () => {
    const qb = createQueryBuilder();

    expect(() =>
      MysqlHelper.applyOrder(qb, { 'title;drop': 'asc' } as any, { metadata, dialect: Dialect.MYSQL }),
    ).toThrow('MYSQL_UNSAFE_FIELD_PATH');
  });

  it('should reject unknown columns from request query', () => {
    const qb = createQueryBuilder();

    expect(() => MysqlHelper.applyProjection(qb, ['missingColumn'], { metadata, dialect: Dialect.MYSQL })).toThrow(
      'MYSQL_UNKNOWN_COLUMN',
    );
  });

  it('should reject unsupported array operators for mysql dialect', () => {
    const qb = createQueryBuilder();

    expect(() =>
      MysqlHelper.applyCondition(qb, { title: { $size: 2 } } as any, { metadata, dialect: Dialect.MYSQL }),
    ).toThrow('MYSQL_OPERATOR_UNSUPPORTED_BY_DIALECT');
  });

  it('should choose postgres case-insensitive like operator and escape wildcard input', () => {
    const qb = createQueryBuilder();

    MysqlHelper.applyCondition(qb, { title: { $like: 'hello_%\\' } } as any, {
      metadata,
      dialect: Dialect.POSTGRES,
    });

    expect(qb.andWhere).toHaveBeenCalledWith("TestMysqlEntity.title ILIKE :title_0 ESCAPE '\\\\'", {
      title_0: '%hello\\_\\%\\\\%',
    });
  });

  it('should reject empty or non-array values for list operators', () => {
    const qb = createQueryBuilder();

    expect(() =>
      MysqlHelper.applyCondition(qb, { title: { $in: [] } } as any, { metadata, dialect: Dialect.MYSQL }),
    ).toThrow('MYSQL_INVALID_OPERATOR_VALUE');

    expect(() =>
      MysqlHelper.applyCondition(qb, { title: { $nin: 'draft' } } as any, { metadata, dialect: Dialect.MYSQL }),
    ).toThrow('MYSQL_INVALID_OPERATOR_VALUE');
  });

  it('should respect boolean semantics for nil and exists operators', () => {
    const qb = createQueryBuilder();

    MysqlHelper.applyCondition(
      qb,
      {
        title: { $nil: false },
        createdAt: { $exists: false },
      } as any,
      { metadata, dialect: Dialect.MYSQL },
    );

    expect(qb.andWhere).toHaveBeenCalledWith('TestMysqlEntity.title IS NOT NULL');
    expect(qb.andWhere).toHaveBeenCalledWith('TestMysqlEntity.createdAt IS NULL');
  });

  it('should keep the root alias when building nested logical clauses', () => {
    const qb = createQueryBuilder();

    MysqlHelper.applyCondition(qb, { $or: [{ title: 'first' }, { title: 'second' }] } as any, {
      metadata,
      dialect: Dialect.MYSQL,
    });

    const rootBracket = (qb.andWhere as jest.Mock).mock.calls[0][0] as any;
    const childBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
    };
    rootBracket.whereFactory(childBuilder);

    const firstNestedBracket = childBuilder.andWhere.mock.calls[0][0] as any;
    const grandChildBuilder = {
      andWhere: jest.fn().mockReturnThis(),
    };
    firstNestedBracket.whereFactory(grandChildBuilder);

    expect(grandChildBuilder.andWhere).toHaveBeenCalledWith('TestMysqlEntity.title = :title_0', {
      title_0: 'first',
    });
  });
});
