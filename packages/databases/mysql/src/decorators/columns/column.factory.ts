import { Constructor } from '@joktec/core';
import { IsNotEmpty, IsOptional } from '@joktec/utils';
import { ArrayColumn } from './array.column';
import { BoolColumn } from './bool.column';
import { IMysqlColumnBuildOptions } from './column.type';
import { isArrayColumn, resolveRequired } from './column.util';
import { DateColumn } from './date.column';
import { EnumColumn } from './enum.column';
import { NestedColumn } from './nested.column';
import { NumberColumn } from './number.column';
import { ObjectColumn } from './object.column';
import { StringColumn } from './string.column';
import { TransformColumn } from './transform.column';

/**
 * Builds validation decorators inferred from the TypeScript design type and column options.
 */
export function buildValidationDecorators(
  options: IMysqlColumnBuildOptions,
  designType: Constructor<any>,
): PropertyDecorator[] {
  const decorators: PropertyDecorator[] = [...(options.decorators || [])];
  const required = resolveRequired(options);

  if (required.required) decorators.push(IsNotEmpty(required.message ? { message: required.message } : undefined));
  else decorators.push(IsOptional());

  if (designType === String) decorators.push(...StringColumn(options));
  if (designType === Number) decorators.push(...NumberColumn(options));
  if (designType === Boolean) decorators.push(...BoolColumn());
  if (designType === Date) decorators.push(...DateColumn());
  if (isArrayColumn(options, designType)) decorators.push(...ArrayColumn(options));
  decorators.push(...ObjectColumn(options, designType));
  decorators.push(...EnumColumn(options));
  decorators.push(...NestedColumn(options, designType));

  return decorators;
}

/**
 * Builds every non-TypeORM property decorator applied by the public Column wrappers.
 */
export function buildColumnDecorators(
  options: IMysqlColumnBuildOptions,
  designType: Constructor<any>,
): PropertyDecorator[] {
  const { required } = resolveRequired(options);
  return [...buildValidationDecorators(options, designType), ...TransformColumn(options, designType, required)];
}
