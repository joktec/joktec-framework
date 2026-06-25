import { toArray } from '@joktec/utils';
import { plugin } from '@typegoose/typegoose';
import { get } from 'lodash';
import { IMongoCollectionSchemaOptions } from '../decorators';
import { ParanoidOptions, ParanoidPlugin, StrictReferencePlugin, TransformPlugin } from '../plugins';

/**
 * Assembles schema-level Mongoose plugins from the framework Schema decorator options.
 */
export function buildPlugin(options: IMongoCollectionSchemaOptions): ClassDecorator[] {
  const plugins = toArray(options.plugins).map(p => plugin(p.mongoosePlugin, p.options));

  const deletedAt: string = get(options, 'paranoid.deletedAt.name', 'deletedAt');
  const opts = { paranoidKey: options?.paranoid ? deletedAt : null };
  plugins.push(plugin(StrictReferencePlugin, opts));

  if (options.paranoid) {
    const paranoidOpts: ParanoidOptions = {
      deletedAt: { name: 'deletedAt', type: Date },
    };
    if (typeof options?.paranoid === 'object') {
      Object.assign(paranoidOpts, options.paranoid);
    }
    plugins.push(plugin(ParanoidPlugin, paranoidOpts));
  }

  plugins.push(plugin(TransformPlugin, options.transform));
  return plugins;
}
