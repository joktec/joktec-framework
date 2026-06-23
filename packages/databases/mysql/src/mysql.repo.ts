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
import { DeepPartial, EntityManager, FindManyOptions, FindOneOptions, Repository } from 'typeorm';
import { SelectQueryBuilder } from 'typeorm/query-builder/SelectQueryBuilder';
import { UpsertOptions } from 'typeorm/repository/UpsertOptions';
import { MysqlFinder, MysqlHelper } from './helpers';
import { IMysqlOption, IMysqlRequest, IMysqlResponse, MysqlId, MysqlModel } from './models';
import { IMysqlRepository } from './mysql.client';
import { MysqlCatch } from './mysql.exception';
import { MysqlService } from './mysql.service';

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

  protected transform(docs: any | any[]): T | T[] {
    if (isNil(docs)) return null;
    if (isArray(docs) && !docs.length) return [];
    const transformDocs = plainToInstance(this.model, toArray(docs));
    return (isArray(docs) ? transformDocs : transformDocs[0]) as any;
  }

  public qb(query: IMysqlRequest<T> = {}, opts: IMysqlOption<T> = {}): SelectQueryBuilder<T> {
    const metadata = Reflect.getMetadata('searchableKeywords', this.model);

    const qb = this.repository.createQueryBuilder(this.model.name);
    if (query.condition) MysqlHelper.applyCondition(qb, query.condition);
    if (query.select) MysqlHelper.applyProjection(qb, query.select);
    if (query.sort) MysqlHelper.applyOrder(qb, query.sort);
    MysqlHelper.applyPagination(qb, query);
    if (query.populate) MysqlHelper.applyRelations(qb, query.populate);
    if (opts.withDeleted) qb.withDeleted();
    if (opts.comment) qb.comment(opts.comment);
    if (opts.cache) qb.cache(opts.cache);
    if (opts.lock) {
      if (opts.lock.mode === 'optimistic') qb.setLock('optimistic', opts.lock.version);
      else qb.setLock(opts.lock.mode, undefined, opts.lock.tables).setOnLocked(opts.lock.onLocked);
    }
    return qb;
  }

  public finder(query: IMysqlRequest<T> = {}, opts: IMysqlOption<T> = {}): FindManyOptions<T> {
    const options: FindManyOptions<T> = MysqlFinder.parseFilter(query);
    const { limit, offset } = MysqlFinder.parsePagination(query);

    // if (query?.near) qb.center(query.near); // TODO: Handle
    // if (query?.keyword) qb.search(query.keyword); // TODO: Handle
    if (query.select) options.select = MysqlFinder.parseProjection(query.select);
    if (query.sort) options.order = MysqlFinder.parseOrder(query.sort);
    if (offset !== undefined) options.skip = offset;
    if (limit !== undefined) options.take = limit;
    if (query.populate) options.relations = MysqlFinder.parseRelations(query.populate);

    return { ...opts, ...options };
  }

  private whereById(pkValue: ID): FindManyOptions<T>['where'] {
    const primaryColumns = this.repository.metadata.primaryColumns.map(pk => pk.propertyName);
    return primaryColumns.reduce((curr, acc) => {
      curr[acc] = pkValue;
      return curr;
    }, {});
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

  private async paginateByCursor(query: IMysqlRequest<T>, opts: IMysqlOption<T> = {}): Promise<IMysqlResponse<T>> {
    const limit = CursorPagination.getLimit(query.limit);
    const primaryKeys = this.repository.metadata.primaryColumns.map(pk => pk.propertyName);
    const defaultKeys = primaryKeys.length ? ['createdAt', ...primaryKeys] : ['createdAt'];
    const cursor = CursorPagination.resolve<T>({
      cursor: query.cursor,
      cursorKey: query.cursorKey,
      defaultKeys,
      tieBreakerKeys: primaryKeys,
      sort: query.sort,
    });
    this.assertCursorColumns(cursor.keys);
    const findQuery: IMysqlRequest<T> = omit(query, ['page', 'limit', 'offset', 'cursor', 'cursorKey', 'sort']);
    const qb = this.qb(findQuery, opts);
    this.applyCursorCondition(qb, cursor.keys, cursor.directions, cursor.values);
    cursor.keys.forEach((key, index) => {
      qb.addOrderBy(`${qb.alias}.${key}`, cursor.directions[index] === 'asc' ? 'ASC' : 'DESC');
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

  private assertCursorColumns(keys: string[]): void {
    const columnPaths = new Set(
      this.repository.metadata.columns.map(column => column.propertyPath || column.propertyName),
    );
    const invalidKey = keys.find(key => !columnPaths.has(key));
    if (invalidKey) throw new Error(`Invalid cursor key "${invalidKey}" for ${this.model.name}`);
  }

  private applyCursorCondition(
    qb: SelectQueryBuilder<T>,
    keys: string[],
    directions: Array<'asc' | 'desc'>,
    values?: unknown[],
  ): void {
    if (!values?.length) return;

    const clauses = keys.map((key, index) => {
      const equality = keys.slice(0, index).map((equalityKey, equalityIndex) => {
        const param = `cursor_${equalityIndex}_eq`;
        qb.setParameter(param, values[equalityIndex]);
        return `${qb.alias}.${equalityKey} = :${param}`;
      });
      const operator = directions[index] === 'asc' ? '>' : '<';
      const param = `cursor_${index}`;
      qb.setParameter(param, values[index]);
      return [...equality, `${qb.alias}.${key} ${operator} :${param}`].join(' AND ');
    });

    qb.andWhere(`(${clauses.map(clause => `(${clause})`).join(' OR ')})`);
  }

  @MysqlCatch
  async find(query: IMysqlRequest<T>, opts: IMysqlOption<T> = {}): Promise<T[]> {
    const options: FindManyOptions<T> = this.finder(query, opts);
    const docs = await this.repository.find(options);
    return this.transform(docs) as T[];
  }

  @MysqlCatch
  async count(query: IMysqlRequest<T>, opts: IMysqlOption<T> = {}): Promise<number> {
    const options: FindManyOptions<T> = this.finder(query, opts);
    return this.repository.count(options);
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
    const options: FindOneOptions<T> = this.finder(mergeQuery, opts);
    const doc = await this.repository.findOne(options);
    return this.transform(doc) as T;
  }

  @MysqlCatch
  async create(body: DeepPartial<T>, opts: IMysqlOption<T> = {}): Promise<T> {
    const transformBody: T = this.transform(body) as T;
    const entity = this.repository.create(transformBody);
    return this.repository.save(entity, opts);
  }

  @MysqlCatch
  async update(cond: ID | ICondition<T>, body: DeepPartial<T>, options: IMysqlOption<T> = {}): Promise<T> {
    const condition: ICondition<T> = {};
    if (!isObject(cond)) Object.assign(condition, { ...this.whereById(cond) });
    else Object.assign(condition, cond);

    const entity = await this.findOne(condition, options);
    if (!entity) return null;

    const transformBody: T = this.transform({ ...entity, ...body }) as T;
    const doc = await this.repository.save(transformBody, options);
    return this.transform(doc) as T;
  }

  @MysqlCatch
  async delete(cond: ID | ICondition<T>, opts: IMysqlOption<T> & { force?: boolean } = {}): Promise<T> {
    const entity = await this.findOne(cond, opts);
    if (!entity) return null;
    const doc = opts?.force ? await this.repository.remove(entity) : await this.repository.softRemove(entity);
    return this.transform(doc) as T;
  }

  @MysqlCatch
  async restore(cond: ID | ICondition<T>, opts: IMysqlOption<T> & { reload?: false } = {}): Promise<T> {
    const entity = await this.findOne(cond, opts);
    if (!entity) return null;
    const doc = await this.repository.recover(entity);
    return this.transform(doc) as T;
  }

  @MysqlCatch
  async upsert(
    body: DeepPartial<T>,
    onConflicts: KeyOf<T>[],
    opts: IMysqlOption<T> & Omit<UpsertOptions<T>, 'conflictPaths'> = {},
  ): Promise<T> {
    const transformBody: any = this.repository.create(body);
    const result = await this.repository.upsert(transformBody, { ...opts, conflictPaths: onConflicts });
    return this.transform(result.generatedMaps[0]) as T;
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
    for (const chunkItem of chunkItems) {
      const transformBody: any[] = this.repository.create(chunkItem);
      const result = await this.repository.upsert(transformBody, { ...opts, conflictPaths: onConflicts });
      const transformResult = this.transform(result.generatedMaps) as T[];
      results.push(transformResult);
    }
    return results.flat();
  }
}
