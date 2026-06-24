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
  - `MysqlHelper`
  - `MysqlFinder`
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

`@Column` accepts normal TypeORM column options and adds optional schema metadata such as `hidden`, `groups`, `example`, `deprecated`, `swagger`, `decorators`, `required`, `isEmail`, `isPhone`, `isHexColor`, `isUrl`, `minlength`, `maxlength`, `min`, and `max`.

`@PrimaryColumn` supports TypeORM generated strategies (`increment`, `uuid`, `rowid`, `identity`) and JokTec-managed `uuidv7`. `uuidv7` is stored as a 36-character varchar and generated before insert when the entity does not already have an id.

Guidelines:

- Prefer numeric auto-increment primary keys for write-heavy MySQL tables.
- Use UUID primary keys only when the application needs globally unique/public identifiers.
- Prefer `uuidv7` over random UUIDs when the id is also used as a cursor or clustered/indexed ordering signal.
- For UUID-heavy cursor pagination, prefer a composite cursor such as `createdAt + id`, or a monotonic indexed cursor column.
- Add indexes that match common filters and cursor sort order. A cursor using `createdAt + id` should have a matching composite index where possible.
- `@Tables` provides common TypeORM entity/index wiring, but database-specific search/index behavior should still be verified per dialect.

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
