import { IsEmail, IsHexColor, IsMobilePhone, IsString, IsUrl, MaxLength, MinLength } from '@joktec/utils';
import { IMysqlColumnOptions } from './column.type';
import { getLengthValue } from './column.util';

export function StringColumn(options: IMysqlColumnOptions): PropertyDecorator[] {
  const decorators: PropertyDecorator[] = [IsString()];
  const length = getLengthValue(options.length);
  const minLength = options.minLength ?? options.minlength;
  const maxLength = options.maxLength ?? options.maxlength ?? length;

  if (minLength !== undefined) decorators.push(MinLength(minLength));
  if (maxLength !== undefined) decorators.push(MaxLength(maxLength));
  if (options.isEmail) decorators.push(IsEmail());
  if (options.isPhone) decorators.push(IsMobilePhone());
  if (options.isHexColor) decorators.push(IsHexColor());
  if (options.isUrl) decorators.push(IsUrl());

  return decorators;
}
