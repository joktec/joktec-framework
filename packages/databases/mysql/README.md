# @joktec/mysql

Relational TypeORM database package for JokTec applications.

`@joktec/mysql` wraps TypeORM with JokTec config, lifecycle, entity registration, base repositories, naming strategy support, and shared CRUD pagination contracts from `@joktec/core`. The package name remains `mysql`, but the first-class relational targets are MySQL, MariaDB, and Postgres.

## Install

```bash
yarn add @joktec/mysql
```

## Public Surface

- module and service:
  - `MysqlModule`
  - `MysqlService`
  - `MysqlRepo`
- config and client:
  - `MysqlConfig`
  - `MysqlClient`
  - `Dialect`
  - `MysqlLogLevel`
  - relational dialect capabilities
- model contracts:
  - `MysqlModel`
  - `IMysqlRequest`
  - `IMysqlResponse`
- decorators and helpers:
  - `@Tables`
  - `@Column`
  - `@PrimaryColumn`
  - `@PrimaryGeneratedColumn`
  - `@TimestampColumn`
  - `MysqlHelper`
  - `MysqlNamingStrategy`
- selected TypeORM exports.

## Module Registration

Register application entities through `MysqlModule.forRoot(...)`:

```ts
import { Module } from '@joktec/core';
import { MysqlModule } from '@joktec/mysql';
import { ProfileBadge } from './entities/profile-badge.entity';

@Module({
  imports: [
    MysqlModule.forRoot({
      conId: 'default',
      models: [ProfileBadge],
    }),
  ],
})
export class RepositoryModule {}
```

Use `conId` when the application config contains multiple SQL connections. Repositories resolve the TypeORM repository through the same `conId`, including transaction-scoped managers when passed through repository options.

## Repository Usage

Extend `MysqlRepo` for each application entity:

```ts
import { Injectable } from '@joktec/core';
import { MysqlRepo, MysqlService } from '@joktec/mysql';
import { ProfileBadge } from '../entities/profile-badge.entity';

@Injectable()
export class ProfileBadgeRepo extends MysqlRepo<ProfileBadge, string> {
  constructor(mysqlService: MysqlService) {
    super(mysqlService, ProfileBadge);
  }
}
```

Services can then use the shared `BaseService` contract:

```ts
import { BaseService, Injectable } from '@joktec/core';
import { IMysqlRequest } from '@joktec/mysql';
import { ProfileBadge } from '../entities/profile-badge.entity';
import { ProfileBadgeRepo } from '../repositories/profile-badge.repo';

@Injectable()
export class ProfileBadgeService extends BaseService<ProfileBadge, string, IMysqlRequest<ProfileBadge>> {
  constructor(protected profileBadgeRepo: ProfileBadgeRepo) {
    super(profileBadgeRepo);
  }
}
```

## Config Shape

The application config reads the `mysql` section and maps it to `MysqlConfig`.

Common fields:

```yaml
mysql:
  conId: default
  dialect: mysql
  host: localhost
  port: 3306
  username: example_user
  password: example_password
  database: example_db
  charset: utf8mb4
  timezone: Z
  connectTimeout: 20000
  sync: false
  benchmark:
    enable: false
    all: false
    level: [error, warn]
```

Supported `dialect` values are `mysql`, `mariadb`, and `postgres`. Other TypeORM drivers are not treated as stable package targets until they have package-level contract tests.

`slaves` can be configured for TypeORM replication. Slave entries inherit missing host, port, username, password, and database values from the master config.

`sync` is disabled by default. For multi-process deployments, enable `sync` only in one controlled owner process, such as a local example app, migration owner, or development-only bootstrap.

## Query Contract

`IMysqlRequest<T>` extends `IBaseRequest<T>` and adds SQL-specific flags:

```ts
{
  select?: string | Array<keyof T>;
  keyword?: string;
  condition?: ICondition<T>;
  page?: number;
  offset?: number;
  cursor?: string;
  cursorKey?: keyof T | Array<keyof T> | string;
  limit?: number;
  sort?: ISort<T>;
  populate?: IPopulate<T>;
  withDeleted?: boolean;
}
```

Supported repository operations include `paginate`, `find`, `count`, `findOne`, `create`, `update`, `delete`, `restore`, `upsert`, and `bulkUpsert`.

Repository reads use QueryBuilder so condition, projection, sorting, relation population, and cursor pagination share the same field validation path. Request field names are validated against TypeORM metadata before they are interpolated into SQL identifiers.

## Pagination

`MysqlRepo.paginate` supports page, offset, and cursor pagination through the shared `@joktec/core` response contracts.

Runtime priority:

1. cursor when `cursor` or `cursorKey` exists
2. offset when `offset` exists
3. page as the default fallback

Cursor pagination behavior:

- default cursor keys: `createdAt` plus entity primary key columns
- custom `cursorKey`: supported
- primary keys are appended as tie-breakers
- cursor keys are validated against TypeORM column metadata
- cursor conditions are built as lexicographic SQL `OR` clauses
- fetches `limit + 1` rows to compute `hasNextPage`
- returns `nextCursor` as an opaque token

Example first cursor request:

```ts
const firstPage = await profileBadgeRepo.paginate({
  cursorKey: 'createdAt',
  limit: 20,
  sort: { createdAt: 'desc' },
});
```

Example next cursor request:

```ts
const nextPage = await profileBadgeRepo.paginate({
  cursor: firstPage.nextCursor,
  limit: 20,
});
```

For stable cursor pagination, prefer cursor keys backed by indexed columns. The default assumes entities have `createdAt` and primary key columns available through the shared model pattern.

## Entity Notes

Keep entity definitions in the consuming app or package. Keep app-specific query behavior inside app repositories or services, not inside `@joktec/mysql`.

`@joktec/mysql` exposes schema-first decorators that wrap TypeORM metadata together with Swagger, `class-validator`, and `class-transformer` metadata. Use them when an entity should be reused as the source class for mapped DTOs.

The wrapper philosophy is pragmatic:

- use `@Column` as the main property-level wrapper for common TypeORM column, relation, relation-id, version, view, and virtual metadata
- keep `@PrimaryColumn` / `@PrimaryGeneratedColumn` and `@TimestampColumn` separate because primary keys and timestamps have strong business semantics
- infer validation, transform, and Swagger metadata from one source of truth whenever possible
- keep raw TypeORM available for rare advanced cases instead of wrapping every decorator
- use `immutable` as the API read-only hint, while `update: false` remains the TypeORM write behavior

```ts
import { Column, MysqlModel, PrimaryColumn, Tables } from '@joktec/mysql';

@Tables<ProfileBadge>({ name: 'profile_badges', index: ['code', 'active'] })
export class ProfileBadge extends MysqlModel {
  @PrimaryColumn('uuidv7')
  id?: string;

  @Column({ length: 64, nullable: false, unique: true })
  code!: string;

  @Column({ length: 128, nullable: false })
  title!: string;

  @Column({ nullable: false, default: true })
  active!: boolean;
}
```

`@Column` accepts normal TypeORM column options and adds optional schema metadata such as `hidden`, `optional`, `expose`, `nested`, `each`, `example`, `deprecated`, `immutable`, `swagger`, `decorators`, `required`, `isEmail`, `isPhone`, `isHexColor`, `isUrl`, `isInt`, `isUUID`, `isObject`, `minlength`, `maxlength`, `min`, `max`, `index`, and `check`.

`@PrimaryColumn` supports TypeORM generated strategies (`increment`, `uuid`, `rowid`, `identity`) and JokTec-managed `uuidv7`. `uuidv7` is stored as a 36-character varchar and generated before insert when the entity does not already have an id.

`@TimestampColumn('create' | 'update' | 'delete')` wraps TypeORM create/update/delete timestamp columns and adds the shared validation, transform, Swagger, and GraphQL metadata used by the column wrapper.

### Read-Only and Immutable Metadata

`immutable` controls generated Swagger `readOnly` metadata. It is intentionally named to match the Mongo schema wrapper terminology.

TypeORM `update: false` still controls ORM write behavior. When `immutable` is not set, `update: false` is also treated as Swagger `readOnly`.

Priority:

1. `swagger.readOnly` is the final override
2. `immutable` controls API read-only metadata
3. `update: false` falls back to API read-only metadata

Examples:

```ts
class AuditEntity extends MysqlModel {
  @Column({ type: 'varchar', length: 36, update: false })
  createdBy?: string;

  @Column({ type: 'varchar', length: 36, immutable: true })
  updatedBy?: string;

  @Column({ type: 'varchar', update: false, immutable: false })
  serviceInsertOnlyButClientWritable?: string;
}
```

The wrapper defaults read-only Swagger metadata for naturally system-managed or computed fields:

- `@PrimaryColumn(...)` and `@PrimaryGeneratedColumn(...)`
- `@TimestampColumn('create' | 'update' | 'delete')`
- `@Column({ kind: 'version' })`
- `@Column({ kind: 'view' })`
- `@Column({ kind: 'virtual' })` getter fields
- `@Column({ kind: 'virtual', mode: 'sql' })`
- `@Column({ kind: 'relation-id' })`
- `@Column({ kind: 'tree', tree: 'level' })`

Special TypeORM column modes are exposed through `@Column({ kind })` instead of standalone wrapper names:

```ts
class ProfileStats {
  @Column({ kind: 'version' })
  version?: number;

  @Column({ kind: 'view', name: 'display_name' })
  displayName?: string;

  @Column('int', {
    kind: 'virtual',
    mode: 'sql',
    query: alias => `SELECT COUNT(*) FROM follows WHERE follows.profile_id = ${alias}.id`,
  })
  followerCount?: number;

  @Column({ kind: 'virtual', comment: 'Display label' })
  get label(): string {
    return `${this.displayName}`;
  }
}
```

`kind: 'virtual'` defaults to metadata-only TypeScript getters. Use `mode: 'sql'` for TypeORM SQL-calculated virtual columns that require a `query(alias)` option.

Relations and relation ids can also be expressed through `@Column`:

```ts
class ArticleEntity extends MysqlModel {
  @Column('uuid', { nullable: true, index: 'IDX_article_author_id', isUUID: true })
  authorId?: string;

  @Column({
    kind: 'relation',
    relation: 'many-to-one',
    type: () => UserEntity,
    inverseSide: user => user.articles,
    joinColumn: { name: 'author_id' },
    nullable: true,
  })
  author?: UserEntity;

  @Column({
    kind: 'relation-id',
    relationId: (article: ArticleEntity) => article.author,
    nullable: true,
  })
  resolvedAuthorId?: string;
}
```

Relation wrappers keep the Swagger type as the same lazy resolver passed to `type`. Do not add `swagger: { type: () => Entity }` for normal relations; reserve `swagger` for genuine OpenAPI shape overrides. This keeps circular or two-way entity relations compact and avoids eager schema evaluation.

`index` and `check` can be declared on normal, version, relation, and relation-id columns when the constraint belongs to one property. Use `@Tables({ checks: [...] })` for composite table checks.

`@Tables` supports common class-level TypeORM metadata:

```ts
@Tables({ name: 'profiles', checks: [{ name: 'CHK_score', expression: 'score >= 0' }] })
export class ProfileEntity extends MysqlModel {}

@Tables({ kind: 'view', name: 'active_profiles', expression: 'SELECT * FROM profiles WHERE deleted_at IS NULL' })
export class ActiveProfileView {}

@Tables({ inheritance: { column: { name: 'kind', type: 'varchar' } } })
export class BaseContent extends MysqlModel {}

@Tables({ kind: 'child', discriminatorValue: 'article' })
export class ArticleContent extends BaseContent {}

@Tables({ tree: 'closure-table' })
export class CategoryEntity extends MysqlModel {}
```

JSON-like columns can model raw records or nested classes:

```ts
class Preference {
  @Column({ required: true })
  theme!: string;

  @Column({ default: true })
  publicProfile?: boolean;
}

class InsightMetric {
  @Column({ required: true })
  key!: string;

  @Column('int', { required: true })
  value!: number;
}

@Tables<CreatorInsight>({ name: 'creator_insights' })
export class CreatorInsight extends MysqlModel {
  @PrimaryColumn('uuidv7')
  id?: string;

  @Column('jsonb', { nullable: true })
  preference?: Preference;

  @Column('jsonb', { nullable: true, nested: InsightMetric, each: true })
  metrics?: InsightMetric[];

  @Column({ kind: 'virtual', comment: 'Computed score label', optional: true })
  get scoreLabel(): string {
    return 'standard';
  }
}
```

`@joktec/mysql` intentionally does not support Mongo ObjectId columns or TypeORM MongoDB connections. Use `@joktec/mongo` for Mongo schemas and ObjectId references.

Guidelines:

- Prefer numeric auto-increment primary keys for write-heavy MySQL tables.
- Use UUID primary keys only when the application needs globally unique/public identifiers.
- Prefer `uuidv7` over random UUIDs when the id is also used as a cursor or clustered/indexed ordering signal.
- For UUID-heavy cursor pagination, prefer a composite cursor such as `createdAt + id`, or a monotonic indexed cursor column.
- Add indexes that match common filters and cursor sort order. A cursor using `createdAt + id` should have a matching composite index where possible.
- `@Tables` provides common TypeORM entity/index wiring, but database-specific search/index behavior should still be verified per dialect.

### Migration Notes

Recent schema-first decorator changes affect applications that still use raw TypeORM, Swagger, `class-validator`, and `class-transformer` decorators together on each entity property.

When migrating an entity:

- Migrate one property at a time and replace the whole property decorator stack when the wrapper option can express the same behavior.
- Replace `@PrimaryGeneratedColumn()` with `@PrimaryColumn('increment')`.
- Replace `@PrimaryGeneratedColumn('uuid')` with `@PrimaryColumn('uuid')`, or `@PrimaryColumn('uuidv7')` when the app wants framework-generated time-ordered UUIDs.
- Replace raw TypeORM `@CreateDateColumn`, `@UpdateDateColumn`, and `@DeleteDateColumn` with `@TimestampColumn('create' | 'update' | 'delete')` when the shared metadata wrapper is desired.
- Replace raw TypeORM `@VersionColumn`, `@VirtualColumn`, and `@ViewColumn` with `@Column({ kind: 'version' })`, `@Column({ kind: 'virtual', mode: 'sql', query })`, or `@Column({ kind: 'view' })`.
- Replace relation decorator stacks such as `@ManyToOne` + `@JoinColumn` + Swagger metadata with `@Column({ kind: 'relation', ... })` when the wrapper can express the same relationship.
- Replace TypeORM `@RelationId` with `@Column({ kind: 'relation-id', relationId })` for relation id properties.
- Replace duplicate validation decorators such as `@IsNotEmpty`, `@IsOptional`, `@IsEmail`, `@IsInt`, `@IsUUID`, `@IsObject`, `@MinLength`, `@MaxLength`, `@Min`, and `@Max` with `@Column` options where possible.
- Replace simple `@Expose`, grouped expose, hidden fields, and Swagger property metadata with `hidden`, `groups`, `expose`, `example`, `comment`, `deprecated`, and `swagger` options where possible.
- Replace repeated `swagger: { readOnly: true }` with `immutable: true` when the API contract is read-only. Use `update: false` when TypeORM should skip updates after insert.
- Keep custom validators or transforms in `decorators: [...]` when there is no wrapper option.
- Do not migrate Mongo/ObjectId-style columns into this package.

Common mappings:

| Legacy decorators | Schema-first wrapper |
| --- | --- |
| `@PrimaryGeneratedColumn()` | `@PrimaryColumn('increment')` |
| `@PrimaryGeneratedColumn('uuid')` | `@PrimaryColumn('uuid')` |
| app-generated ordered UUID id | `@PrimaryColumn('uuidv7')` |
| TypeORM `@CreateDateColumn(...)` | `@TimestampColumn('create', ...)` |
| TypeORM `@UpdateDateColumn(...)` | `@TimestampColumn('update', ...)` |
| TypeORM `@DeleteDateColumn(...)` | `@TimestampColumn('delete', ...)` |
| TypeORM `@VersionColumn(...)` | `@Column({ kind: 'version', ... })` |
| TypeORM `@VirtualColumn(...)` | `@Column({ kind: 'virtual', mode: 'sql', query, ... })` |
| TypeORM `@ViewColumn(...)` | `@Column({ kind: 'view', ... })` |
| `@Column(...)` | `@Column(...)` from `@joktec/mysql` |
| `@Index(...)` on one property | `@Column({ index: true | 'IDX_name' | { name, options } })` |
| `@Check(...)` on one property | `@Column({ check: 'sql expression' | { name, expression } })` |
| `@ManyToOne(...)` + `@JoinColumn(...)` | `@Column({ kind: 'relation', relation: 'many-to-one', joinColumn, ... })` |
| `@OneToMany(...)` | `@Column({ kind: 'relation', relation: 'one-to-many', ... })` |
| `@RelationId(...)` | `@Column({ kind: 'relation-id', relationId })` |
| `@IsInt()` | `@Column({ isInt: true })` or an integer column type |
| `@IsUUID()` | `@Column({ isUUID: true })` |
| `@IsObject()` | `@Column({ isObject: true })` or a JSON column |
| `@Type(() => Number)` | inferred by numeric design type or pass through `decorators` for custom cases |
| `@ValidateNested()` + `@Type(() => Preference)` | `@Column('jsonb', { nested: Preference })` |
| `@ValidateNested({ each: true })` + `@Type(() => Preference)` | `@Column('jsonb', { nested: Preference, each: true })` |
| `@Expose()` + `@ApiProperty(...)` on a getter | `@Column({ kind: 'virtual', ... })` |
| Swagger `readOnly: true` | `@Column({ immutable: true })` or `update: false` when ORM updates must also be blocked |

Raw TypeORM decorators remain available for advanced cases that are intentionally outside the wrapper surface, including listeners, non-primary `@Generated`, `@ForeignKey`, and Postgres `@Exclusion`.

## Error Contract

`MysqlCatch` normalizes common TypeORM driver errors into stable framework codes, including duplicate key, foreign key violation, not-null violation, unknown column, deadlock, lock timeout, connection failure, and transaction conflict. Raw driver details remain attached for logging/debugging, but application code should branch on the stable framework message.

## Repository Layout

- `src/mysql.module.ts`: Nest module and entity registration.
- `src/mysql.service.ts`: connection lifecycle service.
- `src/mysql.repo.ts`: base repository and pagination implementation.
- `src/mysql.config.ts`: config validation and defaults.
- `src/helpers`: query parsing and TypeORM option helpers.
- `src/services`: naming strategy and benchmark helpers.
- `src/models`: model, request, response, and options contracts.
- `src/index.ts`: public package export boundary.

## Development

```bash
yarn lint --scope @joktec/mysql
yarn build --scope @joktec/mysql
yarn test --scope @joktec/mysql
```
