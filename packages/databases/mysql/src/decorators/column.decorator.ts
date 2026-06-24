import { Column as TypeormColumn, ColumnType } from 'typeorm';
import {
  ColumnDecoratorArgs,
  IMysqlColumnOptions,
  IMysqlPrimaryColumnOptions,
  PrimaryColumnStrategy,
  applyPropertyDecorators,
  buildColumnDecorators,
  buildPrimaryDecorator,
  cloneColumnOptions,
  parseColumnArgs,
  toTypeormOptions,
} from './columns';

export {
  ColumnDecoratorArgs,
  IMysqlColumnOptions,
  IMysqlPrimaryColumnOptions,
  PrimaryColumnStrategy,
  RequiredOption,
} from './columns';

/**
 * Schema-first column wrapper that combines TypeORM, validation, transform, and Swagger metadata.
 */
export function Column(): PropertyDecorator;
export function Column(options: IMysqlColumnOptions): PropertyDecorator;
export function Column(type: ColumnType, options?: IMysqlColumnOptions): PropertyDecorator;
export function Column(...args: ColumnDecoratorArgs): PropertyDecorator {
  const { type, options } = parseColumnArgs(args);
  return (target: object, propertyKey: string | symbol) => {
    const designType = Reflect.getMetadata('design:type', target, propertyKey);
    const typeormOptions = toTypeormOptions(options);
    const typeormDecorator = type ? (TypeormColumn as any)(type, typeormOptions) : TypeormColumn(typeormOptions);

    applyPropertyDecorators(target, propertyKey, [typeormDecorator, ...buildColumnDecorators(options, designType)]);
  };
}

/**
 * Primary-key wrapper with support for TypeORM generated strategies and framework uuidv7 ids.
 */
export function PrimaryColumn(): PropertyDecorator;
export function PrimaryColumn(strategy: PrimaryColumnStrategy, options?: IMysqlPrimaryColumnOptions): PropertyDecorator;
export function PrimaryColumn(options: IMysqlPrimaryColumnOptions): PropertyDecorator;
export function PrimaryColumn(
  strategyOrOptions: PrimaryColumnStrategy | IMysqlPrimaryColumnOptions = 'increment',
  options: IMysqlPrimaryColumnOptions = {},
): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const designType = Reflect.getMetadata('design:type', target, propertyKey);
    const strategy = typeof strategyOrOptions === 'string' ? strategyOrOptions : 'increment';
    const primaryOptions = cloneColumnOptions(typeof strategyOrOptions === 'string' ? options : strategyOrOptions);
    const primaryDecorator = buildPrimaryDecorator(strategy, primaryOptions, target, propertyKey);

    applyPropertyDecorators(target, propertyKey, [
      primaryDecorator,
      ...buildColumnDecorators(
        {
          ...primaryOptions,
          nullable: false,
          required: primaryOptions.required ?? false,
          swagger: { readOnly: true, ...primaryOptions.swagger },
        },
        designType,
      ),
    ]);
  };
}

export const PrimaryGeneratedColumn = PrimaryColumn;
