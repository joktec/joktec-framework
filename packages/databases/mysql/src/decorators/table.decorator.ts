import { applyDecorators, KeyOf, SetMetadata } from '@joktec/core';
import { Entity, EntityOptions, Index, IndexOptions } from 'typeorm';
import { MysqlModel } from '../models';

type KeyTypeOf<T, TYPE> = { [K in keyof T]: T[K] extends TYPE | undefined ? K : never }[keyof T];

export interface IIndexOptions<T extends MysqlModel = any> extends IndexOptions {
  name?: string;
  fields: KeyOf<T>[];
}

export interface ITableOptions<T extends MysqlModel = any> extends EntityOptions {
  keywords?: KeyTypeOf<T, string>[];

  index?: KeyOf<T>[];
  unique?: KeyOf<T>[];
  textSearch?: KeyTypeOf<T, string>[];
  customIndexes?: IIndexOptions<T>[];
}

/**
 * Entity wrapper that keeps table metadata, indexes, and searchable fields close to the entity class.
 */
export const Tables = <T extends MysqlModel = any>(options: ITableOptions<T> = {}): ClassDecorator => {
  return (target: any) => {
    const className = target.name;
    const { index, unique, textSearch, customIndexes, keywords: _keywords, ...entityOptions } = options;

    const decorators: ClassDecorator[] = [
      SetMetadata<string, ITableOptions<T>>(className, { ...options }),
      Entity(entityOptions),
    ];

    if (index?.length) {
      decorators.push(Index(index.map(String)));
    }

    if (unique?.length) {
      decorators.push(Index(unique.map(String), { unique: true }));
    }

    if (textSearch?.length) {
      decorators.push(Index(textSearch.map(String), { fulltext: true }));
    }

    if (customIndexes?.length) {
      customIndexes.map((idxOpts: IIndexOptions) => {
        const { fields, ...indexOptions } = idxOpts;
        const safeFields = fields.map(String);
        if (indexOptions.name) decorators.push(Index(indexOptions.name, safeFields, indexOptions));
        else decorators.push(Index(safeFields, indexOptions));
      });
    }

    applyDecorators(...decorators)(target);
  };
};
