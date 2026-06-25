import { ApiPropertyOptions, Field } from '@joktec/core';
import {
  CreateDateColumn as TypeormCreateDateColumn,
  DeleteDateColumn as TypeormDeleteDateColumn,
  UpdateDateColumn as TypeormUpdateDateColumn,
  VersionColumn as TypeormVersionColumn,
} from 'typeorm';
import { buildColumnDecorators } from './column.factory';
import { IMysqlTimestampColumnOptions, IMysqlVersionColumnOptions } from './column.type';
import { toTypeormOptions } from './column.util';

type TimestampColumnMode = 'create' | 'update' | 'delete';
type TimestampColumnFactory = (options?: any) => PropertyDecorator;

const buildTimestampOptions = (
  mode: TimestampColumnMode,
  options: IMysqlTimestampColumnOptions = {},
): IMysqlTimestampColumnOptions => {
  return {
    ...options,
    immutable: options.immutable ?? true,
    nullable: options.nullable ?? (mode === 'delete' ? true : undefined),
    required: options.required ?? false,
    swagger: { type: Date, required: false, ...options.swagger } as ApiPropertyOptions,
  };
};

const getTimestampDecorator = (mode: TimestampColumnMode): TimestampColumnFactory => {
  if (mode === 'create') return TypeormCreateDateColumn;
  if (mode === 'update') return TypeormUpdateDateColumn;
  return TypeormDeleteDateColumn;
};

/**
 * Builds the TypeORM, validation, transform, Swagger, and GraphQL decorators for timestamp columns.
 */
function buildTimestampColumnDecorators(
  mode: TimestampColumnMode,
  options: IMysqlTimestampColumnOptions = {},
): PropertyDecorator[] {
  const timestampOptions = buildTimestampOptions(mode, options);
  const typeormDecorator = getTimestampDecorator(mode);

  return [
    typeormDecorator(toTypeormOptions(timestampOptions)),
    Field(() => Date, { nullable: timestampOptions.nullable !== false }),
    ...buildColumnDecorators(timestampOptions, Date),
  ];
}

export function buildCreateDateColumnDecorators(options: IMysqlTimestampColumnOptions = {}): PropertyDecorator[] {
  return buildTimestampColumnDecorators('create', options);
}

export function buildUpdateDateColumnDecorators(options: IMysqlTimestampColumnOptions = {}): PropertyDecorator[] {
  return buildTimestampColumnDecorators('update', options);
}

export function buildDeleteDateColumnDecorators(options: IMysqlTimestampColumnOptions = {}): PropertyDecorator[] {
  return buildTimestampColumnDecorators('delete', options);
}

export function buildVersionColumnDecorators(options: IMysqlVersionColumnOptions = {}): PropertyDecorator[] {
  const versionOptions: IMysqlVersionColumnOptions = {
    ...options,
    required: options.required ?? false,
    isInt: options.isInt ?? true,
    immutable: options.immutable ?? true,
    swagger: { type: Number, required: false, ...options.swagger } as ApiPropertyOptions,
  };

  return [TypeormVersionColumn(toTypeormOptions(versionOptions)), ...buildColumnDecorators(versionOptions, Number)];
}
