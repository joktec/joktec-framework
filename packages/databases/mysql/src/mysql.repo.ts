import {
  ConfigService,
  Constructor,
  CursorPagination,
  DEFAULT_CON_ID,
  ICondition,
  Inject,
  Injectable,
  KeyOf,
  LogService,
  OnApplicationBootstrap,
  OnModuleInit,
} from '@joktec/core';
import { plainToInstance, toArray, toInt } from '@joktec/utils';
import { chunk, isArray, isNil, isObject, omit } from 'lodash';
import { DeepPartial, EntityManager, FindManyOptions, Repository } from 'typeorm';
import { SelectQueryBuilder } from 'typeorm/query-builder/SelectQueryBuilder';
import { UpsertOptions } from 'typeorm/repository/UpsertOptions';
import { MysqlHelper } from './helpers';
import { IMysqlOption, IMysqlRequest, IMysqlResponse, MysqlId, MysqlModel } from './models';
import { IMysqlRepository } from './mysql.client';
import { Dialect } from './mysql.config';
import { MysqlCatch, MysqlException } from './mysql.exception';
import { MysqlService } from './mysql.service';

/**
 * Base repository for relational entities. It centralizes TypeORM query building,
 * pagination, transaction-aware repository selection, and entity transformation.
 */
@Injectable()
export abstract class MysqlRepo<T extends MysqlModel, ID extends MysqlId = MysqlId>
  implements IMysqlRepository<T, ID>, OnModuleInit, OnApplicationBootstrap
{
  @Inject() protected configService: ConfigService;
  @Inject() protected logService: LogService;

  protected constructor(
    protected mysqlService: MysqlService,
    protected model: Constructor<T>,
    protected conId: string = DEFAULT_CON_ID,
  ) {}

  async onModuleInit() {
    this.logService.setContext(this.constructor.name);
  }

  onApplicationBootstrap() {}

  get entityManager(): EntityManager {
    return this.mysqlService.getEntityManager(this.conId);
  }

  get repository(): Repository<T> {
    return this.mysqlService.getRepository(this.model, this.conId);
  }

  private get dialect(): Dialect {
    return this.mysqlService.getConfig(this.conId).dialect || Dialect.MYSQL;
  }

  private getRepository(opts: IMysqlOption<T> = {}): Repository<T> {
    const manager = opts.queryRunner?.manager || opts.manager;
    if (manager) return manager.getRepository(this.model as any);
    return this.repository;
  }

  /**
   * Converts raw TypeORM entities into the configured model class.
   */
  protected transform(docs: any | any[]): T | T[] {
    if (isNil(docs)) return null;
    if (isArray(docs) && !docs.length) return [];
    const transformDocs = plainToInstance(this.model, toArray(docs));
    return (isArray(docs) ? transformDocs : transformDocs[0]) as any;
  }

  /**
   * Builds the canonical query builder from the shared request contract.
   */
  public qb(query: IMysqlRequest<T> = {}, opts: IMysqlOption<T> = {}): SelectQueryBuilder<T> {
    const repository = this.getRepository(opts);
    const context = { metadata: repository.metadata, dialect: this.dialect };
    const qb = repository.createQueryBuilder(this.model.name);
    if (query.condition) MysqlHelper.applyCondition(qb, query.condition, context);
    if (query.select) MysqlHelper.applyProjection(qb, query.select, context);
    if (query.sort) MysqlHelper.applyOrder(qb, query.sort, context);
    MysqlHelper.applyPagination(qb, query);
    if (query.populate) MysqlHelper.applyRelations(qb, query.populate, context);
    if (query.withDeleted || opts.withDeleted) qb.withDeleted();
    if (opts.comment) qb.comment(opts.comment);
    if (opts.cache) qb.cache(opts.cache);
    if (opts.lock) {
      if (opts.lock.mode === 'optimistic') qb.setLock('optimistic', opts.lock.version);
      else qb.setLock(opts.lock.mode, undefined, opts.lock.tables).setOnLocked(opts.lock.onLocked);
    }
    return qb;
  }

  private whereById(pkValue: ID): FindManyOptions<T>['where'] {
    const primaryColumns = this.repository.metadata.primaryColumns.map(pk => pk.propertyName);
    if (primaryColumns.length !== 1) {
      throw new MysqlException('MYSQL_COMPOSITE_PRIMARY_KEY_REQUIRES_CONDITION', {
        model: this.model.name,
        primaryColumns,
      });
    }
    return { [primaryColumns[0]]: pkValue } as FindManyOptions<T>['where'];
  }

  @MysqlCatch
  async paginate(query: IMysqlRequest<T>, opts: IMysqlOption<T> = {}): Promise<IMysqlResponse<T>> {
    if (CursorPagination.isCursorRequest(query)) return this.paginateByCursor(query, opts);

    const findQuery: IMysqlRequest<T> = { ...query };
    const countQuery: IMysqlRequest<T> = omit(query, [
      'select',
      'page',
      'limit',
      'offset',
      'cursor',
      'cursorKey',
      'sort',
    ]);
    const [items, total] = await Promise.all([this.find(findQuery, opts), this.count(countQuery, opts)]);
    return { items, total };
  }

  /**
   * Executes keyset pagination using createdAt and primary key columns as stable defaults.
   */
  private async paginateByCursor(query: IMysqlRequest<T>, opts: IMysqlOption<T> = {}): Promise<IMysqlResponse<T>> {
    const limit = CursorPagination.getLimit(query.limit);
    const primaryKeys = this.repository.metadata.primaryColumns.map(pk => pk.propertyName);
    const defaultKeys = primaryKeys.length ? ['createdAt', ...primaryKeys] : ['createdAt'];
    let cursor: ReturnType<typeof CursorPagination.resolve<T>>;
    try {
      cursor = CursorPagination.resolve<T>({
        cursor: query.cursor,
        cursorKey: query.cursorKey,
        defaultKeys,
        tieBreakerKeys: primaryKeys,
        sort: query.sort,
      });
    } catch (err) {
      throw new MysqlException('MYSQL_INVALID_CURSOR', err);
    }
    this.assertCursorColumns(cursor.keys, opts);
    const findQuery: IMysqlRequest<T> = omit(query, ['page', 'limit', 'offset', 'cursor', 'cursorKey', 'sort']);
    const qb = this.qb(findQuery, opts);
    const cursorContext = { metadata: this.getRepository(opts).metadata, dialect: this.dialect };
    this.applyCursorCondition(qb, cursor.keys, cursor.directions, cursor.values, opts);
    cursor.keys.forEach((key, index) => {
      qb.addOrderBy(MysqlHelper.column(qb, key, cursorContext), cursor.directions[index] === 'asc' ? 'ASC' : 'DESC');
    });
    qb.take(limit + 1);

    const countQuery: IMysqlRequest<T> = omit(query, [
      'select',
      'page',
      'limit',
      'offset',
      'cursor',
      'cursorKey',
      'sort',
    ]);
    const [rawItems, total] = await Promise.all([qb.getMany(), this.count(countQuery, opts)]);
    const transformedItems = this.transform(rawItems) as T[];
    const { items, hasNextPage, nextCursor } = CursorPagination.slice(
      transformedItems,
      limit,
      cursor.keys,
      cursor.directions,
    );
    return { items, total, hasNextPage, nextCursor };
  }

  private assertCursorColumns(keys: string[], opts: IMysqlOption<T> = {}): void {
    const repository = this.getRepository(opts);
    const columnPaths = new Set(repository.metadata.columns.map(column => column.propertyPath || column.propertyName));
    const invalidKey = keys.find(key => !columnPaths.has(key));
    if (invalidKey) throw new MysqlException('MYSQL_UNKNOWN_COLUMN', { key: invalidKey, model: this.model.name });
  }

  /**
   * Appends lexicographic cursor predicates for multi-column keyset pagination.
   */
  private applyCursorCondition(
    qb: SelectQueryBuilder<T>,
    keys: string[],
    directions: Array<'asc' | 'desc'>,
    values?: unknown[],
    opts: IMysqlOption<T> = {},
  ): void {
    if (!values?.length) return;

    const context = { metadata: this.getRepository(opts).metadata, dialect: this.dialect };
    const columns = keys.map(key => MysqlHelper.column(qb, key, context));

    const clauses = columns.map((column, index) => {
      const equality = keys.slice(0, index).map((equalityKey, equalityIndex) => {
        const param = `cursor_${equalityIndex}_eq`;
        qb.setParameter(param, values[equalityIndex]);
        return `${MysqlHelper.column(qb, equalityKey, context)} = :${param}`;
      });
      const operator = directions[index] === 'asc' ? '>' : '<';
      const param = `cursor_${index}`;
      qb.setParameter(param, values[index]);
      return [...equality, `${column} ${operator} :${param}`].join(' AND ');
    });

    qb.andWhere(`(${clauses.map(clause => `(${clause})`).join(' OR ')})`);
  }

  @MysqlCatch
  async find(query: IMysqlRequest<T>, opts: IMysqlOption<T> = {}): Promise<T[]> {
    const docs = await this.qb(query, opts).getMany();
    return this.transform(docs) as T[];
  }

  @MysqlCatch
  async count(query: IMysqlRequest<T>, opts: IMysqlOption<T> = {}): Promise<number> {
    const countQuery: IMysqlRequest<T> = omit(query, [
      'select',
      'page',
      'limit',
      'offset',
      'cursor',
      'cursorKey',
      'sort',
    ]);
    return this.qb(countQuery, opts).getCount();
  }

  @MysqlCatch
  async findOne(
    cond: ID | ICondition<T>,
    query: Omit<IMysqlRequest<T>, 'condition'> = {},
    opts: IMysqlOption<T> = {},
  ): Promise<T> {
    const condition: ICondition<T> = {};
    if (!isObject(cond)) Object.assign(condition, { ...this.whereById(cond) });
    else Object.assign(condition, cond);

    const mergeQuery: IMysqlRequest<T> = Object.assign({}, query, { condition });
    const doc = await this.qb({ ...mergeQuery, limit: 1 }, opts).getOne();
    return this.transform(doc) as T;
  }

  @MysqlCatch
  async create(body: DeepPartial<T>, opts: IMysqlOption<T> = {}): Promise<T> {
    const transformBody: T = this.transform(body) as T;
    const repository = this.getRepository(opts);
    const entity = repository.create(transformBody);
    return repository.save(entity, opts);
  }

  @MysqlCatch
  async update(cond: ID | ICondition<T>, body: DeepPartial<T>, options: IMysqlOption<T> = {}): Promise<T> {
    const condition: ICondition<T> = {};
    if (!isObject(cond)) Object.assign(condition, { ...this.whereById(cond) });
    else Object.assign(condition, cond);

    const entity = await this.findOne(condition, {}, options);
    if (!entity) return null;

    const transformBody: T = this.transform({ ...entity, ...body }) as T;
    const doc = await this.getRepository(options).save(transformBody, options);
    return this.transform(doc) as T;
  }

  @MysqlCatch
  async delete(cond: ID | ICondition<T>, opts: IMysqlOption<T> & { force?: boolean } = {}): Promise<T> {
    const entity = await this.findOne(cond, { withDeleted: opts.withDeleted }, opts);
    if (!entity) return null;
    const repository = this.getRepository(opts);
    const doc =
      opts?.force || !repository.metadata.deleteDateColumn
        ? await repository.remove(entity, opts)
        : await repository.softRemove(entity, opts);
    return this.transform(doc) as T;
  }

  @MysqlCatch
  async restore(cond: ID | ICondition<T>, opts: IMysqlOption<T> & { reload?: false } = {}): Promise<T> {
    const entity = await this.findOne(cond, { withDeleted: true }, opts);
    if (!entity) return null;
    const doc = await this.getRepository(opts).recover(entity, opts);
    return this.transform(doc) as T;
  }

  @MysqlCatch
  async upsert(
    body: DeepPartial<T>,
    onConflicts: KeyOf<T>[],
    opts: IMysqlOption<T> & Omit<UpsertOptions<T>, 'conflictPaths'> = {},
  ): Promise<T> {
    const repository = this.getRepository(opts);
    const transformBody: any = repository.create(body);
    const result = await repository.upsert(transformBody, { ...opts, conflictPaths: onConflicts });
    return this.reloadUpsertResult(transformBody, result.generatedMaps?.[0], onConflicts, opts);
  }

  @MysqlCatch
  async bulkUpsert(
    body: DeepPartial<T>[],
    onConflicts: KeyOf<T>[],
    opts: IMysqlOption<T> & Omit<UpsertOptions<T>, 'conflictPaths'> & { chunkSize?: number } = {},
  ): Promise<T[]> {
    const chunkSize = toInt(opts?.chunkSize, 1000);
    const chunkItems = chunk(body, chunkSize);
    const results: T[][] = [];
    const repository = this.getRepository(opts);
    for (const chunkItem of chunkItems) {
      const transformBody: any[] = repository.create(chunkItem);
      const result = await repository.upsert(transformBody, { ...opts, conflictPaths: onConflicts });
      const transformResult = await Promise.all(
        transformBody.map((item, index) =>
          this.reloadUpsertResult(item, result.generatedMaps?.[index], onConflicts, opts),
        ),
      );
      results.push(transformResult);
    }
    return results.flat();
  }

  private async reloadUpsertResult(
    body: DeepPartial<T>,
    generatedMap: object,
    onConflicts: KeyOf<T>[],
    opts: IMysqlOption<T>,
  ): Promise<T> {
    if (opts.reload === false && generatedMap) return this.transform(generatedMap) as T;

    const condition = this.resolveReloadCondition(body, generatedMap, onConflicts);
    if (!condition) {
      if (generatedMap) return this.transform(generatedMap) as T;
      throw new MysqlException('MYSQL_UPSERT_RELOAD_FAILED', { model: this.model.name, onConflicts });
    }

    const doc = await this.findOne(condition as ICondition<T>, {}, opts);
    if (!doc) throw new MysqlException('MYSQL_UPSERT_RELOAD_FAILED', { model: this.model.name, condition });
    return doc;
  }

  private resolveReloadCondition(
    body: DeepPartial<T>,
    generatedMap: object,
    onConflicts: KeyOf<T>[],
  ): Partial<Record<KeyOf<T>, unknown>> | null {
    const source = { ...(body as object), ...(generatedMap || {}) };
    const primaryKeys = this.repository.metadata.primaryColumns.map(column => column.propertyName as KeyOf<T>);
    const primaryCondition = this.pickDefined(source, primaryKeys);
    if (primaryCondition) return primaryCondition;
    return this.pickDefined(source, onConflicts);
  }

  private pickDefined(source: object, keys: KeyOf<T>[]): Partial<Record<KeyOf<T>, unknown>> | null {
    const entries = keys.map(key => [key, source[key as string]] as const);
    if (!entries.length || entries.some(([, value]) => isNil(value))) return null;
    return entries.reduce(
      (acc, [key, value]) => {
        acc[key] = value;
        return acc;
      },
      {} as Partial<Record<KeyOf<T>, unknown>>,
    );
  }
}
