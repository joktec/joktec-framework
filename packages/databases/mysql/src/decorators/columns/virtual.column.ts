import { ApiHideProperty, ApiProperty, ApiPropertyOptional, Constructor } from '@joktec/core';
import { Exclude, Expose, toArray } from '@joktec/utils';
import { IMysqlColumnBuildOptions } from './column.type';
import { resolveRequired } from './column.util';
import { buildSwaggerOptions } from './swagger.column';

/**
 * Builds metadata-only decorators for computed getters that are not persisted by TypeORM.
 */
export function buildVirtualColumnDecorators(
  options: IMysqlColumnBuildOptions,
  designType: Constructor<any>,
): PropertyDecorator[] {
  const virtualOptions: IMysqlColumnBuildOptions = { ...options, immutable: options.immutable ?? true };
  const decorators: PropertyDecorator[] = [...toArray(virtualOptions.decorators)];

  if (virtualOptions.hidden) {
    decorators.push(Exclude({ toPlainOnly: true }), ApiHideProperty());
    return decorators;
  }

  decorators.push(
    Expose(
      virtualOptions.expose ??
        (virtualOptions.groups?.length ? { groups: virtualOptions.groups, toPlainOnly: true } : { toPlainOnly: true }),
    ),
  );

  const required = virtualOptions.optional === true ? false : resolveRequired(virtualOptions).required;
  const swaggerOptions = buildSwaggerOptions(virtualOptions, designType, required);
  const swaggerDecorator = required ? ApiProperty : ApiPropertyOptional;
  decorators.push(swaggerDecorator(swaggerOptions));

  return decorators;
}
