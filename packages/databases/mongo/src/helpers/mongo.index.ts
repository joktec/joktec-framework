import { toArray } from '@joktec/utils';
import { index } from '@typegoose/typegoose';
import { IndexOptions } from '@typegoose/typegoose/lib/types';
import { get } from 'lodash';
import mongoose, { IndexDirection } from 'mongoose';
import { IIndexOptions, IMongoCollectionSchemaOptions } from '../decorators';

function withParanoidIndex(indexOption: IIndexOptions, paranoidKey?: string): IIndexOptions {
  const fields = { ...indexOption.fields };
  if (paranoidKey && !(paranoidKey in fields)) fields[paranoidKey] = 1;
  return { fields, options: indexOption.options ? { ...indexOption.options } : undefined };
}

function splitIndexFields(key: string, direction: IndexDirection = 1): mongoose.IndexDefinition {
  return key.split(',').reduce<mongoose.IndexDefinition>((obj, field) => {
    obj[field] = direction;
    return obj;
  }, {});
}

export function buildIndex(options: IMongoCollectionSchemaOptions): ClassDecorator[] {
  const deletedAt: string = get(options, 'paranoid.deletedAt.name', 'deletedAt');
  const injectIndex: boolean = get(options, 'paranoid.injectIndex', false);
  const paranoid: string | undefined = options?.paranoid && injectIndex ? deletedAt : undefined;

  const indexes: IIndexOptions[] = [];

  if (options?.index) {
    toArray(options.index).map(key => {
      indexes.push(withParanoidIndex({ fields: splitIndexFields(key), options: { background: true } }, paranoid));
    });
  }

  if (options?.unique) {
    toArray(options.unique).map(key => {
      const opts: IndexOptions = { unique: true, background: true, sparse: true };
      indexes.push(withParanoidIndex({ fields: splitIndexFields(key), options: opts }, paranoid));
    });
  }

  if (options?.textSearch) {
    indexes.push(
      withParanoidIndex(
        { fields: splitIndexFields(options.textSearch, 'text'), options: { background: true } },
        paranoid,
      ),
    );
  }

  if (options?.geoSearch) {
    const fields: mongoose.IndexDefinition = { [options.geoSearch]: '2dsphere' };
    indexes.push(withParanoidIndex({ fields, options: { background: true } }, paranoid));
  }

  if (options?.ttl) {
    const ttlIndexes: IIndexOptions[] = toArray(options.ttl).map(index => {
      return { fields: { [index.field]: 1 }, options: { expires: index.expiry } };
    });
    indexes.push(...ttlIndexes);
  }

  toArray(options?.customIndexes).map(idx => {
    indexes.push(withParanoidIndex({ fields: idx.fields, options: { background: true, ...idx.options } }, paranoid));
  });

  return indexes.map(idx => index(idx.fields, idx.options));
}
