# @joktec/mysql

MySQL/SQL database package for JokTec applications.

`@joktec/mysql` wraps TypeORM with JokTec config, lifecycle, entity registration, base repositories, naming strategy support, and shared CRUD pagination contracts from `@joktec/core`.

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
- model contracts:
  - `MysqlModel`
  - `IMysqlRequest`
  - `IMysqlResponse`
- decorators and helpers:
  - `@Tables`
  - `MysqlHelper`
  - `MysqlFinder`
  - `MysqlNamingStrategy`
- selected TypeORM exports.

## Module Registration

Register application entities through `MysqlModule.forRoot(...)`:

```ts
import { Module } from '@joktec/core';
import { MysqlModule } from '@joktec/mysql';
import { Product } from './entities/product.entity';
import { User } from './entities/user.entity';

@Module({
  imports: [
    MysqlModule.forRoot({
      conId: 'default',
      models: [Product, User],
    }),
  ],
})
export class RepositoryModule {}
```

Use `conId` when the application config contains multiple SQL connections.

## Repository Usage

Extend `MysqlRepo` for each application entity:

```ts
import { Injectable } from '@joktec/core';
import { MysqlRepo, MysqlService } from '@joktec/mysql';
import { Product } from '../entities/product.entity';

@Injectable()
export class ProductRepo extends MysqlRepo<Product, string> {
  constructor(mysqlService: MysqlService) {
    super(mysqlService, Product);
  }
}
```

Services can then use the shared `BaseService` contract:

```ts
import { BaseService, Injectable } from '@joktec/core';
import { IMysqlRequest } from '@joktec/mysql';
import { Product } from '../entities/product.entity';
import { ProductRepo } from '../repositories/product.repo';

@Injectable()
export class ProductService extends BaseService<Product, string, IMysqlRequest<Product>> {
  constructor(protected productRepo: ProductRepo) {
    super(productRepo);
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

`slaves` can be configured for TypeORM replication. Slave entries inherit missing host, port, username, password, and database values from the master config.

For multi-process deployments, prefer enabling `sync` in one owner process and disabling it in request-facing processes.

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
const firstPage = await productRepo.paginate({
  cursorKey: 'createdAt',
  limit: 20,
  sort: { createdAt: 'desc' },
});
```

Example next cursor request:

```ts
const nextPage = await productRepo.paginate({
  cursor: firstPage.nextCursor,
  limit: 20,
});
```

For stable cursor pagination, prefer cursor keys backed by indexed columns. The default assumes entities have `createdAt` and primary key columns available through the shared model pattern.

## Entity Notes

Keep entity definitions in the consuming app or package. Keep app-specific query behavior inside app repositories or services, not inside `@joktec/mysql`.

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
