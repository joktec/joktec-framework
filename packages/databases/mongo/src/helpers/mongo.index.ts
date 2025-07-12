import { toArray } from '@joktec/utils';
import { index } from '@typegoose/typegoose';
import { IndexOptions } from '@typegoose/typegoose/lib/types';
import { get } from 'lodash';
import mongoose from 'mongoose';
import { IIndexOptions, ISchemaOptions } from '../decorators';

function injectParanoid(indexOption: IIndexOptions, paranoidKey: string = 'deletedAt') {
  if (!(paranoidKey in indexOption.fields)) {
    indexOption.fields[paranoidKey] = 1;
  }
}

export function buildIndex(options: ISchemaOptions): ClassDecorator[] {
  const deletedAt: string = get(options, 'paranoid.deletedAt.name', 'deletedAt');
  const injectIndex: boolean = get(options, 'paranoid.injectIndex', false);
  const paranoid: string = options?.paranoid && injectIndex ? deletedAt : null;

  const indexes: IIndexOptions[] = [];

  if (options?.index) {
    toArray(options.index).map(key => {
      const fields: mongoose.IndexDefinition = key.split(',').reduce((obj, curr) => {
        obj[curr] = 1;
        return obj;
      }, {});

      const idx: IIndexOptions = { fields, options: { background: true } };
      if (paranoid) injectParanoid(idx, paranoid);
      indexes.push(idx);
    });
  }

  if (options?.unique) {
    toArray(options.unique).map(key => {
      const opts: IndexOptions = { unique: true, background: true, sparse: true };
      const fields: mongoose.IndexDefinition = {};
      key.split(',').map(field => {
        fields[field] = 1;
      });

      const idx: IIndexOptions = { fields, options: opts };
      if (paranoid) injectParanoid(idx, paranoid);
      indexes.push(idx);
    });
  }

  if (options?.textSearch) {
    const fields: mongoose.IndexDefinition = options.textSearch.split(',').reduce((obj, path) => {
      obj[path] = 'text';
      return obj;
    }, {});

    const idx: IIndexOptions = { fields, options: { background: true } };
    if (paranoid) injectParanoid(idx, paranoid);
    indexes.push(idx);
  }

  if (options?.geoSearch) {
    const fields: mongoose.IndexDefinition = { [options.geoSearch]: '2dsphere' };
    const idx: IIndexOptions = { fields, options: { background: true } };
    if (paranoid) injectParanoid(idx, paranoid);
    indexes.push(idx);
  }

  if (options?.ttl) {
    const ttlIndexes: IIndexOptions[] = toArray(options.ttl).map(index => {
      return { fields: { [index.field]: 1 }, options: { expires: index.expiry } };
    });
    indexes.push(...ttlIndexes);
  }

  toArray(options?.customIndexes).map(idx => {
    idx.options = { background: true, ...idx.options };
    if (paranoid) injectParanoid(idx, paranoid);
    indexes.push(idx);
  });

  return indexes.map(idx => index(idx.fields, idx.options));
}
