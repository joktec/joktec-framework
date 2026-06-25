import {
  Clazz,
  ConfigService,
  CursorPagination,
  DEFAULT_CON_ID,
  ICondition,
  Inject,
  Injectable,
  KeyOf,
  LogService,
  OnModuleInit,
  Reflector,
} from '@joktec/core';
import { plainToInstance, toArray, toInt } from '@joktec/utils';
import { Ref } from '@typegoose/typegoose';
import { chunk, isArray, isBuffer, isDate, isEmpty, isNil, isPlainObject, omit, pick } from 'lodash';
import { Aggregate, RefType } from 'mongoose';
import { MongoHelper, MongoPipeline, UPDATE_OPTIONS, UPSERT_OPTIONS } from './helpers';
import {
  IMongoAggregateOptions,
  IMongoBulkOptions,
  IMongoOptions,
  IMongoPaginationResponse,
  IMongoPipeline,
  IMongoRequest,
  IMongoUpdate,
  MongoSchema,
  ObjectId,
} from './models';
import { IMongoRepository, MongoType } from './mongo.client';
import { MongoCatch } from './mongo.exception';
import { MongoService } from './mongo.service';

/**
 * Base repository for Mongo-backed services. It centralizes query parsing,
 * pagination, soft delete helpers, and response transformation for app repos.
 */
@Injectable()
export abstract class MongoRepo<T extends MongoSchema, ID extends RefType = string>
  implements IMongoRepository<T, ID>, OnModuleInit
{
  @Inject() protected reflector: Reflector;
  @Inject() protected configService: ConfigService;
  @Inject() protected logService: LogService;

  protected constructor(
    protected mongoService: MongoService,
    protected schema: typeof MongoSchema,
    protected conId: string = DEFAULT_CON_ID,
  ) {}

  async onModuleInit() {
    this.logService.setContext(this.constructor.name);
  }

  protected get model(): MongoType<T> {
    return this.mongoService.getModel<T>(this.schema, this.conId);
  }

  /**
   * Converts ObjectId and hydrated mongoose values into DTO-friendly plain values.
   */
  private normalizeDocumentValue(value: any): any {
    if (isNil(value)) return value;
    if (value instanceof ObjectId || value?._bsontype === 'ObjectId') return String(value);
    if (isDate(value) || isBuffer(value) || value instanceof RegExp) return value;
    if (isArray(value)) return value.map(item => this.normalizeDocumentValue(item));
    if (typeof value?.toObject === 'function') return this.normalizeDocumentValue(value.toObject({ virtuals: true }));

    if (isPlainObject(value)) {
      return Object.entries(value).reduce((acc, [key, item]) => {
        acc[key] = this.normalizeDocumentValue(item);
        return acc;
      }, {});
    }

    return value;
  }

  /**
   * Converts raw Mongo documents into the schema class used by the app layer.
   */
  protected transform(docs: any | any[], options: { normalize?: boolean } = { normalize: true }): T | T[] {
    return this.transformAs(this.schema as unknown as Clazz<T>, docs, options);
  }

  /**
   * Converts raw Mongo documents into an explicit schema class for custom aggregate projections.
   */
  protected transformAs<U>(
    schema: Clazz<U>,
    docs: any | any[],
    options: { normalize?: boolean } = { normalize: true },
  ): U | U[] {
    if (isNil(docs)) return null;
    if (isArray(docs) && !docs.length) return [];
    const sourceDocs = options.normalize ? toArray(docs).map(doc => this.normalizeDocumentValue(doc)) : toArray(docs);
    const transformDocs = plainToInstance(schema, sourceDocs, { ignoreDecorators: true });
    return (isArray(docs) ? transformDocs : transformDocs[0]) as any;
  }

  /**
   * Builds the canonical find query used by read operations.
   */
  public qb(query?: IMongoRequest<T>, options: IMongoOptions<T> = {}) {
    const qb = this.model.find<T>();
    qb.setOptions({ ...options });
    const { limit, offset } = MongoHelper.parsePagination(query);

    if (query?.near) qb.center(query.near);
    if (query?.keyword) qb.search(query.keyword);
    if (query?.condition) qb.where(MongoHelper.parseFilter(query.condition, true, { schema: this.model.schema }));
    if (query?.select) qb.select(query.select as any);
    if (query?.sort) qb.sort(MongoHelper.parseSort(query.sort));
    if (offset !== undefined) qb.skip(offset);
    if (limit !== undefined) qb.limit(limit);
    if (query?.populate) qb.populate(MongoHelper.parsePopulate(query.populate));

    return qb.lean({ virtuals: true });
  }

  /**
   * Creates a lean mongoose cursor for streaming large result sets.
   */
  public cursor(query: IMongoRequest<T>, options: IMongoOptions<T> = {}) {
    const qb = this.model.find<T>();
    qb.setOptions({ ...options });
    const { limit, offset } = MongoHelper.parsePagination(query);

    if (query?.near) qb.center(query.near);
    if (query?.keyword) qb.search(query.keyword);
    if (query?.condition) qb.where(MongoHelper.parseFilter(query.condition, true, { schema: this.model.schema }));
    if (query?.select) qb.select(MongoHelper.parseProjection(query.select));
    if (query?.sort) qb.sort(MongoHelper.parseSort(query.sort));
    if (offset !== undefined) qb.skip(offset);
    if (limit !== undefined) qb.limit(limit);
    if (query?.populate) qb.populate(MongoHelper.parsePopulate(query.populate));

    return qb.lean({ virtuals: true }).cursor();
  }

  /**
   * Builds an aggregation pipeline from the shared request contract.
   */
  public pipeline<U = T>(query?: IMongoRequest<T>, options?: IMongoAggregateOptions<U>): Aggregate<Array<U>> {
    const aggregations = this.model.aggregate();
    const { limit, offset } = MongoHelper.parsePagination(query);

    if (options) aggregations.option({ ...options });
    if (query?.near) MongoPipeline.near(query.near).map(near => aggregations.near(near));
    if (query?.keyword) aggregations.match(MongoPipeline.search(query.keyword));
    if (query?.condition) aggregations.match(MongoPipeline.match(query.condition));
    if (query?.select) aggregations.project(MongoPipeline.projection(query.select));
    if (query?.sort) aggregations.sort(MongoPipeline.sort(query.sort));
    if (offset !== undefined) aggregations.skip(offset);
    if (limit !== undefined) aggregations.limit(limit);
    if (query?.populate) MongoPipeline.lookup(query.populate, this.model).map(p => aggregations.append(p));
    if (query?.aggregations?.length) aggregations.append(...query.aggregations);

    return aggregations;
  }

  @MongoCatch
  async paginate(query: IMongoRequest<T>, options: IMongoOptions<T> = {}): Promise<IMongoPaginationResponse<T>> {
    if (CursorPagination.isCursorRequest(query)) return this.paginateByCursor(query, options);

    const findQuery: IMongoRequest<T> = { ...query };
    const countQuery: IMongoRequest<T> = omit(query, [
      'select',
      'page',
      'limit',
      'offset',
      'cursor',
      'cursorKey',
      'sort',
    ]);
    const [items, total] = await Promise.all([this.find(findQuery, options), this.count(countQuery, options)]);
    return { items, total };
  }

  /**
   * Executes keyset pagination with Mongo-specific cursor conditions.
   */
  private async paginateByCursor(
    query: IMongoRequest<T>,
    options: IMongoOptions<T> = {},
  ): Promise<IMongoPaginationResponse<T>> {
    const limit = CursorPagination.getLimit(query.limit);
    const cursor = CursorPagination.resolve<T>({
      cursor: query.cursor,
      cursorKey: query.cursorKey,
      defaultKeys: ['_id'],
      tieBreakerKeys: query.cursorKey ? ['_id'] : [],
      sort: query.sort,
    });
    const condition = this.mergeCursorCondition(query.condition || {}, cursor.keys, cursor.directions, cursor.values);
    const findQuery: IMongoRequest<T> = {
      ...omit(query, ['page', 'offset', 'cursor', 'cursorKey']),
      condition,
      limit: limit + 1,
      sort: CursorPagination.toSort<T>(cursor.keys, cursor.directions),
    };
    const countQuery: IMongoRequest<T> = omit(query, [
      'select',
      'page',
      'limit',
      'offset',
      'cursor',
      'cursorKey',
      'sort',
    ]);
    const [rawItems, total] = await Promise.all([this.find(findQuery, options), this.count(countQuery, options)]);
    const { items, hasNextPage, nextCursor } = CursorPagination.slice(rawItems, limit, cursor.keys, cursor.directions);
    return { items, total, hasNextPage, nextCursor };
  }

  /**
   * Merges cursor comparison clauses with caller-provided filters without losing either condition.
   */
  private mergeCursorCondition(
    condition: ICondition<T>,
    keys: string[],
    directions: Array<'asc' | 'desc'>,
    values?: unknown[],
  ): ICondition<T> {
    if (!values?.length) return condition;

    const cursorCondition: ICondition<T> = {
      $or: keys.map((key, index) => {
        const itemCondition = keys.slice(0, index).reduce((acc, equalityKey, equalityIndex) => {
          acc[equalityKey] = { $eq: values[equalityIndex] };
          return acc;
        }, {});
        const operator = directions[index] === 'asc' ? '$gt' : '$lt';
        itemCondition[key] = { [operator]: values[index] };
        return itemCondition;
      }),
    } as ICondition<T>;

    if (isEmpty(condition)) return cursorCondition;
    return { $and: [condition, cursorCondition] } as ICondition<T>;
  }

  @MongoCatch
  async find(query: IMongoRequest<T>, options: IMongoOptions<T> = {}): Promise<T[]> {
    const docs = await this.qb(query, options).find().exec();
    return this.transform(docs) as T[];
  }

  @MongoCatch
  async count(query: IMongoRequest<T>, options: IMongoOptions<T> = {}): Promise<number> {
    const processQuery = omit(query, ['select', 'page', 'limit', 'offset', 'sort']);
    const qb = this.qb(processQuery, options);
    return qb.countDocuments();
  }

  @MongoCatch
  async findOne(
    cond: ID | ObjectId | Ref<T, ID> | ICondition<T>,
    query: Omit<IMongoRequest<T>, 'condition'> = {},
    options: IMongoOptions<T> = {},
  ): Promise<T> {
    const condition: ICondition<T> = MongoHelper.parseSimpleCondition(cond);
    const mergeQuery = Object.assign({}, query, { condition });
    const doc = await this.qb(mergeQuery, options).findOne().exec();
    return this.transform(doc) as T;
  }

  @MongoCatch
  async create(body: IMongoUpdate<T>, options: IMongoOptions<T> = {}): Promise<T> {
    const transformBody: T = this.transform(body, { normalize: false }) as T;
    if (options.session) {
      const docs = await this.model.create([transformBody], options);
      if (docs?.length) return this.findOne(docs[0]?._id as ID, {}, options);
    }
    const doc = await this.model.create(transformBody);
    return this.findOne(doc._id as ID, {}, options);
  }

  @MongoCatch
  async update(
    cond: ID | ObjectId | Ref<T, ID> | ICondition<T>,
    body: IMongoUpdate<T>,
    options: IMongoOptions<T> = {},
  ): Promise<T> {
    const condition: ICondition<T> = MongoHelper.parseSimpleCondition(cond);
    const transformBody: T = this.transform(body, { normalize: false }) as T;
    const _options = Object.assign({}, UPDATE_OPTIONS, options);
    const doc = await this.qb({ condition }, _options).findOneAndUpdate(transformBody).exec();
    return this.transform(doc) as T;
  }

  @MongoCatch
  async updateMany(condition: ICondition<T>, body: IMongoUpdate<T>, options: IMongoOptions<T> = {}): Promise<T[]> {
    const transformBody: T = this.transform(body, { normalize: false }) as T;
    const _options = Object.assign({}, UPDATE_OPTIONS, options);
    await (this.qb({ condition }, _options) as any).updateMany(transformBody).exec();
    return this.find({ condition }, options);
  }

  @MongoCatch
  async delete(cond: ID | ObjectId | Ref<T, ID> | ICondition<T>, options: IMongoOptions<T> = {}): Promise<T> {
    const condition: ICondition<T> = MongoHelper.parseSimpleCondition(cond);
    const doc = await this.qb().destroyOne(condition, options).exec();
    return this.transform(doc) as T;
  }

  @MongoCatch
  async deleteMany(cond: ICondition<T>, options: IMongoOptions<T> = {}): Promise<T[]> {
    const docs = await this.qb({ condition: cond }, options).exec();
    await this.model.destroyMany(cond, options).exec();
    return this.transform(docs) as T[];
  }

  @MongoCatch
  async restore(cond: ID | ObjectId | Ref<T, ID> | ICondition<T>, options: IMongoOptions<T> = {}): Promise<T> {
    const condition: ICondition<T> = MongoHelper.parseSimpleCondition(cond);
    const doc = await this.qb().restore(condition, options).exec();
    return this.transform(doc) as T;
  }

  @MongoCatch
  async upsert(body: IMongoUpdate<T>, onConflicts?: KeyOf<T>[], options: IMongoOptions<T> = {}): Promise<T> {
    const fields = onConflicts?.length ? onConflicts : ['_id'];
    const transformBody: T = this.transform(body, { normalize: false }) as T;
    const condition: ICondition<T> = pick(body, fields) as ICondition<T>;
    const _options = Object.assign({}, UPSERT_OPTIONS, options);
    const doc = await this.qb({ condition }, _options).findOneAndUpdate(transformBody).exec();
    return this.transform(doc) as T;
  }

  @MongoCatch
  async bulkUpsert(docs: IMongoUpdate<T>[], onConflicts?: KeyOf<T>[], options: IMongoBulkOptions = {}): Promise<T[]> {
    const fields = onConflicts?.length ? onConflicts : ['_id'];
    const transformBody: T[] = this.transform(docs, { normalize: false }) as T[];

    const chunkSize = toInt(options?.chunkSize, 1000);
    const chunkItems = chunk(transformBody, chunkSize);
    const results: T[][] = [];

    for (const chunkItem of chunkItems) {
      const bulkDocs = chunkItem.map((doc: T) => {
        const updateDoc: IMongoUpdate<any> = {};
        Object.keys(doc).forEach(key => {
          if (!key.startsWith('$')) {
            if (!updateDoc.$set) updateDoc.$set = {};
            updateDoc.$set[key] = doc[key];
          }
        });
        return { updateOne: { filter: pick(doc, fields), update: updateDoc, upsert: true } };
      });
      await this.model.bulkWrite(bulkDocs as any, options as any);

      const filters = chunkItem.map((doc: T) => pick(doc, fields)).filter(filter => !isEmpty(filter));
      if (filters.length) {
        const items = await this.find({ condition: { $or: filters } as ICondition<T> }, options as IMongoOptions<T>);
        results.push(items);
      }
    }

    return results.flat();
  }

  @MongoCatch
  async aggregate<U = T>(pipeline: IMongoPipeline[], options: IMongoAggregateOptions<U> = {}): Promise<U[]> {
    const { autoTransform = true, transformFn } = options;
    const docs: any[] = await this.model.aggregate(pipeline, options).exec();
    if (transformFn) return options.transformFn(docs);
    if (autoTransform) return this.transform(docs) as any[];
    return docs;
  }
}
