import { ApiPropertyOptions, Constructor } from '@joktec/core';
import { ColumnOptions, ColumnType } from 'typeorm';

export type RequiredOption = boolean | [boolean, string];
export type PrimaryColumnStrategy = 'increment' | 'uuid' | 'uuidv7' | 'rowid' | 'identity';

export interface IMysqlColumnOptions extends ColumnOptions {
  hidden?: boolean;
  nested?: boolean | Constructor<any>;
  example?: any;
  deprecated?: boolean;
  groups?: string[];
  decorators?: PropertyDecorator[];
  swagger?: ApiPropertyOptions;
  required?: RequiredOption;
  isEmail?: boolean;
  isPhone?: boolean;
  isHexColor?: boolean;
  isUrl?: boolean;
  minlength?: number;
  maxlength?: number;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
}

export interface IMysqlPrimaryColumnOptions extends Omit<IMysqlColumnOptions, 'primary' | 'nullable'> {
  nullable?: false;
}

export type ColumnDecoratorArgs = [IMysqlColumnOptions?] | [ColumnType, IMysqlColumnOptions?];

export interface RequiredResult {
  required: boolean;
  message?: string;
}
