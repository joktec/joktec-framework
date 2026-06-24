import { IsNumber, Max, Min } from '@joktec/utils';
import { IMysqlColumnOptions } from './column.type';

export function NumberColumn(options: IMysqlColumnOptions): PropertyDecorator[] {
  const decorators: PropertyDecorator[] = [IsNumber()];

  if (options.unsigned) decorators.push(Min(0));
  if (options.min !== undefined) decorators.push(Min(options.min));
  if (options.max !== undefined) decorators.push(Max(options.max));

  return decorators;
}
