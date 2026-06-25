import { describe, expect, it } from '@jest/globals';
import { IsString, plainToInstance, validateSync } from '@joktec/utils';
import { DECORATORS } from '@nestjs/swagger';
import { getMetadataArgsStorage } from 'typeorm';
import { Column, IMysqlColumnOptions, PrimaryColumn, Tables, TimestampColumn } from '../decorators';

const UUID_V7_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const hasIndexColumn = (item: { columns?: unknown }, column: string): boolean => {
  return Array.isArray(item.columns) && item.columns.includes(column);
};
const getSwaggerMetadata = (target: object, property: string): Record<string, any> => {
  return Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, target, property);
};

describe('MySQL column decorators', () => {
  it('applies TypeORM column metadata and validation decorators', () => {
    const transformer = {
      to: (value: string) => value?.trim(),
      from: (value: string) => value,
    };

    class ProductColumnFixture {
      @Column({
        length: 10,
        nullable: false,
        transformer,
        index: { name: 'IDX_product_name', options: { unique: true } },
        check: { name: 'CHK_product_name', expression: 'LENGTH(name) > 0' },
      })
      name?: string;
    }

    const metadata = getMetadataArgsStorage().columns.find(
      item => item.target === ProductColumnFixture && item.propertyName === 'name',
    );

    expect(metadata).toBeDefined();
    expect(metadata.options.length).toEqual(10);
    expect(metadata.options.transformer).toBe(transformer);

    const index = getMetadataArgsStorage().indices.find(
      item => item.target === ProductColumnFixture && hasIndexColumn(item, 'name'),
    ) as any;
    const check = getMetadataArgsStorage().checks.find(
      item => item.target === ProductColumnFixture && item.expression === 'LENGTH(name) > 0',
    );

    expect(index?.name).toEqual('IDX_product_name');
    expect(index?.unique ?? index?.options?.unique).toEqual(true);
    expect(check?.name).toEqual('CHK_product_name');

    const invalid = new ProductColumnFixture();
    expect(validateSync(invalid).map(error => error.property)).toContain('name');

    const valid = new ProductColumnFixture();
    valid.name = 'product';
    expect(validateSync(valid)).toHaveLength(0);
  });

  it('treats nullable columns as optional validation fields', () => {
    class OptionalColumnFixture {
      @Column({ length: 10, nullable: true })
      code?: string;
    }

    expect(validateSync(new OptionalColumnFixture())).toHaveLength(0);
  });

  it('generates uuidv7 values before insert for primary columns', () => {
    class UuidPrimaryFixture {
      @PrimaryColumn('uuidv7')
      id?: string;
    }

    const fixture = new UuidPrimaryFixture();
    const hookName = Object.getOwnPropertyNames(UuidPrimaryFixture.prototype).find(name =>
      name.includes('__joktecBeforeInsertUuidV7_id'),
    );

    expect(hookName).toBeDefined();
    fixture[hookName]();

    expect(fixture.id).toMatch(UUID_V7_REGEX);

    const metadata = getMetadataArgsStorage().columns.find(
      item => item.target === UuidPrimaryFixture && item.propertyName === 'id',
    );
    expect(metadata).toBeDefined();
    expect(metadata.options.primary).toEqual(true);
  });

  it('wraps TypeORM timestamp columns with date validation metadata', () => {
    class TimestampFixture {
      @TimestampColumn('create', { name: 'created_at', type: 'datetime', precision: 6, required: true })
      createdAt?: Date;

      @TimestampColumn('update', { name: 'updated_at', type: 'datetime', precision: 6 })
      updatedAt?: Date;

      @TimestampColumn('delete', { name: 'deleted_at', type: 'datetime', precision: 6 })
      deletedAt?: Date;
    }

    const metadata = getMetadataArgsStorage().columns.filter(item => item.target === TimestampFixture);
    const createdAt = metadata.find(item => item.propertyName === 'createdAt');
    const updatedAt = metadata.find(item => item.propertyName === 'updatedAt');
    const deletedAt = metadata.find(item => item.propertyName === 'deletedAt');

    expect(createdAt).toBeDefined();
    expect(createdAt.mode).toEqual('createDate');
    expect(createdAt.options.name).toEqual('created_at');
    expect(createdAt.options.precision).toEqual(6);
    expect(updatedAt.mode).toEqual('updateDate');
    expect(deletedAt.mode).toEqual('deleteDate');
    expect(deletedAt.options.nullable).toEqual(true);
    expect(getSwaggerMetadata(TimestampFixture.prototype, 'createdAt').readOnly).toEqual(true);
    expect(getSwaggerMetadata(TimestampFixture.prototype, 'updatedAt').readOnly).toEqual(true);
    expect(getSwaggerMetadata(TimestampFixture.prototype, 'deletedAt').readOnly).toEqual(true);

    expect(validateSync(new TimestampFixture()).map(error => error.property)).toContain('createdAt');

    const valid = new TimestampFixture();
    valid.createdAt = new Date();
    expect(validateSync(valid)).toHaveLength(0);
  });

  it('keeps column option modes strict at compile time', () => {
    const normal = { type: 'varchar', isEmail: true } satisfies IMysqlColumnOptions;
    const virtual = { kind: 'virtual', comment: 'Display name' } satisfies IMysqlColumnOptions;
    const sqlVirtual = { kind: 'virtual', mode: 'sql', query: (alias: string) => alias } satisfies IMysqlColumnOptions;
    const relation = { kind: 'relation', relation: 'many-to-one', type: () => String } satisfies IMysqlColumnOptions;
    const relationId = {
      kind: 'relation-id',
      relationId: (entity: any) => entity.author,
    } satisfies IMysqlColumnOptions;

    expect(normal.type).toEqual('varchar');
    expect(virtual.kind).toEqual('virtual');
    expect(sqlVirtual.mode).toEqual('sql');
    expect(relation.relation).toEqual('many-to-one');
    expect(relationId.kind).toEqual('relation-id');

    // @ts-expect-error virtual getter columns do not accept scalar validators.
    const invalidVirtual = { kind: 'virtual', isEmail: true } satisfies IMysqlColumnOptions;
    const invalidRelation = {
      kind: 'relation',
      relation: 'many-to-one',
      type: () => String,
      isEmail: true,
    } as const;
    // @ts-expect-error relation columns do not accept scalar validators.
    const checkedInvalidRelation = invalidRelation satisfies IMysqlColumnOptions;
    const invalidRelationId = {
      kind: 'relation-id',
      relationId: (entity: any) => entity.author,
      joinColumn: true,
    } as const;
    // @ts-expect-error relation-id columns do not accept relation join metadata.
    const checkedInvalidRelationId = invalidRelationId satisfies IMysqlColumnOptions;

    expect(invalidVirtual).toBeDefined();
    expect(checkedInvalidRelation).toBeDefined();
    expect(checkedInvalidRelationId).toBeDefined();
  });

  it('infers integer validation from int-like column types', () => {
    class IntegerFixture {
      @Column({ type: 'int' })
      count?: number;
    }

    const invalid = new IntegerFixture();
    invalid.count = 1.5;
    expect(validateSync(invalid).map(error => error.property)).toContain('count');

    const valid = new IntegerFixture();
    valid.count = 1;
    expect(validateSync(valid)).toHaveLength(0);
  });

  it('validates simple-array elements with each semantics', () => {
    class ArrayFixture {
      @Column('simple-array')
      codes?: string[];
    }

    const invalid = new ArrayFixture();
    invalid.codes = ['A', 1 as any];
    expect(validateSync(invalid).map(error => error.property)).toContain('codes');

    const valid = new ArrayFixture();
    valid.codes = ['A', 'B'];
    expect(validateSync(valid)).toHaveLength(0);
  });

  it('supports uuid and object validation flags', () => {
    class TypedFixture {
      @Column('varchar', { isUUID: true, nullable: true })
      targetId?: string;

      @Column('simple-json', { isObject: true })
      payload?: Record<string, unknown>;
    }

    const invalid = new TypedFixture();
    invalid.targetId = 'not-uuid';
    invalid.payload = 'not-object' as any;
    expect(validateSync(invalid).map(error => error.property)).toEqual(['targetId', 'payload']);

    const valid = new TypedFixture();
    valid.targetId = '6f12b53a-5c43-4b2a-8cf4-bd32b6cbbf35';
    valid.payload = { source: 'test' };
    expect(validateSync(valid)).toHaveLength(0);
  });

  it('rejects Mongo ObjectId column metadata in the MySQL adapter', () => {
    expect(() => {
      class ObjectIdColumnFixture {
        @Column('varchar', { isObjectId: true } as any)
        mongoId?: string;
      }

      return ObjectIdColumnFixture;
    }).toThrow('MYSQL_MONGO_COLUMN_UNSUPPORTED');

    expect(() => {
      class ObjectIdPrimaryFixture {
        @PrimaryColumn('objectId' as any)
        id?: string;
      }

      return ObjectIdPrimaryFixture;
    }).toThrow('MYSQL_MONGO_PRIMARY_UNSUPPORTED');
  });

  it('adds class-transformer type metadata for primitive column design types', () => {
    class TransformFixture {
      @Column('bigint', { default: 0 })
      plan?: number;
    }

    const fixture = plainToInstance(TransformFixture, { plan: '42' });
    expect(fixture.plan).toBe(42);
  });

  it('adds class-transformer type metadata for json class columns', () => {
    class JsonPreference {
      @IsString()
      theme?: string;
    }

    class JsonFixture {
      @Column('jsonb', { nullable: true })
      preference?: JsonPreference;
    }

    const fixture = plainToInstance(JsonFixture, { preference: { theme: 'dark' } });
    expect(fixture.preference).toBeInstanceOf(JsonPreference);
    expect(fixture.preference.theme).toEqual('dark');

    const invalid = new JsonFixture();
    invalid.preference = 'not-object' as any;
    expect(validateSync(invalid).map(error => error.property)).toContain('preference');

    const invalidNested = plainToInstance(JsonFixture, { preference: { theme: 1 } });
    expect(validateSync(invalidNested).map(error => error.property)).toContain('preference');
  });

  it('uses explicit nested type metadata for json class arrays', () => {
    class JsonPreference {
      @IsString()
      theme?: string;
    }

    class JsonArrayFixture {
      @Column('jsonb', { nested: JsonPreference, nullable: true })
      preferences?: JsonPreference[];
    }

    const fixture = plainToInstance(JsonArrayFixture, { preferences: [{ theme: 'dark' }, { theme: 'light' }] });
    expect(fixture.preferences[0]).toBeInstanceOf(JsonPreference);
    expect(fixture.preferences[1]).toBeInstanceOf(JsonPreference);
    expect(validateSync(fixture)).toHaveLength(0);

    const invalid = plainToInstance(JsonArrayFixture, { preferences: [{ theme: 'dark' }, { theme: 1 }] });
    expect(validateSync(invalid).map(error => error.property)).toContain('preferences');

    const swagger = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, JsonArrayFixture.prototype, 'preferences');
    expect(swagger.type).toBe(JsonPreference);
    expect(swagger.isArray).toEqual(true);
    expect(swagger.nullable).toEqual(true);
  });

  it('allows swagger options to override inferred nested metadata', () => {
    class JsonPreference {
      @IsString()
      theme?: string;
    }

    class SwaggerOverrideFixture {
      @Column('jsonb', {
        nested: JsonPreference,
        nullable: true,
        swagger: { description: 'Custom docs type', type: String, isArray: false },
      })
      preferences?: JsonPreference[];
    }

    const swagger = Reflect.getMetadata(
      DECORATORS.API_MODEL_PROPERTIES,
      SwaggerOverrideFixture.prototype,
      'preferences',
    );

    expect(swagger.type).toBe(String);
    expect(swagger.isArray).toEqual(false);
    expect(swagger.description).toEqual('Custom docs type');
  });

  it('maps immutable metadata to Swagger readOnly and still allows explicit override', () => {
    class ImmutableColumnFixture {
      @Column({ type: 'varchar', immutable: true })
      serverManaged?: string;

      @Column({ type: 'varchar', update: false })
      insertOnly?: string;

      @Column({ type: 'varchar', update: false, immutable: false })
      insertOnlyButClientWritable?: string;

      @Column({ type: 'varchar', immutable: true, swagger: { readOnly: false } })
      documentedOverride?: string;
    }

    const immutableSwagger = getSwaggerMetadata(ImmutableColumnFixture.prototype, 'serverManaged');
    const insertOnlySwagger = getSwaggerMetadata(ImmutableColumnFixture.prototype, 'insertOnly');
    const clientWritableSwagger = getSwaggerMetadata(ImmutableColumnFixture.prototype, 'insertOnlyButClientWritable');
    const overriddenSwagger = getSwaggerMetadata(ImmutableColumnFixture.prototype, 'documentedOverride');

    expect(immutableSwagger.readOnly).toEqual(true);
    expect(insertOnlySwagger.readOnly).toEqual(true);
    expect(clientWritableSwagger.readOnly).toEqual(false);
    expect(overriddenSwagger.readOnly).toEqual(false);
  });

  it('keeps record-like json columns as plain objects', () => {
    class JsonRecordFixture {
      @Column('jsonb', { nullable: true })
      preference?: Record<string, any> | object;
    }

    const fixture = plainToInstance(JsonRecordFixture, { preference: { theme: 'dark' } });
    expect(fixture.preference).toEqual({ theme: 'dark' });
    expect(fixture.preference).not.toBeInstanceOf(JsonRecordFixture);
  });

  it('applies virtual metadata without registering a persisted TypeORM column', () => {
    class VirtualColumnFixture {
      requests = [{ pc: 2 }, { pc: 3 }];

      @Column({ kind: 'virtual', comment: 'Total request', example: 5 })
      get totalRequest(): number {
        return this.requests.reduce((total, request) => total + request.pc, 0);
      }
    }

    const metadata = getMetadataArgsStorage().columns.find(
      item => item.target === VirtualColumnFixture && item.propertyName === 'totalRequest',
    );

    expect(metadata).toBeUndefined();
    expect(getSwaggerMetadata(VirtualColumnFixture.prototype, 'totalRequest').readOnly).toEqual(true);
    expect(new VirtualColumnFixture().totalRequest).toEqual(5);
  });

  it('keeps legacy virtual metadata mode compatible', () => {
    class LegacyVirtualColumnFixture {
      @Column({ virtual: true, comment: 'Legacy virtual' })
      get label(): string {
        return 'legacy';
      }
    }

    const metadata = getMetadataArgsStorage().columns.find(
      item => item.target === LegacyVirtualColumnFixture && item.propertyName === 'label',
    );

    expect(metadata).toBeUndefined();
    expect(new LegacyVirtualColumnFixture().label).toEqual('legacy');
  });

  it('wraps TypeORM version columns with integer validation metadata', () => {
    class VersionColumnFixture {
      @Column({ kind: 'version' })
      version?: number;
    }

    const metadata = getMetadataArgsStorage().columns.find(
      item => item.target === VersionColumnFixture && item.propertyName === 'version',
    );

    expect(metadata).toBeDefined();
    expect(metadata.mode).toEqual('version');

    const invalid = new VersionColumnFixture();
    invalid.version = 1.5;
    expect(validateSync(invalid).map(error => error.property)).toContain('version');

    const valid = new VersionColumnFixture();
    valid.version = 1;
    expect(validateSync(valid)).toHaveLength(0);
  });

  it('wraps TypeORM virtual SQL columns separately from metadata-only computed getters', () => {
    class TypeormVirtualColumnFixture {
      @Column('int', {
        kind: 'virtual',
        mode: 'sql',
        query: alias => `SELECT COUNT(*) FROM item WHERE item.owner_id = ${alias}.id`,
      })
      itemCount?: number;
    }

    const metadata = getMetadataArgsStorage().columns.find(
      item => item.target === TypeormVirtualColumnFixture && item.propertyName === 'itemCount',
    );

    expect(metadata).toBeDefined();
    expect(metadata.mode).toEqual('virtual-property');
    expect(metadata.options.type).toEqual('int');
    expect(metadata.options.query('user')).toEqual('SELECT COUNT(*) FROM item WHERE item.owner_id = user.id');
    expect(getSwaggerMetadata(TypeormVirtualColumnFixture.prototype, 'itemCount').readOnly).toEqual(true);
  });

  it('wraps TypeORM view columns with JokTec metadata', () => {
    class ViewColumnFixture {
      @Column({ kind: 'view', name: 'display_name' })
      displayName?: string;
    }

    const metadata = getMetadataArgsStorage().columns.find(
      item => item.target === ViewColumnFixture && item.propertyName === 'displayName',
    );

    expect(metadata).toBeDefined();
    expect(metadata.mode).toEqual('regular');
    expect(metadata.options.name).toEqual('display_name');
    expect(getSwaggerMetadata(ViewColumnFixture.prototype, 'displayName').readOnly).toEqual(true);
  });

  it('wraps TypeORM relations with join metadata and field metadata', () => {
    class UserRelationFixture {
      articles?: ArticleRelationFixture[];
    }

    class ArticleRelationFixture {
      @Column({
        kind: 'relation',
        relation: 'many-to-one',
        type: () => UserRelationFixture,
        inverseSide: user => user.articles,
        joinColumn: { name: 'author_id' },
        nullable: true,
        index: 'IDX_article_author',
      })
      author?: UserRelationFixture;

      @Column({
        kind: 'relation-id',
        relationId: (article: ArticleRelationFixture) => article.author,
        nullable: true,
      })
      authorId?: string;
    }

    const relation = getMetadataArgsStorage().relations.find(
      item => item.target === ArticleRelationFixture && item.propertyName === 'author',
    );
    const joinColumn = getMetadataArgsStorage().joinColumns.find(
      item => item.target === ArticleRelationFixture && item.propertyName === 'author',
    );

    expect(relation).toBeDefined();
    expect(relation.relationType).toEqual('many-to-one');
    expect(relation.options.nullable).toEqual(true);
    expect(joinColumn).toBeDefined();
    expect(joinColumn.name).toEqual('author_id');

    const index = getMetadataArgsStorage().indices.find(
      item => item.target === ArticleRelationFixture && hasIndexColumn(item, 'author'),
    );
    const relationId = getMetadataArgsStorage().relationIds.find(
      item => item.target === ArticleRelationFixture && item.propertyName === 'authorId',
    );

    expect(index?.name).toEqual('IDX_article_author');
    expect(relationId).toBeDefined();
    expect(getSwaggerMetadata(ArticleRelationFixture.prototype, 'authorId').readOnly).toEqual(true);
  });

  it('keeps relation Swagger metadata lazy to avoid circular import timing issues', () => {
    let LazyUserRelationFixture: any;

    class ArticleRelationFixture {
      @Column({
        kind: 'relation',
        relation: 'many-to-one',
        type: () => LazyUserRelationFixture,
        inverseSide: user => user.articles,
        nullable: true,
      })
      author?: any;

      @Column({
        kind: 'relation',
        relation: 'one-to-many',
        type: () => LazyUserRelationFixture,
        inverseSide: user => user.article,
        nullable: true,
      })
      reviewers?: any[];
    }

    class UserRelationFixture {
      article?: ArticleRelationFixture;
      articles?: ArticleRelationFixture[];
    }

    LazyUserRelationFixture = UserRelationFixture;

    const authorSwagger = getSwaggerMetadata(ArticleRelationFixture.prototype, 'author');
    const reviewersSwagger = getSwaggerMetadata(ArticleRelationFixture.prototype, 'reviewers');

    expect(authorSwagger.type.name).toEqual('type');
    expect(authorSwagger.type()).toBe(UserRelationFixture);
    expect(reviewersSwagger.type.name).toEqual('type');
    expect(reviewersSwagger.type()).toBe(UserRelationFixture);
    expect(reviewersSwagger.isArray).toEqual(true);

    const fixture = plainToInstance(ArticleRelationFixture, {
      author: {},
      reviewers: [{}, {}],
    });

    expect(fixture.author).toBeInstanceOf(UserRelationFixture);
    expect(fixture.reviewers[0]).toBeInstanceOf(UserRelationFixture);
  });

  it('wraps TypeORM table metadata for entity modes, inheritance, and checks', () => {
    @Tables<any>({
      name: 'table_entity_fixture',
      index: ['code'],
      unique: ['slug'],
      textSearch: ['title'],
      customIndexes: [{ name: 'IDX_table_custom', fields: ['active'], where: 'active = true' }],
      checks: [{ name: 'CHK_table_score', expression: 'score >= 0' }],
      inheritance: { column: { name: 'kind', type: 'varchar' } },
    })
    class TableEntityFixture {}

    const table = getMetadataArgsStorage().tables.find(item => item.target === TableEntityFixture);
    const inheritance = getMetadataArgsStorage().inheritances.find(item => item.target === TableEntityFixture);
    const check = getMetadataArgsStorage().checks.find(
      item => item.target === TableEntityFixture && item.expression === 'score >= 0',
    );
    const index = getMetadataArgsStorage().indices.find(item => item.name === 'IDX_table_custom');

    expect(table?.name).toEqual('table_entity_fixture');
    expect(inheritance?.column).toEqual({ name: 'kind', type: 'varchar' });
    expect(check?.name).toEqual('CHK_table_score');
    expect(index?.columns).toEqual(['active']);
  });

  it('wraps TypeORM view and child table metadata', () => {
    @Tables({ kind: 'view', name: 'active_users_view', expression: 'SELECT 1 AS id' })
    class ActiveUsersViewFixture {}

    @Tables({ kind: 'child', discriminatorValue: 'admin' })
    class AdminUserFixture {}

    const view = getMetadataArgsStorage().tables.find(item => item.target === ActiveUsersViewFixture);
    const child = getMetadataArgsStorage().tables.find(item => item.target === AdminUserFixture);
    const discriminator = getMetadataArgsStorage().discriminatorValues.find(item => item.target === AdminUserFixture);

    expect(view?.type).toEqual('view');
    expect(view?.expression).toEqual('SELECT 1 AS id');
    expect(child?.type).toEqual('entity-child');
    expect(discriminator?.value).toEqual('admin');
  });

  it('wraps TypeORM tree property decorators', () => {
    @Tables({ tree: 'closure-table' })
    class TreeFixture {
      @Column({ kind: 'tree', tree: 'parent', onDelete: 'CASCADE' })
      parent?: TreeFixture;

      @Column({ kind: 'tree', tree: 'children', cascade: true })
      children?: TreeFixture[];

      @Column({ kind: 'tree', tree: 'level' })
      level?: number;
    }

    const relations = getMetadataArgsStorage().relations.filter(item => item.target === TreeFixture);
    const tree = getMetadataArgsStorage().trees.find(item => item.target === TreeFixture);
    const level = getMetadataArgsStorage().columns.find(
      item => item.target === TreeFixture && item.propertyName === 'level',
    );

    expect(tree?.type).toEqual('closure-table');
    expect(relations.find(item => item.propertyName === 'parent')?.isTreeParent).toEqual(true);
    expect(relations.find(item => item.propertyName === 'children')?.isTreeChildren).toEqual(true);
    expect(level?.mode).toEqual('treeLevel');
    expect(getSwaggerMetadata(TreeFixture.prototype, 'level').readOnly).toEqual(true);
  });

  it('wraps TypeORM tree table options with closure-table options', () => {
    @Tables({ tree: { type: 'closure-table', options: { closureTableName: 'category_closure' } } })
    class ClosureTreeFixture {}

    const tree = getMetadataArgsStorage().trees.find(item => item.target === ClosureTreeFixture);

    expect(tree?.type).toEqual('closure-table');
    expect(tree?.options?.closureTableName).toEqual('category_closure');
  });
});
