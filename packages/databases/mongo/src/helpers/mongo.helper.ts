import { Dictionary, ICondition, IPopulate, IPopulateOption, ISort } from '@joktec/core';
import { toArray } from '@joktec/utils';
import { Ref } from '@typegoose/typegoose';
import { isArray, isBuffer, isDate, isEmpty, isNil, isNumber, isObject, isRegExp, isString, omit, pick } from 'lodash';
import { PopulateOptions, RefType, Schema } from 'mongoose';
import { IMongoRequest, MongoSchema, ObjectId, ObjectIdInput } from '../models';

export interface MongoFilterParseOptions {
  schema?: Schema;
  objectIdPaths?: string[] | Set<string>;
  legacyObjectIdCasting?: boolean;
  legacyRegexMode?: boolean;
}

/**
 * Translates framework request contracts into Mongoose query/filter fragments.
 */
export class MongoHelper {
  private static escapeRegex(value: unknown): string {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private static normalizePath(path: string): string {
    return path === 'id' ? '_id' : path.replace(/\.id$/g, '._id');
  }

  private static getObjectIdPaths(options?: MongoFilterParseOptions): Set<string> {
    const objectIdPaths = new Set<string>(['_id']);
    const configuredPaths = options?.objectIdPaths
      ? options.objectIdPaths instanceof Set
        ? Array.from(options.objectIdPaths)
        : options.objectIdPaths
      : [];

    configuredPaths.forEach(path => objectIdPaths.add(this.normalizePath(path)));

    if (options?.schema) {
      options.schema.eachPath((path: string, schemaType: any) => {
        const instance = schemaType.instance || schemaType.caster?.instance;
        if (instance === 'ObjectId') objectIdPaths.add(this.normalizePath(path));
      });
    }

    return objectIdPaths;
  }

  private static shouldCastObjectId(path: string, value: unknown, options?: MongoFilterParseOptions): boolean {
    if (ObjectId.isObjectId(value)) return false;
    if (!isString(value) || !ObjectId.valid(value)) return false;
    if (options?.legacyObjectIdCasting) return true;

    const normalizedPath = this.normalizePath(path);
    return this.getObjectIdPaths(options).has(normalizedPath);
  }

  private static castObjectIdValue(path: string, value: unknown, options?: MongoFilterParseOptions): unknown {
    if (ObjectId.isObjectId(value)) return ObjectId.create(value);
    if (this.shouldCastObjectId(path, value, options)) return ObjectId.create(String(value));
    if (isArray(value)) return value.map(item => this.castObjectIdValue(path, item, options));
    return value;
  }

  /**
   * Flattens nested filter objects while preserving root Mongo operators such as $or and $and.
   */
  static flatten(obj: Dictionary, omitKeys?: string[], options?: MongoFilterParseOptions): Dictionary {
    const result: Dictionary = {};

    function convert(obj: object) {
      const firstOperator = Object.keys(obj).find(key => String(key).startsWith('$'));
      if (!firstOperator) return obj;
      // if (firstOperator.startsWith('$$')) {
      //   const newKey = firstOperator.slice(0, 1);
      //   obj[newKey] = obj[firstOperator];
      //   delete obj[firstOperator];
      // }
      return obj;
    }

    function recurse(value: any, prefix = '') {
      if (ObjectId.isObjectId(value)) {
        result[prefix] = ObjectId.create(value);
        return;
      }

      if (MongoHelper.shouldCastObjectId(prefix, value, options)) {
        result[prefix] = ObjectId.create(value);
        return;
      }

      if (isArray(value)) {
        result[prefix] = value.map(v => {
          if (ObjectId.isObjectId(v)) return ObjectId.create(v);
          if (MongoHelper.shouldCastObjectId(prefix, v, options)) return ObjectId.create(v);
          return v;
        });
        return;
      }

      if (!value || isDate(value) || isRegExp(value) || !isObject(value)) {
        result[prefix] = value;
        return;
      }

      if (isObject(value) && omitKeys?.length) {
        value = omit(value, omitKeys);
      }

      if (Object.keys(value).some(key => String(key).startsWith('$'))) {
        result[prefix] = convert(value);
        return;
      }

      Object.keys(value).forEach(key => {
        if (!prefix && key === 'id') {
          value['_id'] = value['id'];
          delete value['id'];
          key = '_id';
        }
        const newKey = prefix ? `${prefix}.${key}` : key;
        recurse(value[key], newKey);
      });
    }

    const rootQuery = Object.keys(obj).filter(key => String(key).startsWith('$'));
    Object.assign(result, pick(obj, rootQuery));
    recurse(omit(obj, rootQuery));
    return result;
  }

  static parsePagination(query: IMongoRequest<any> = {}): { limit?: number; offset?: number } {
    const limit = typeof query.limit === 'number' && query.limit > 0 ? query.limit : undefined;
    const page = typeof query.page === 'number' && query.page > 0 ? query.page : undefined;
    const offset = typeof query.offset === 'number' && query.offset >= 0 ? query.offset : undefined;

    if (limit && page) return { limit, offset: (page - 1) * limit };
    if (limit) return { limit, offset: offset ?? 0 };
    return {};
  }

  static parseProjection(select: string | string[] | Record<string, number | boolean | object>): Record<string, 1 | 0> {
    if (isObject(select)) return this.flatten(select);
    return toArray(select, { split: ',' }).reduce((acc: Record<string, 1 | 0>, field) => {
      const trimField = field.trim();
      if (!trimField) return acc;
      if (trimField.startsWith('-')) acc[trimField.slice(1)] = 0;
      else acc[trimField] = 1;
      return acc;
    }, {});
  }

  static parseSort(sort: ISort<any>): Record<string, 1 | -1> {
    const flattenSort = MongoHelper.flatten(sort);
    return Object.entries(flattenSort).reduce((acc: Record<string, 1 | -1>, [field, order]) => {
      acc[field] = order === 'asc' || order === 1 || order === '1' ? 1 : -1;
      return acc;
    }, {});
  }

  /**
   * Converts framework comparison operators into Mongo-compatible filter syntax.
   */
  static parseFilter(
    condition: ICondition<any>,
    flat: boolean = true,
    options?: MongoFilterParseOptions,
  ): ICondition<any> {
    const flatObj = flat ? this.flatten(condition, undefined, options) : condition;
    const keys = Object.keys(flatObj);
    for (const key of keys) {
      if (isNil(flatObj[key])) {
        flatObj[key] = null;
        continue;
      }

      if (ObjectId.isObjectId(flatObj[key])) {
        flatObj[key] = ObjectId.create(flatObj[key]);
        continue;
      }

      if (this.shouldCastObjectId(key, flatObj[key], options)) {
        flatObj[key] = ObjectId.create(flatObj[key]);
        continue;
      }

      if (isDate(flatObj[key]) || isRegExp(flatObj[key]) || !isObject(flatObj[key])) {
        continue;
      }

      if (flatObj[key].hasOwnProperty('$like')) {
        const pattern = options?.legacyRegexMode
          ? String(flatObj[key]['$like'])
          : this.escapeRegex(flatObj[key]['$like']);
        flatObj[key]['$regex'] = new RegExp(pattern, 'i');
        delete flatObj[key]['$like'];
        continue;
      } else if (flatObj[key].hasOwnProperty('$begin')) {
        const pattern = options?.legacyRegexMode
          ? String(flatObj[key]['$begin'])
          : this.escapeRegex(flatObj[key]['$begin']);
        flatObj[key]['$regex'] = new RegExp(`^${pattern}`, 'i');
        delete flatObj[key]['$begin'];
        continue;
      } else if (flatObj[key].hasOwnProperty('$end')) {
        const pattern = options?.legacyRegexMode
          ? String(flatObj[key]['$end'])
          : this.escapeRegex(flatObj[key]['$end']);
        flatObj[key]['$regex'] = new RegExp(`${pattern}$`, 'i');
        delete flatObj[key]['$end'];
        continue;
      } else if (flatObj[key].hasOwnProperty('$nil')) {
        flatObj[key] = null;
        continue;
      } else if (flatObj[key].hasOwnProperty('$empty')) {
        flatObj[key] = '';
        continue;
      }

      if (Object.keys(flatObj[key]).some(operator => String(operator).startsWith('$'))) {
        for (const operator of Object.keys(flatObj[key])) {
          flatObj[key][operator] = this.castObjectIdValue(key, flatObj[key][operator], options);
        }
        continue;
      }

      flatObj[key] = this.parseFilter(flatObj[key], false, options);
    }

    return flatObj;
  }

  /**
   * Converts populate configuration into Mongoose populate options.
   */
  static parsePopulate<T extends MongoSchema>(populate: IPopulate<T> = {}): PopulateOptions[] {
    if (isNil(populate) || isEmpty(populate)) return [];
    return Object.entries(populate).map(([path, populate]) => {
      const populateOptions: PopulateOptions = { path, options: { lean: { virtuals: true } } };
      const options: IPopulateOption = populate === '*' ? {} : populate;

      if (options.select) populateOptions.select = options.select;
      if (options.model) populateOptions.model = options.model as any;
      if (options.populate) populateOptions.populate = this.parsePopulate(options.populate);
      if (options.match) populateOptions.match = options.match;

      return populateOptions;
    });
  }

  /**
   * Normalizes id-like values and object conditions into a Mongo filter.
   */
  static parseSimpleCondition<T extends MongoSchema, ID extends RefType = string>(
    cond: ID | ObjectId | Ref<T, ID> | ICondition<T>,
  ): ICondition<T> {
    const condition: ICondition<T> = {};
    switch (true) {
      case ObjectId.isObjectId(cond):
      case isString(cond) && ObjectId.valid(cond):
        Object.assign(condition, { _id: ObjectId.create(cond as ObjectIdInput) });
        break;

      case isString(cond):
      case isNumber(cond):
      case isBuffer(cond):
        Object.assign(condition, { _id: cond });
        break;

      case isObject(cond):
      case isArray(cond):
        Object.assign(condition, cond);
        break;

      default:
        Object.assign(condition, { _id: ObjectId.create(String(cond)) });
    }
    return condition;
  }
}
