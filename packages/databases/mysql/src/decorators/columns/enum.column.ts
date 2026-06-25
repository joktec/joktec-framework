import { IsEnum } from '@joktec/utils';
import { IMysqlColumnBuildOptions } from './column.type';

export function EnumColumn(options: IMysqlColumnBuildOptions): PropertyDecorator[] {
  return options.enum ? [IsEnum(options.enum)] : [];
}
