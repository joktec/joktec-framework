import { applyDecorators, KeyOf, SetMetadata } from '@joktec/core';
import {
  Check,
  ChildEntity,
  Entity,
  EntityOptions,
  Index,
  IndexOptions,
  TableInheritance,
  Tree,
  ViewEntity,
} from 'typeorm';
import { ViewEntityOptions } from 'typeorm/decorator/options/ViewEntityOptions';
import { MysqlModel } from '../models';

type KeyTypeOf<T, TYPE> = { [K in keyof T]: T[K] extends TYPE | undefined ? K : never }[keyof T];
type MysqlTreeType = Parameters<typeof Tree>[0];
type MysqlTreeOptions = Parameters<typeof Tree>[1];
type MysqlInheritanceOptions = Parameters<typeof TableInheritance>[0];
type AllKeys<T> = T extends unknown ? keyof T : never;
type StrictUnionHelper<T, TAll> = T extends unknown
  ? T & Partial<Record<Exclude<AllKeys<TAll>, keyof T>, never>>
  : never;
type StrictUnion<T> = StrictUnionHelper<T, T>;

export interface IIndexOptions<T extends MysqlModel = any> extends IndexOptions {
  /** Optional database index name. */
  name?: string;

  /** Entity fields included in this index. */
  fields: KeyOf<T>[];
}

/**
 * Class-level tree declaration.
 *
 * Pass a TypeORM tree type directly, or pass `{ type, options }` when the tree
 * strategy needs closure-table options.
 */
export type ITableTreeOptions = MysqlTreeType | { type: MysqlTreeType; options?: MysqlTreeOptions };

/**
 * Class-level check constraint.
 *
 * Use this for composite constraints. Use `Column({ check })` for a
 * single-property constraint.
 */
export type ITableCheckOptions = string | { name?: string; expression: string };

export interface ITableCommonOptions<T extends MysqlModel = any> {
  /**
   * String fields searched by repository keyword helpers.
   *
   * This is framework metadata; it does not create a database index by itself.
   */
  keywords?: KeyTypeOf<T, string>[];
}

/**
 * Regular TypeORM entity/table options.
 *
 * Omit `kind` for standard tables. This mode is the only `Tables` mode that
 * accepts table indexes, checks, tree metadata, and inheritance metadata.
 */
export interface ITableEntityOptions<T extends MysqlModel = any> extends EntityOptions, ITableCommonOptions<T> {
  /** Optional discriminator for the default regular entity mode. */
  kind?: 'entity';

  /**
   * Add TypeORM single-table inheritance metadata.
   *
   * Use `true` for TypeORM defaults, or pass `{ pattern, column }` for an
   * explicit inheritance column.
   */
  inheritance?: true | MysqlInheritanceOptions;

  /**
   * Add TypeORM tree metadata at class level.
   *
   * Tree properties still need `Column({ kind: 'tree', tree: ... })`.
   */
  tree?: ITableTreeOptions;

  /** Simple composite index over the listed fields. */
  index?: KeyOf<T>[];

  /** Simple unique composite index over the listed fields. */
  unique?: KeyOf<T>[];

  /** Fulltext index over string fields when supported by the dialect. */
  textSearch?: KeyTypeOf<T, string>[];

  /** Detailed TypeORM indexes, including name, where, unique, and other options. */
  customIndexes?: IIndexOptions<T>[];

  /** Table-level check constraints. */
  checks?: ITableCheckOptions[];
}

/** TypeORM view entity options. Use this for read-only view-backed classes. */
export interface ITableViewOptions<T extends MysqlModel = any> extends ViewEntityOptions, ITableCommonOptions<T> {
  kind: 'view';
}

/**
 * TypeORM child entity options for single-table inheritance.
 *
 * The parent entity should use `Tables({ inheritance })`.
 */
export interface ITableChildOptions<T extends MysqlModel = any> extends ITableCommonOptions<T> {
  kind: 'child';

  /** Optional discriminator value registered through TypeORM `ChildEntity`. */
  discriminatorValue?: any;
}

/**
 * Public option union for `@Tables`.
 *
 * The union separates regular entities, view entities, and child entities so
 * indexes/checks/tree metadata are not accidentally applied to unsupported
 * TypeORM table modes.
 */
export type ITableOptions<T extends MysqlModel = any> = StrictUnion<
  ITableEntityOptions<T> | ITableViewOptions<T> | ITableChildOptions<T>
>;

/**
 * Schema-first class decorator for TypeORM entity metadata.
 *
 * `@Tables` wraps the common TypeORM class decorators used by JokTec entities:
 * regular entities, views, child entities, inheritance, tree metadata,
 * indexes, and checks.
 */
export const Tables = <T extends MysqlModel = any>(options: ITableOptions<T> = {}): ClassDecorator => {
  return (target: any) => {
    const className = target.name;

    const decorators: ClassDecorator[] = buildTableKindDecorators(options);
    decorators.unshift(SetMetadata<string, ITableOptions<T>>(className, { ...options }));

    applyDecorators(...decorators)(target);
  };
};

function buildTableKindDecorators<T extends MysqlModel>(options: ITableOptions<T>): ClassDecorator[] {
  if (options.kind === 'view') return buildViewTableDecorators(options);
  if (options.kind === 'child') return [ChildEntity(options.discriminatorValue)];
  return buildEntityTableDecorators(options as ITableEntityOptions<T>);
}

function buildEntityTableDecorators<T extends MysqlModel>(options: ITableEntityOptions<T>): ClassDecorator[] {
  const {
    kind: _kind,
    inheritance,
    tree,
    index,
    unique,
    textSearch,
    customIndexes,
    checks,
    keywords: _keywords,
    ...entityOptions
  } = options;

  const decorators: ClassDecorator[] = [Entity(entityOptions)];

  if (inheritance) {
    decorators.push(TableInheritance(inheritance === true ? undefined : inheritance));
  }

  if (tree) {
    const treeOptions = typeof tree === 'string' ? { type: tree } : tree;
    decorators.push(Tree(treeOptions.type, treeOptions.options));
  }

  decorators.push(...buildTableIndexDecorators({ index, unique, textSearch, customIndexes }));
  decorators.push(...buildTableCheckDecorators(checks));

  return decorators;
}

function buildViewTableDecorators<T extends MysqlModel>(options: ITableViewOptions<T>): ClassDecorator[] {
  const { kind: _kind, keywords: _keywords, ...viewOptions } = options;
  return [ViewEntity(viewOptions)];
}

function buildTableIndexDecorators<T extends MysqlModel>(
  options: Pick<ITableEntityOptions<T>, 'index' | 'unique' | 'textSearch' | 'customIndexes'>,
): ClassDecorator[] {
  const decorators: ClassDecorator[] = [];
  const { index, unique, textSearch, customIndexes } = options;

  if (index?.length) decorators.push(Index(index.map(String)));
  if (unique?.length) decorators.push(Index(unique.map(String), { unique: true }));
  if (textSearch?.length) decorators.push(Index(textSearch.map(String), { fulltext: true }));

  if (customIndexes?.length) {
    customIndexes.forEach((idxOpts: IIndexOptions) => {
      const { fields, ...indexOptions } = idxOpts;
      const safeFields = fields.map(String);
      if (indexOptions.name) decorators.push(Index(indexOptions.name, safeFields, indexOptions));
      else decorators.push(Index(safeFields, indexOptions));
    });
  }

  return decorators;
}

function buildTableCheckDecorators(checks: ITableCheckOptions[] = []): ClassDecorator[] {
  return checks.map(check => {
    if (typeof check === 'string') return Check(check);
    return check.name ? Check(check.name, check.expression) : Check(check.expression);
  });
}
