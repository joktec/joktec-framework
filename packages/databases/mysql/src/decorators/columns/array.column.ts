import { IsArray } from '@joktec/utils';
import { IMysqlColumnBuildOptions } from './column.type';
import { StringColumn } from './string.column';

export function ArrayColumn(options: IMysqlColumnBuildOptions): PropertyDecorator[] {
  const decorators: PropertyDecorator[] = [IsArray()];

  if (options.columnType === 'simple-array') {
    decorators.push(...StringColumn({ ...options, each: true }));
  }

  return decorators;
}
