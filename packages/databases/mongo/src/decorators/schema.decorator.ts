import { applyDecorators, SetMetadata } from '@joktec/core';
import { modelOptions } from '@typegoose/typegoose';
import { buildIndex, buildPlugin, buildQueryMethod } from '../helpers';
import { buildModelSchemaOptions, IMongoSchemaOptions, normalizeSchemaOptions } from './schema.options';
export type {
  IIndexOptions,
  IMongoCollectionSchemaOptions,
  IMongoEmbeddedSchemaOptions,
  IMongoSchemaOptions,
  IMongoSubdocumentSchemaOptions,
  IPlugin,
  ISchemaOptions,
  ITimeToLiveIndexOptions,
} from './schema.options';

/**
 * Schema-first wrapper around Typegoose model options, plugins, query helpers, and indexes.
 */
export const Schema = (options: IMongoSchemaOptions = {}): ClassDecorator => {
  return (target: any) => {
    const className = target.name;
    const opts = normalizeSchemaOptions(className, options);
    const decorators: ClassDecorator[] = [
      SetMetadata<string, IMongoSchemaOptions>(className, opts),
      modelOptions({
        schemaOptions: buildModelSchemaOptions(opts) as any,
        options: { ...opts.customOptions },
      }),
    ];

    if (opts.kind === 'collection') {
      decorators.push(...buildQueryMethod(), ...buildPlugin(opts), ...buildIndex(opts));
    }

    applyDecorators(...decorators)(target);
  };
};
