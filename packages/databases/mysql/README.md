# @joktec/mysql

MySQL/SQL database package for JokTec applications.

## What It Provides

- `MysqlModule` global Nest module with `forRoot(...)` entity registration.
- `MysqlService` built on `AbstractClientService` and TypeORM.
- `MysqlRepo` base repository.
- Config, decorators, helpers, exceptions, naming strategy support, and TypeORM exports.

## Install

```bash
yarn add @joktec/mysql
```

## Usage

```ts
import { MysqlModule, MysqlRepo } from '@joktec/mysql';

@Module({
  imports: [MysqlModule.forRoot({ models: [Product], conId: 'default' })],
})
export class RepositoryModule {}
```

Configure the `mysql` section in the application config. Multiple connections are selected with `conId`.

## Development

```bash
yarn build --scope @joktec/mysql
yarn test --scope @joktec/mysql
```
