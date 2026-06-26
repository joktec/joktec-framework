import { ApiHideProperty, ApiProperty, ApiPropertyOptions, ApiPropertyOptional, Constructor } from '@joktec/core';
import { Exclude, Expose, Type, ValidateNested } from '@joktec/utils';
import {
  Check,
  Column as TypeormColumn,
  ColumnType,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  RelationId,
  TreeChildren,
  TreeLevelColumn,
  TreeParent,
  ViewColumn as TypeormViewColumn,
  VirtualColumn as TypeormVirtualColumn,
} from 'typeorm';
import { MysqlException } from '../mysql.exception';
import {
  ColumnDecoratorArgs,
  IMysqlColumnBuildOptions,
  IMysqlColumnDatabaseOptions,
  IMysqlColumnOptions,
  IMysqlPrimaryColumnOptions,
  IMysqlRelationIdColumnOptions,
  IMysqlViewColumnOptions,
  IMysqlRelationColumnOptions,
  IMysqlSqlVirtualColumnOptions,
  IMysqlTreeColumnOptions,
  MysqlColumnCheckOptions,
  MysqlColumnIndexOptions,
  MysqlFieldDecorator,
  PrimaryColumnStrategy,
  applyPropertyDecorators,
  assertNoMongoColumn,
  buildColumnDecorators,
  buildPrimaryDecorator,
  buildVersionColumnDecorators,
  buildVirtualColumnDecorators,
  cloneColumnOptions,
  normalizeNormalColumnOptions,
  parseColumnArgs,
  resolveRequired,
  toTypeormOptions,
} from './columns';

/**
 * Schema-first column wrapper that combines TypeORM, validation, transform, and Swagger metadata.
 *
 * Common usage:
 *
 * - `@Column({ type: 'varchar', isEmail: true })` for normal persisted fields.
 * - `@Column('jsonb', { nested: Preference })` for JSON class fields.
 * - `@Column({ kind: 'virtual' })` for TypeScript computed getters.
 * - `@Column({ kind: 'virtual', mode: 'sql', query })` for TypeORM SQL virtual columns.
 * - `@Column({ kind: 'relation', relation: 'many-to-one', type: () => User })` for relations.
 * - `@Column({ kind: 'relation-id', relationId: entity => entity.user })` for relation-id fields.
 */
export function Column(): MysqlFieldDecorator;
export function Column(options: IMysqlColumnOptions): MysqlFieldDecorator;
export function Column(type: ColumnType, options?: IMysqlColumnOptions): MysqlFieldDecorator;
export function Column(...args: ColumnDecoratorArgs): MysqlFieldDecorator {
  const { type, options } = parseColumnArgs(args);
  return (target: object, propertyKey: string | symbol) => {
    const designType = (Reflect.getMetadata('design:returntype', target, propertyKey) ||
      Reflect.getMetadata('design:type', target, propertyKey)) as Constructor<any>;
    applyPropertyDecorators(target, propertyKey, buildMysqlColumnDecorators(type, options, designType));
  };
}

const getColumnKind = (options: IMysqlColumnOptions): NonNullable<IMysqlColumnOptions['kind']> => {
  if (options.kind) return options.kind;
  if ('virtual' in options && options.virtual === true) return 'virtual';
  return 'normal';
};

function buildMysqlColumnDecorators(
  type: ColumnType | undefined,
  options: IMysqlColumnOptions,
  designType: Constructor<any>,
): PropertyDecorator[] {
  const kind = getColumnKind(options);
  if (kind === 'virtual') {
    return isSqlVirtualColumnOptions(options)
      ? buildSqlVirtualDecorators(type, options, designType)
      : buildVirtualColumnDecorators(options as IMysqlColumnBuildOptions, designType);
  }
  if (kind === 'view') return buildViewColumnDecorators(options as IMysqlViewColumnOptions, designType);
  if (kind === 'version') {
    return [
      ...buildVersionColumnDecorators(options as any),
      ...buildColumnExtraDecorators(options as IMysqlColumnDatabaseOptions),
    ];
  }
  if (kind === 'relation') return buildRelationColumnDecorators(options as IMysqlRelationColumnOptions, designType);
  if (kind === 'relation-id') {
    return buildRelationIdColumnDecorators(options as IMysqlRelationIdColumnOptions, designType);
  }
  if (kind === 'tree') return buildTreeColumnDecorators(options as IMysqlTreeColumnOptions, designType);

  const normalOptions = normalizeNormalColumnOptions(type, options as IMysqlColumnBuildOptions);
  const typeormOptions = toTypeormOptions(normalOptions);
  const typeormDecorator = type ? (TypeormColumn as any)(type, typeormOptions) : TypeormColumn(typeormOptions);
  return [
    typeormDecorator,
    ...buildColumnExtraDecorators(normalOptions as IMysqlColumnDatabaseOptions),
    ...buildColumnDecorators(normalOptions, designType),
  ];
}

const isSqlVirtualColumnOptions = (options: IMysqlColumnOptions): options is IMysqlSqlVirtualColumnOptions => {
  const rawOptions = options as Record<string, unknown>;
  return (
    options.kind === 'virtual' && ('query' in options || rawOptions.mode === 'sql' || rawOptions.virtual === 'sql')
  );
};

function buildSqlVirtualDecorators(
  type: ColumnType | undefined,
  options: IMysqlSqlVirtualColumnOptions,
  designType: Constructor<any>,
): PropertyDecorator[] {
  const sqlVirtualOptions = cloneColumnOptions({ ...options, immutable: options.immutable ?? true });
  const typeormOptions = toTypeormOptions(sqlVirtualOptions);
  const columnType = type || sqlVirtualOptions.type || sqlVirtualOptions.columnType;
  const typeormDecorator = columnType
    ? (TypeormVirtualColumn as any)(columnType, typeormOptions)
    : TypeormVirtualColumn(typeormOptions as any);

  return [typeormDecorator, ...buildColumnDecorators(sqlVirtualOptions, designType)];
}

function buildViewColumnDecorators(
  options: IMysqlViewColumnOptions,
  designType: Constructor<any>,
): PropertyDecorator[] {
  const viewOptions = cloneColumnOptions({ ...options, immutable: options.immutable ?? true });
  return [TypeormViewColumn(toTypeormOptions(viewOptions) as any), ...buildColumnDecorators(viewOptions, designType)];
}

function buildRelationColumnDecorators(
  options: IMysqlRelationColumnOptions,
  designType: Constructor<any>,
): PropertyDecorator[] {
  const relationOptions = options.relationOptions ?? { nullable: options.nullable };
  const relationDecorator = (() => {
    if (options.relation === 'many-to-one')
      return ManyToOne(options.type as any, options.inverseSide as any, relationOptions);
    if (options.relation === 'one-to-many')
      return OneToMany(options.type as any, options.inverseSide as any, relationOptions);
    if (options.relation === 'one-to-one')
      return OneToOne(options.type as any, options.inverseSide as any, relationOptions);
    return ManyToMany(options.type as any, options.inverseSide as any, relationOptions);
  })();

  const decorators: PropertyDecorator[] = [relationDecorator, ...buildRelationMetadataDecorators(options, designType)];
  decorators.push(...buildColumnExtraDecorators(options));
  if (options.joinColumn)
    decorators.push(options.joinColumn === true ? JoinColumn() : JoinColumn(options.joinColumn as any));
  if (options.joinTable)
    decorators.push(options.joinTable === true ? JoinTable() : JoinTable(options.joinTable as any));
  return decorators;
}

function buildRelationIdColumnDecorators(
  options: IMysqlRelationIdColumnOptions,
  designType: Constructor<any>,
): PropertyDecorator[] {
  const relationIdOptions = { ...options, immutable: options.immutable ?? true };
  return [
    RelationId(
      relationIdOptions.relationId as any,
      relationIdOptions.relationIdAlias,
      relationIdOptions.relationIdQuery,
    ),
    ...buildColumnExtraDecorators(relationIdOptions),
    ...buildColumnDecorators(relationIdOptions as IMysqlColumnBuildOptions, designType),
  ];
}

function buildColumnExtraDecorators(options: IMysqlColumnDatabaseOptions): PropertyDecorator[] {
  return [...buildColumnIndexDecorators(options.index), ...buildColumnCheckDecorators(options.check)];
}

function buildColumnIndexDecorators(index?: MysqlColumnIndexOptions): PropertyDecorator[] {
  if (!index) return [];
  if (index === true) return [Index()];
  if (typeof index === 'string') return [Index(index)];
  if ('options' in index || 'name' in index) {
    const namedIndex = index as { name?: string; options?: Parameters<typeof Index>[0] };
    return [namedIndex.name ? Index(namedIndex.name, namedIndex.options as any) : Index(namedIndex.options as any)];
  }
  return [Index(index as any)];
}

function buildColumnCheckDecorators(check?: MysqlColumnCheckOptions): PropertyDecorator[] {
  if (!check) return [];
  if (typeof check === 'string') return [Check(check)];
  return [check.name ? Check(check.name, check.expression) : Check(check.expression)];
}

function buildRelationMetadataDecorators(
  options: IMysqlRelationColumnOptions | IMysqlTreeColumnOptions,
  designType: Constructor<any>,
): PropertyDecorator[] {
  const decorators: PropertyDecorator[] = [...(options.decorators || [])];
  const targetResolver = typeof options.type === 'function' ? (options.type as () => Constructor<any>) : undefined;
  const isArray =
    designType === Array || ('relation' in options && ['one-to-many', 'many-to-many'].includes(options.relation));
  const required = resolveRequired(options).required;

  if (targetResolver)
    decorators.push(
      Type(() => targetResolver()),
      ValidateNested({ each: isArray }),
    );
  if (options.hidden) return [...decorators, Exclude({ toPlainOnly: true }), ApiHideProperty()];

  decorators.push(options.groups?.length ? Expose({ groups: options.groups }) : Expose());
  const swaggerOptions: ApiPropertyOptions = {
    type: targetResolver || designType,
    isArray,
    required,
    nullable: options.nullable === true,
    description: options.comment,
    example: options.example,
    deprecated: options.deprecated,
    readOnly: options.immutable,
    ...options.swagger,
  } as ApiPropertyOptions;
  decorators.push(required ? ApiProperty(swaggerOptions) : ApiPropertyOptional(swaggerOptions));
  return decorators;
}

function buildTreeColumnDecorators(
  options: IMysqlTreeColumnOptions,
  designType: Constructor<any>,
): PropertyDecorator[] {
  if (options.tree === 'level') {
    const levelOptions = { ...options, immutable: options.immutable ?? true };
    return [TreeLevelColumn(), ...buildRelationMetadataDecorators(levelOptions, designType)];
  }
  if (options.tree === 'children') {
    return [TreeChildren({ cascade: options.cascade }), ...buildRelationMetadataDecorators(options, Array)];
  }
  return [TreeParent({ onDelete: options.onDelete }), ...buildRelationMetadataDecorators(options, designType)];
}

/**
 * Primary-key wrapper with support for TypeORM generated strategies and framework uuidv7 ids.
 *
 * Use `PrimaryColumn('increment')` for numeric ids, `PrimaryColumn('uuid')`
 * for TypeORM UUIDs, or `PrimaryColumn('uuidv7')` for JokTec-generated
 * time-ordered UUIDs. Mongo ObjectId strategies are intentionally blocked in
 * this package; use `@joktec/mongo` for Mongo schemas.
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
    if (String(strategy).toLowerCase() === 'objectid') {
      throw new MysqlException('MYSQL_MONGO_PRIMARY_UNSUPPORTED', {
        reason: '@joktec/mysql does not support Mongo ObjectId primary columns. Use @joktec/mongo.',
      });
    }
    assertNoMongoColumn(primaryOptions);
    const primaryDecorator = buildPrimaryDecorator(strategy, primaryOptions, target, propertyKey);

    applyPropertyDecorators(target, propertyKey, [
      primaryDecorator,
      ...buildColumnDecorators(
        {
          ...primaryOptions,
          immutable: primaryOptions.immutable ?? true,
          nullable: false,
          required: primaryOptions.required ?? false,
        },
        designType,
      ),
    ]);
  };
}

/**
 * Alias for `PrimaryColumn`.
 *
 * Kept as a familiar import name for TypeORM users while still using the
 * JokTec primary-key wrapper and metadata behavior.
 */
export const PrimaryGeneratedColumn = PrimaryColumn;
