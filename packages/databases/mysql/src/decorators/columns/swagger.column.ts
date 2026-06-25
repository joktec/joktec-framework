import { ApiPropertyOptions, Constructor } from '@joktec/core';
import { IMysqlColumnBuildOptions } from './column.type';
import { enumValues, getLengthValue, isArrayColumn, resolveNestedType } from './column.util';

export function buildSwaggerOptions(
  options: IMysqlColumnBuildOptions,
  designType: Constructor<any>,
  required: boolean,
): ApiPropertyOptions {
  const swaggerType = options.nested ? resolveNestedType(options.nested, designType) : designType;
  const swaggerOptions: ApiPropertyOptions = {
    type: swaggerType,
    required,
    nullable: options.nullable === true,
  };

  const length = getLengthValue(options.length);
  const minLength = options.minLength ?? options.minlength;
  const maxLength = options.maxLength ?? options.maxlength ?? length;

  if (options.example !== undefined) swaggerOptions.example = options.example;
  if (options.default !== undefined) swaggerOptions.default = options.default;
  if (options.comment) swaggerOptions.description = options.comment;
  if (options.deprecated !== undefined) swaggerOptions.deprecated = options.deprecated;
  if (options.immutable !== undefined) swaggerOptions.readOnly = options.immutable;
  else if (options.update === false) swaggerOptions.readOnly = true;
  if (options.enum) swaggerOptions.enum = enumValues(options.enum);
  if (minLength !== undefined) swaggerOptions.minLength = minLength;
  if (maxLength !== undefined) swaggerOptions.maxLength = maxLength;
  if (options.min !== undefined) swaggerOptions.minimum = options.min;
  if (options.max !== undefined) swaggerOptions.maximum = options.max;
  if (options.isEmail) swaggerOptions.format = 'email';
  if (options.isHexColor) swaggerOptions.format = 'hex-color';
  if (options.isUrl) swaggerOptions.format = 'uri';
  if (options.isUUID) swaggerOptions.format = 'uuid';
  if (isArrayColumn(options, designType)) swaggerOptions.isArray = true;

  return { ...swaggerOptions, ...options.swagger } as ApiPropertyOptions;
}
