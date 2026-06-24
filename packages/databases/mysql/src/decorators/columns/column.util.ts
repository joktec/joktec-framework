import { Constructor, applyDecorators } from '@joktec/core';
import { ColumnOptions, ColumnType } from 'typeorm';
import { ColumnDecoratorArgs, IMysqlColumnOptions, RequiredResult } from './column.type';

const MYSQL_COLUMN_OPTION_KEYS = new Set([
  'hidden',
  'nested',
  'example',
  'deprecated',
  'groups',
  'decorators',
  'swagger',
  'required',
  'isEmail',
  'isPhone',
  'isHexColor',
  'isUrl',
  'minlength',
  'maxlength',
  'minLength',
  'maxLength',
  'min',
  'max',
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

export const toTypeormOptions = <T extends IMysqlColumnOptions>(options: T): ColumnOptions => {
  const typeormOptions: Record<string, any> = {};
  Object.entries(options).forEach(([key, value]) => {
    if (!MYSQL_COLUMN_OPTION_KEYS.has(key)) typeormOptions[key] = value;
  });
  return typeormOptions as ColumnOptions;
};

export const parseColumnArgs = (args: ColumnDecoratorArgs): { type?: ColumnType; options: IMysqlColumnOptions } => {
  if (args.length === 0) return { options: {} };
  const [first, second] = args;
  if (typeof first === 'string' || typeof first === 'function') {
    return { type: first as ColumnType, options: cloneColumnOptions(second || {}) };
  }
  return { options: cloneColumnOptions((first || {}) as IMysqlColumnOptions) };
};

export const resolveRequired = (options: IMysqlColumnOptions): RequiredResult => {
  if (Array.isArray(options.required)) return { required: options.required[0], message: options.required[1] };
  if (typeof options.required === 'boolean') return { required: options.required };
  return { required: options.nullable !== true };
};

export const getLengthValue = (value: string | number | undefined): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
};

export const enumValues = (enumLike: IMysqlColumnOptions['enum']): any[] | undefined => {
  if (!enumLike) return undefined;
  if (Array.isArray(enumLike)) return enumLike;
  return Object.values(enumLike);
};

export const resolveNestedType = (
  nested: IMysqlColumnOptions['nested'],
  designType: Constructor<any>,
): Constructor<any> => {
  return typeof nested === 'function' ? nested : designType;
};
