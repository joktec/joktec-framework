import { Constructor } from '@joktec/core';
import { Type, ValidateNested } from '@joktec/utils';
import { IMysqlColumnOptions } from './column.type';
import { resolveNestedType } from './column.util';

export function NestedColumn(options: IMysqlColumnOptions, designType: Constructor<any>): PropertyDecorator[] {
  if (!options.nested) return [];

  const nestedType = resolveNestedType(options.nested, designType);
  return [ValidateNested({ each: designType === Array }), Type(() => nestedType)];
}
