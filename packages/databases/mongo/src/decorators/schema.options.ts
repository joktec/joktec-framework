import { toPlural } from '@joktec/utils';
import { Severity } from '@typegoose/typegoose';
import { Func, ICustomOptions, IndexOptions } from '@typegoose/typegoose/lib/types';
import { snakeCase } from 'lodash';
import { IndexDirection, SchemaOptions } from 'mongoose';
import { ParanoidOptions, TransformOptions } from '../plugins';

type AllKeys<T> = T extends unknown ? keyof T : never;
type StrictUnionHelper<T, TAll> = T extends unknown
  ? T & Partial<Record<Exclude<AllKeys<TAll>, keyof T>, never>>
  : never;
type StrictUnion<T> = StrictUnionHelper<T, T>;

export interface IPlugin<TFunc extends Func = any, TParams = Parameters<TFunc>[1]> {
  /** Mongoose plugin function registered on the generated schema. */
  mongoosePlugin: TFunc;

  /** Plugin-specific options passed to Mongoose/Typegoose. */
  options?: TParams;
}

export interface IIndexOptions {
  /** Mongo index fields and directions. */
  fields: Record<string, IndexDirection>;

  /** Mongoose index options. */
  options?: IndexOptions;
}

export interface ITimeToLiveIndexOptions {
  /** Date path used by the TTL index. */
  field: string;

  /** TTL duration accepted by Mongoose `expires`. */
  expiry: number | string;
}

interface IMongoSchemaBaseOptions {
  /** Raw Typegoose custom options. */
  customOptions?: ICustomOptions;
}

export interface IMongoCollectionSchemaOptions extends IMongoSchemaBaseOptions {
  /** Collection schema mode. Omit for normal persisted collections. */
  kind?: 'collection';

  /** Mongo collection name. Defaults to snake-case plural class name. */
  collection?: string;

  /** Raw Mongoose schema options except `collection`, which is owned by this wrapper. */
  schemaOptions?: Omit<SchemaOptions, 'collection'>;

  /** Soft-delete plugin options. */
  paranoid?: boolean | ParanoidOptions;

  /** Response transform plugin options. */
  transform?: TransformOptions;

  /** Additional Mongoose plugins. */
  plugins?: IPlugin[];

  /** Simple ascending indexes. Comma-separated values create composite indexes. */
  index?: string | string[];

  /** Unique sparse indexes. Comma-separated values create composite indexes. */
  unique?: string | string[];

  /** TTL indexes. */
  ttl?: ITimeToLiveIndexOptions | ITimeToLiveIndexOptions[];

  /** Comma-separated text search fields. */
  textSearch?: string;

  /** Field path for 2dsphere index. */
  geoSearch?: string;

  /** Fully customized indexes. */
  customIndexes?: IIndexOptions[];
}

export interface IMongoEmbeddedSchemaOptions extends IMongoSchemaBaseOptions {
  /** Embedded object/subdocument mode; no collection or collection indexes are created. */
  kind: 'embedded';

  /** Raw Mongoose schema options except `collection`, which embedded schemas do not use. */
  schemaOptions?: Omit<SchemaOptions, 'collection'>;
}

export interface IMongoSubdocumentSchemaOptions extends IMongoSchemaBaseOptions {
  /** Embedded document mode with its own `_id` and timestamps, but without a Mongo collection. */
  kind: 'subdocument';

  /** Raw Mongoose schema options except `collection`, which subdocument schemas do not use. */
  schemaOptions?: Omit<SchemaOptions, 'collection'>;
}

export type IMongoSchemaOptions = StrictUnion<
  IMongoCollectionSchemaOptions | IMongoEmbeddedSchemaOptions | IMongoSubdocumentSchemaOptions
>;

/** Compatibility alias for existing imports. Prefer `IMongoSchemaOptions` in new code. */
export type ISchemaOptions = IMongoSchemaOptions;

export function normalizeSchemaOptions(className: string, options: IMongoSchemaOptions): IMongoSchemaOptions {
  if (options.kind === 'embedded') {
    return {
      ...options,
      schemaOptions: {
        _id: false,
        timestamps: false,
        strict: true,
        strictQuery: true,
        id: true,
        minimize: true,
        toObject: { virtuals: true },
        toJSON: { virtuals: true },
        ...options.schemaOptions,
      },
      customOptions: { allowMixed: Severity.WARN, ...options.customOptions },
    };
  }

  if (options.kind === 'subdocument') {
    return {
      ...options,
      schemaOptions: {
        _id: true,
        timestamps: true,
        strict: true,
        strictQuery: true,
        id: true,
        minimize: true,
        toObject: { virtuals: true },
        toJSON: { virtuals: true },
        ...options.schemaOptions,
      },
      customOptions: { allowMixed: Severity.WARN, ...options.customOptions },
    };
  }

  return {
    ...options,
    kind: options.kind ?? 'collection',
    collection: options.collection || snakeCase(toPlural(className)),
    schemaOptions: {
      strict: true,
      strictQuery: true,
      id: true,
      minimize: true,
      toObject: { virtuals: true },
      toJSON: { virtuals: true },
      ...options.schemaOptions,
    },
    customOptions: { allowMixed: Severity.WARN, ...options.customOptions },
  };
}

export function buildModelSchemaOptions(options: IMongoSchemaOptions): SchemaOptions {
  if (options.kind === 'embedded' || options.kind === 'subdocument')
    return { ...options.schemaOptions } as SchemaOptions;
  return { ...options.schemaOptions, collection: options.collection } as SchemaOptions;
}
