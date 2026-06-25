import { ApiHideProperty, ApiProperty, Constructor } from '@joktec/core';
import { Exclude, Expose, Type } from '@joktec/utils';
import { IMysqlColumnBuildOptions } from './column.type';
import { resolveTransformType, shouldValidateNested } from './column.util';
import { buildSwaggerOptions } from './swagger.column';

export function TransformColumn(
  options: IMysqlColumnBuildOptions,
  designType: Constructor<any>,
  required: boolean,
): PropertyDecorator[] {
  const type = shouldValidateNested(options, designType) ? undefined : resolveTransformType(options, designType);
  const typeDecorators = type ? [Type(() => type)] : [];

  if (options.hidden) return [...typeDecorators, Exclude({ toPlainOnly: true }), ApiHideProperty()];

  const decorators: PropertyDecorator[] = [...typeDecorators];
  decorators.push(options.groups?.length ? Expose({ groups: options.groups }) : Expose());
  decorators.push(ApiProperty(buildSwaggerOptions(options, designType, required)));
  return decorators;
}
