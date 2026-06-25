import { Constructor } from '@joktec/core';
import { IsObject } from '@joktec/utils';
import { IMysqlColumnBuildOptions } from './column.type';
import { isArrayColumn, isJsonColumn } from './column.util';

/**
 * Adds object validation for JSON/simple-json columns or explicit object fields.
 */
export function ObjectColumn(options: IMysqlColumnBuildOptions, designType: Constructor<any>): PropertyDecorator[] {
  if (isArrayColumn(options, designType)) return [];
  if (!options.isObject && !isJsonColumn(options)) return [];
  return [IsObject()];
}
