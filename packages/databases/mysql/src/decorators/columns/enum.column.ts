import { IsEnum } from '@joktec/utils';
import { IMysqlColumnOptions } from './column.type';

export function EnumColumn(options: IMysqlColumnOptions): PropertyDecorator[] {
  return options.enum ? [IsEnum(options.enum)] : [];
}
