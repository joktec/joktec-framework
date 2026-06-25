import { IsInt, IsNumber, Max, Min } from '@joktec/utils';
import { IMysqlColumnBuildOptions } from './column.type';
import { isIntegerColumn } from './column.util';

export function NumberColumn(options: IMysqlColumnBuildOptions): PropertyDecorator[] {
  const decorators: PropertyDecorator[] = [isIntegerColumn(options) ? IsInt() : IsNumber()];

  if (options.unsigned) decorators.push(Min(0));
  if (options.min !== undefined) decorators.push(Min(options.min));
  if (options.max !== undefined) decorators.push(Max(options.max));

  return decorators;
}
