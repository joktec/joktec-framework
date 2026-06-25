import { Constructor } from '@joktec/core';
import { Type, ValidateNested } from '@joktec/utils';
import { IMysqlColumnBuildOptions } from './column.type';
import { isArrayColumn, resolveNestedType, shouldValidateNested } from './column.util';

export function NestedColumn(options: IMysqlColumnBuildOptions, designType: Constructor<any>): PropertyDecorator[] {
  if (!shouldValidateNested(options, designType)) return [];

  const nestedType = resolveNestedType(options.nested, designType);
  return [ValidateNested({ each: isArrayColumn(options, designType) }), Type(() => nestedType)];
}
