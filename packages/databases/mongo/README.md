# @joktec/mongo

MongoDB database package for JokTec applications.

## What It Provides

- `MongoModule` global Nest module with `forRoot(...)` model registration.
- `MongoService` built on `AbstractClientService`.
- `MongoRepo` base repository for Typegoose/Mongoose models.
- Config, decorators, helpers, plugins, exceptions, constants, and selected Mongoose/Typegoose exports.

## Install

```bash
yarn add @joktec/mongo
```

## Usage

```ts
import { MongoModule, MongoRepo, MongoService } from '@joktec/mongo';

@Module({
  imports: [MongoModule.forRoot({ models: [User], conId: 'default' })],
})
export class RepositoryModule {}

export class UserRepo extends MongoRepo<User, string> {
  constructor(mongoService: MongoService) {
    super(mongoService, User);
  }
}
```

Configure the `mongo` section in the application config. Multiple connections are selected with `conId`.

## Development

```bash
yarn build --scope @joktec/mongo
yarn test --scope @joktec/mongo
```
