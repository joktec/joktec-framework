import { get, isDate, isNil, isObject } from 'lodash';
import { Entity, KeyOf, Listable } from '../base.dto';
import { IBaseRequest, ISort } from '../base.request';

export type CursorDirection = 'asc' | 'desc';
export type CursorValueType = 'boolean' | 'date' | 'null' | 'number' | 'objectId' | 'string';

export interface ICursorValue {
  type: CursorValueType;
  value: boolean | number | string | null;
}

export interface ICursorPayload {
  version: 1;
  keys: string[];
  directions: CursorDirection[];
  values: ICursorValue[];
}

export interface ICursorDefinition {
  keys: string[];
  directions: CursorDirection[];
  values?: unknown[];
}

export interface ICursorDefinitionOptions<T extends Entity> {
  defaultKeys: string[];
  tieBreakerKeys?: string[];
  defaultDirection?: CursorDirection;
  cursorKey?: Listable<KeyOf<T>>;
  cursor?: string;
  sort?: ISort<T>;
}

export class CursorPagination {
  private static readonly FIELD_PATTERN = /^[a-zA-Z0-9_.]+$/;

  static isCursorRequest<T extends Entity>(query: IBaseRequest<T>): boolean {
    return !isNil(query.cursor) || !isNil(query.cursorKey);
  }

  static getLimit(limit?: number, fallback: number = 20): number {
    const value = Number(limit || fallback);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
  }

  static resolve<T extends Entity>(options: ICursorDefinitionOptions<T>): ICursorDefinition {
    const payload = options.cursor ? this.decode(options.cursor) : null;
    if (payload) {
      return {
        keys: payload.keys,
        directions: payload.directions,
        values: payload.values.map(value => this.deserializeValue(value)),
      };
    }

    const keys = this.resolveKeys(options.cursorKey, options.defaultKeys, options.tieBreakerKeys);
    const directions = keys.map(key => this.getDirection(options.sort, key, options.defaultDirection || 'desc'));
    return { keys, directions };
  }

  static toSort<T extends Entity>(keys: string[], directions: CursorDirection[]): ISort<T> {
    return keys.reduce((acc, key, index) => {
      acc[key] = directions[index];
      return acc;
    }, {} as ISort<T>);
  }

  static slice<T extends Entity>(
    items: T[],
    limit: number,
    keys: string[],
    directions: CursorDirection[],
  ): { hasNextPage: boolean; items: T[]; nextCursor: string | null } {
    const hasNextPage = items.length > limit;
    const displayItems = items.slice(0, limit);
    const nextCursor = hasNextPage ? this.encode(displayItems[displayItems.length - 1], keys, directions) : null;
    return { hasNextPage, items: displayItems, nextCursor };
  }

  private static resolveKeys<T extends Entity>(
    cursorKey: Listable<KeyOf<T>>,
    defaultKeys: string[],
    tieBreakerKeys: string[] = [],
  ): string[] {
    const inputKeys = isNil(cursorKey) ? defaultKeys : this.toKeys(cursorKey);
    const keys = [...inputKeys];

    for (const tieBreakerKey of tieBreakerKeys) {
      if (!keys.includes(tieBreakerKey)) keys.push(tieBreakerKey);
    }

    const uniqueKeys = [...new Set(keys)].filter(key => !!key);
    uniqueKeys.forEach(key => this.assertSafeKey(key));
    return uniqueKeys.length ? uniqueKeys : defaultKeys;
  }

  private static toKeys<T extends Entity>(cursorKey: Listable<KeyOf<T>>): string[] {
    if (Array.isArray(cursorKey)) return cursorKey.flatMap(key => this.toKeys(key));
    return String(cursorKey)
      .split(',')
      .map(key => key.trim())
      .filter(key => !!key);
  }

  private static getDirection<T extends Entity>(
    sort: ISort<T>,
    key: string,
    defaultDirection: CursorDirection,
  ): CursorDirection {
    const value = this.flattenSort(sort)[key];
    if (value === 'asc' || value === 1 || value === '1') return 'asc';
    if (value === 'desc' || value === -1 || value === '-1') return 'desc';
    return defaultDirection;
  }

  private static flattenSort(sort: object = {}, prefix: string = ''): Record<string, any> {
    return Object.entries(sort || {}).reduce((acc, [key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      if (isObject(value) && !isDate(value)) Object.assign(acc, this.flattenSort(value, path));
      else acc[path] = value;
      return acc;
    }, {});
  }

  private static assertSafeKey(key: string): void {
    if (!this.FIELD_PATTERN.test(key)) throw new Error(`Invalid cursor key: ${key}`);
  }

  private static encode<T extends Entity>(item: T, keys: string[], directions: CursorDirection[]): string | null {
    if (!item) return null;

    const payload: ICursorPayload = {
      version: 1,
      keys,
      directions,
      values: keys.map(key => this.serializeValue(get(item, key))),
    };
    const json = JSON.stringify(payload);
    return Buffer.from(json, 'utf8').toString('base64url');
  }

  private static decode(cursor: string): ICursorPayload | null {
    if (!cursor) return null;

    const payload = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as ICursorPayload;
    if (
      payload.version !== 1 ||
      !payload.keys?.length ||
      payload.keys.length !== payload.values?.length ||
      payload.keys.length !== payload.directions?.length
    ) {
      throw new Error('Invalid cursor payload');
    }

    payload.keys.forEach(key => this.assertSafeKey(key));
    return payload;
  }

  private static serializeValue(value: any): ICursorValue {
    if (isNil(value)) return { type: 'null', value: null };
    if (value instanceof Date) return { type: 'date', value: value.toISOString() };
    if (typeof value === 'number') return { type: 'number', value };
    if (typeof value === 'boolean') return { type: 'boolean', value };
    if (value?._bsontype === 'ObjectId' || value?.constructor?.name === 'ObjectId') {
      return { type: 'objectId', value: String(value) };
    }
    return { type: 'string', value: String(value) };
  }

  private static deserializeValue(value: ICursorValue): unknown {
    if (value.type === 'date') return new Date(String(value.value));
    if (value.type === 'number') return Number(value.value);
    if (value.type === 'boolean') return Boolean(value.value);
    if (value.type === 'null') return null;
    return value.value;
  }
}
