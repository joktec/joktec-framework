import { IsEmail, IsHexColor, IsMobilePhone, IsString, IsUrl, IsUUID, MaxLength, MinLength } from '@joktec/utils';
import { IMysqlColumnBuildOptions } from './column.type';
import { getLengthValue } from './column.util';

export function StringColumn(options: IMysqlColumnBuildOptions): PropertyDecorator[] {
  const validationOptions = options.each ? { each: true } : undefined;
  const decorators: PropertyDecorator[] = [IsString(validationOptions)];
  const length = getLengthValue(options.length);
  const minLength = options.minLength ?? options.minlength;
  const maxLength = options.maxLength ?? options.maxlength ?? length;

  if (minLength !== undefined) decorators.push(MinLength(minLength, validationOptions));
  if (maxLength !== undefined) decorators.push(MaxLength(maxLength, validationOptions));
  if (options.isEmail) decorators.push(IsEmail(undefined, validationOptions));
  if (options.isPhone) decorators.push(IsMobilePhone(undefined, undefined, validationOptions));
  if (options.isHexColor) decorators.push(IsHexColor(validationOptions));
  if (options.isUrl) decorators.push(IsUrl(undefined, validationOptions));
  if (options.isUUID) decorators.push(IsUUID(undefined, validationOptions));

  return decorators;
}
