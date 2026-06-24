import { ApiHideProperty, ApiProperty, Constructor } from '@joktec/core';
import { Exclude, Expose } from '@joktec/utils';
import { IMysqlColumnOptions } from './column.type';
import { buildSwaggerOptions } from './swagger.column';

export function TransformColumn(
  options: IMysqlColumnOptions,
  designType: Constructor<any>,
  required: boolean,
): PropertyDecorator[] {
  if (options.hidden) return [Exclude({ toPlainOnly: true }), ApiHideProperty()];

  const decorators: PropertyDecorator[] = [];
  decorators.push(options.groups?.length ? Expose({ groups: options.groups }) : Expose());
  decorators.push(ApiProperty(buildSwaggerOptions(options, designType, required)));
  return decorators;
}
