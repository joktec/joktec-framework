import {
  applyPropDecorators,
  buildPropContext,
  clonePropOptions,
  type IMongoPropOptions,
  type MongoFieldDecorator,
  resolvePropTypeInfo,
} from './props';

/**
 * Combines Typegoose, class-validator, class-transformer, and Swagger metadata for schema properties.
 */
export const Prop = <T = any>(opts: IMongoPropOptions<T> = {}): MongoFieldDecorator => {
  return (target: object, propertyKey: string | symbol) => {
    const options = clonePropOptions(opts);
    const reflectedType =
      Reflect.getMetadata('design:returntype', target, propertyKey) ||
      Reflect.getMetadata('design:type', target, propertyKey);
    const typeInfo = resolvePropTypeInfo(options, reflectedType);
    const context = buildPropContext(options, typeInfo);

    applyPropDecorators(context, target, propertyKey);
  };
};
