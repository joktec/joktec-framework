import { Constructor, applyDecorators } from '@joktec/core';
import { ColumnOptions, ColumnType } from 'typeorm';
import { MysqlException } from '../../mysql.exception';
import { ColumnDecoratorArgs, IMysqlColumnBuildOptions, IMysqlColumnOptions, RequiredResult } from './column.type';

const MYSQL_COLUMN_OPTION_KEYS = new Set([
  'virtual',
  'kind',
  'mode',
  'hidden',
  'optional',
  'expose',
  'nested',
  'each',
  'example',
  'deprecated',
  'immutable',
  'groups',
  'decorators',
  'swagger',
  'required',
  'isEmail',
  'isPhone',
  'isHexColor',
  'isUrl',
  'isInt',
  'isUUID',
  'isObject',
  'minlength',
  'maxlength',
  'minLength',
  'maxLength',
  'min',
  'max',
  'columnType',
  'index',
  'check',
  'relation',
  'relationOptions',
  'inverseSide',
  'joinColumn',
  'joinTable',
  'relationId',
  'relationIdAlias',
  'relationIdQuery',
  'tree',
  'cascade',
  'onDelete',
]);

export const applyPropertyDecorators = (
  target: object,
  propertyKey: string | symbol,
  decorators: PropertyDecorator[],
): void => {
  applyDecorators(...decorators)(target, propertyKey);
};

export const cloneColumnOptions = <T extends IMysqlColumnOptions>(options: T = {} as T): T => {
  return { ...options, swagger: options.swagger ? { ...options.swagger } : undefined };
};

export const toTypeormOptions = <T extends Record<string, any>>(options: T): ColumnOptions => {
  const typeormOptions: Record<string, any> = {};
  Object.entries(options).forEach(([key, value]) => {
    if (!MYSQL_COLUMN_OPTION_KEYS.has(key)) typeormOptions[key] = value;
  });
  return typeormOptions as ColumnOptions;
};

export const normalizeNormalColumnOptions = (
  type: ColumnType | undefined,
  options: IMysqlColumnBuildOptions,
): IMysqlColumnBuildOptions => {
  if (!options.enum || type || options.type || options.columnType) return options;
  return { ...options, type: 'enum' };
};

export const parseColumnArgs = (args: ColumnDecoratorArgs): { type?: ColumnType; options: IMysqlColumnOptions } => {
  if (args.length === 0) return { options: {} };
  const [first, second] = args;
  if (typeof first === 'string' || typeof first === 'function') {
    const type = first as ColumnType;
    const options = { ...cloneColumnOptions(second || {}), columnType: type } as unknown as IMysqlColumnOptions;
    assertNoMongoColumn(options);
    return { type, options };
  }
  const options = cloneColumnOptions((first || {}) as IMysqlColumnOptions);
  assertNoMongoColumn(options);
  return { options };
};

export const resolveRequired = (
  options: Pick<IMysqlColumnOptions, 'optional' | 'required' | 'nullable'>,
): RequiredResult => {
  if (options.optional) return { required: false };
  if (Array.isArray(options.required)) return { required: options.required[0], message: options.required[1] };
  if (typeof options.required === 'boolean') return { required: options.required };
  return { required: options.nullable !== true };
};

export const getLengthValue = (value: string | number | undefined): number | undefined => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
};

export const enumValues = (enumLike: ColumnOptions['enum']): any[] | undefined => {
  if (!enumLike) return undefined;
  if (Array.isArray(enumLike)) return enumLike;
  return Object.values(enumLike);
};

export const resolveNestedType = (
  nested: IMysqlColumnBuildOptions['nested'],
  designType: Constructor<any>,
): Constructor<any> => {
  if (typeof nested === 'function') return nested;
  return designType;
};

const AUTO_TRANSFORM_TYPES = new Set<Constructor<any>>([String, Number, Boolean, Date]);
const NON_CLASS_TYPES = new Set<Constructor<any>>([String, Number, Boolean, Date, Array, Object]);

export const isCustomClass = (designType: Constructor<any>): boolean => {
  return typeof designType === 'function' && !NON_CLASS_TYPES.has(designType);
};

export const resolveTransformType = (
  options: IMysqlColumnBuildOptions,
  designType: Constructor<any>,
): Constructor<any> | undefined => {
  if (AUTO_TRANSFORM_TYPES.has(designType)) return designType;
  if (isJsonColumn(options) && isCustomClass(designType)) return designType;
  return undefined;
};

export const shouldValidateNested = (options: IMysqlColumnBuildOptions, designType: Constructor<any>): boolean => {
  if (options.nested) return true;
  if (!isJsonColumn(options)) return false;
  return isCustomClass(designType);
};

export const isArrayColumn = (options: IMysqlColumnBuildOptions, designType?: Constructor<any>): boolean => {
  return designType === Array || options.array === true || options.columnType === 'simple-array';
};

export const isJsonColumn = (options: IMysqlColumnBuildOptions): boolean => {
  const type = options.type || options.columnType;
  return type === 'simple-json' || type === 'json' || type === 'jsonb';
};

const INTEGER_COLUMN_TYPES = new Set(['int', 'integer', 'tinyint', 'smallint', 'mediumint', 'bigint']);

export const isIntegerColumn = (options: IMysqlColumnBuildOptions): boolean => {
  const type = options.type || options.columnType;
  return options.isInt === true || INTEGER_COLUMN_TYPES.has(String(type));
};

export const assertNoMongoColumn = (options: IMysqlColumnOptions): void => {
  const rawOptions = options as Record<string, any>;
  const type = String(rawOptions.type || rawOptions.columnType || '').toLowerCase();
  if (rawOptions.isObjectId || type === 'objectid' || type === 'object-id') {
    throw new MysqlException('MYSQL_MONGO_COLUMN_UNSUPPORTED', {
      reason: '@joktec/mysql does not support Mongo ObjectId columns. Use @joktec/mongo for Mongo schemas.',
    });
  }
};
