# @joktec/mongo

MongoDB database package for JokTec applications.

`@joktec/mongo` wraps Mongoose/Typegoose with JokTec config, lifecycle, decorators, repository helpers, and shared CRUD pagination contracts from `@joktec/core`.

## Install

```bash
yarn add @joktec/mongo
```

## Public Surface

- module and service:
  - `MongoModule`
  - `MongoService`
  - `MongoRepo`
- config and client:
  - `MongoConfig`
  - `MongoClient`
- model contracts:
  - `MongoSchema`
  - `IMongoRequest`
  - `IMongoPaginationResponse`
- decorators and helpers:
  - `@Schema`
  - `@Prop`
  - `IMongoSchemaOptions`
  - `IMongoPropOptions`
  - `RefId`
  - `PopulatedRef`
  - `ObjectId`
  - `MongoHelper`
  - `MongoPipeline`
  - Mongo plugins
- selected Mongoose and Typegoose exports.

## Module Registration

Register application models through `MongoModule.forRoot(...)`:

```ts
import { Module } from '@joktec/core';
import { MongoModule } from '@joktec/mongo';
import { Article } from './models/article.schema';
import { User } from './models/user.schema';

@Module({
  imports: [
    MongoModule.forRoot({
      conId: 'default',
      models: [Article, User],
    }),
  ],
})
export class RepositoryModule {}
```

Use `conId` when the application config contains multiple Mongo connections.

`MongoService` keeps model resolution connection-aware. Repository instances receive a `conId` and resolve models through that connection instead of relying on the global mongoose registry.

## Repository Usage

Extend `MongoRepo` for each application schema:

```ts
import { Injectable } from '@joktec/core';
import { MongoRepo, MongoService } from '@joktec/mongo';
import { Article } from '../models/article.schema';

@Injectable()
export class ArticleRepo extends MongoRepo<Article, string> {
  constructor(mongoService: MongoService) {
    super(mongoService, Article);
  }
}
```

Services can then use the shared `BaseService` contract:

```ts
import { BaseService, Injectable } from '@joktec/core';
import { IMongoRequest } from '@joktec/mongo';
import { Article } from '../models/article.schema';
import { ArticleRepo } from '../repositories/article.repo';

@Injectable()
export class ArticleService extends BaseService<Article, string, IMongoRequest<Article>> {
  constructor(protected articleRepo: ArticleRepo) {
    super(articleRepo);
  }
}
```

## Config Shape

The application config reads the `mongo` section and maps it to `MongoConfig`.

Common fields:

```yaml
mongo:
  conId: default
  host: localhost
  port: 27017
  username: example_user
  password: example_password
  database: example_db
  srvMode: false
  strictQuery: true
  autoIndex: false
  params: replicaSet=rs0&directConnection=true
  options:
    serverSelectionTimeoutMS: 10000
```

`uri` can be used instead of host/port fields when an application needs a complete MongoDB connection string.

For multi-process deployments, prefer enabling `autoIndex` in one owner process and disabling it in request-facing processes.

## Query Contract

`IMongoRequest<T>` extends `IBaseRequest<T>` and adds aggregation support:

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
  aggregations?: PipelineStage[];
}
```

Supported repository operations include `paginate`, `find`, `count`, `findOne`, `create`, `update`, `delete`, `restore`, `upsert`, and `bulkUpsert`.

Query parsing is intentionally conservative:

- `id` is treated as an API alias for root `_id` in query conditions.
- ObjectId casting is schema-aware and limited to `_id`, schema ObjectId paths, or explicitly configured ObjectId paths.
- String fields that happen to contain 24 hex characters are not cast to ObjectId unless the schema path requires it.
- `$like`, `$begin`, and `$end` escape regex input by default to avoid accidental raw regex behavior.
- Legacy casting and regex behavior are available only through explicit parser options for migration compatibility.

## Pagination

`MongoRepo.paginate` supports page, offset, and cursor pagination through the shared `@joktec/core` response contracts.

Runtime priority:

1. cursor when `cursor` or `cursorKey` exists
2. offset when `offset` exists
3. page as the default fallback

Cursor pagination behavior:

- default cursor key: `_id`
- custom `cursorKey`: supported
- custom cursor keys automatically append `_id` as a tie-breaker
- cursor conditions are built as lexicographic Mongo `$or` clauses
- fetches `limit + 1` documents to compute `hasNextPage`
- returns `nextCursor` as an opaque token

Example first cursor request:

```ts
const firstPage = await articleRepo.paginate({
  cursorKey: 'createdAt',
  limit: 20,
  sort: { createdAt: 'desc' },
});
```

Example next cursor request:

```ts
const nextPage = await articleRepo.paginate({
  cursor: firstPage.nextCursor,
  limit: 20,
});
```

## Schema Notes

Use package decorators and base schema contracts for Mongo models. Keep app-specific query behavior inside app repositories or services, not inside `@joktec/mongo`.

The schema decorators wrap Typegoose, `class-validator`, `class-transformer`, and Swagger metadata so one schema class can be reused by mapped DTOs where appropriate.

```ts
import { MongoSchema, Prop, Schema } from '@joktec/mongo';

@Schema({ collection: 'users', index: ['username'] })
export class User extends MongoSchema {
  @Prop({ required: true, unique: true })
  username!: string;

  @Prop({ type: () => [String], default: [] })
  profileBadgeIds?: string[];
}
```

Use `Schema({ kind: 'embedded' })` for value objects. Embedded schemas default to `_id: false` and `timestamps: false`, and they do not register collection-level plugins or indexes:

```ts
@Schema({ kind: 'embedded' })
export class Preference {
  @Prop({ required: true })
  theme!: string;
}
```

Use `Schema({ kind: 'subdocument' })` when the nested document still needs its own `_id` and timestamps but should not become a top-level collection:

```ts
@Schema({ kind: 'subdocument' })
export class ArticleFile extends MongoSchema {
  @Prop({ required: true })
  url!: string;
}
```

`Prop` supports explicit modes for common schema-first cases:

- omit `kind` or use `kind: 'normal'` for persisted scalar, enum, object, array, ObjectId, and stored reference id fields.
- use `kind: 'map'` for raw maps/snapshots instead of passing `PropType.MAP` at the call site.
- use `kind: 'virtual', mode: 'getter'` for TypeScript computed getters.
- use virtual populate options such as `ref`, `localField`, and `foreignField` for Mongoose virtual populate fields; the wrapper infers `kind: 'virtual'` and `mode: 'populate'`.

Swagger, transform, and validation metadata are inferred from `type`, `required`, `nullable`, `comment`, `example`, `enum`, `deprecated`, `immutable`, `nested`, and array shape. Use `swagger` only as an override when the inferred metadata is not enough.

When storing raw snapshots, maps, or subdocuments, avoid relying on global `id` to `_id` conversion. The repository/helper layer should only apply API-facing id aliasing where it is safe for query semantics.

### References, Populate, And Virtual Fields

Use explicit reference helper types to separate stored ids from populated instances:

```ts
import { MongoSchema, ObjectId, PopulatedRef, Prop, RefId, Schema } from '@joktec/mongo';
import { Artist } from './artist.schema';
import { User } from './user.schema';

@Schema({ collection: 'articles' })
export class Article extends MongoSchema {
  @Prop({ type: ObjectId, ref: () => User })
  authorId?: RefId<User>;

  @Prop({ type: [ObjectId], ref: () => Artist })
  artistIds?: RefId<Artist>[];

  @Prop({ ref: () => User, foreignField: '_id', localField: 'authorId' })
  author?: PopulatedRef<User>;

  @Prop({ type: () => [Artist], ref: () => Artist, foreignField: '_id', localField: 'artistIds' })
  artists?: PopulatedRef<Artist>[];

  @Prop({ kind: 'virtual', mode: 'getter', comment: 'Public thumbnail URL', optional: true })
  get thumbnail(): string | undefined {
    return undefined;
  }

  @Prop({ kind: 'map', type: Object, default: null })
  snapshot?: Record<string, unknown>;
}
```

Guidelines:

- Use `RefId<T>` for persisted reference id fields such as `authorId` or `artistIds`; pass the raw id type only when it is not the default string id.
- Use `PopulatedRef<T>` and `PopulatedRef<T>[]` for virtual populate outputs when application code expects direct property access on populated instances.
- Keep lazy resolver syntax in `@Prop({ type: () => User })` or `@Prop({ type: () => [User] })` when the wrapper cannot infer the class from `ref`.
- Populate-one fields can omit `type` when `ref` points at the same class; populate arrays must still provide `type: () => [Target]` because runtime reflection cannot see the array element type.
- Use `@Prop({ kind: 'virtual', mode: 'getter' })` for computed getters that need `@Expose` and Swagger metadata but must not become persisted Mongoose paths.
- Use virtual populate declarations with `ref`, `localField`, and `foreignField`; the wrapper infers populate mode, auto-sets `justOne: true` for non-array populated fields, and uses `{}` or `[]` as compact Swagger examples when no example is provided.
- Use `@Prop({ kind: 'map' })` for snapshot-style maps and raw objects that must keep their original `id`/shape.
- Repository reads normalize ObjectId/BSON values and transform populated objects into schema class instances. Code that needs raw Mongoose documents should use `MongoService.getModel(...)` or Typegoose/Mongoose APIs directly.

### Migration Notes

Recent schema-first changes affect how applications should model references and virtual getters:

- Replace populated virtual fields typed as Typegoose `Ref<T>` with `PopulatedRef<T>` when the field is returned through `MongoRepo` and should be used like a class instance.
- Keep stored id fields as `RefId<T, RawId>` instead of changing them to populated instance types.
- Prefer lazy `type` resolvers for relation fields to avoid circular imports.
- Replace standalone `@Expose()` and `@ApiProperty(...)` on computed getters with `@Prop({ kind: 'virtual', mode: 'getter', comment, hidden, optional, expose, swagger })` when the wrapper can express the same metadata.
- Replace `@Schema({ schemaOptions: { _id: false, timestamps: false } })` on value objects with `@Schema({ kind: 'embedded' })` where the defaults match.
- Replace `@Schema({ schemaOptions: { _id: true, timestamps: true } })` on embedded documents with `@Schema({ kind: 'subdocument' })` where the defaults match.
- Prefer `@Prop({ kind: 'map', type: Object })` over `@Prop({ type: Object }, PropType.MAP)` in new schemas.
- Simplify populate-one declarations from `@Prop({ kind: 'virtual', mode: 'populate', type: () => User, ref: () => User, justOne: true, ... })` to `@Prop({ ref: () => User, foreignField, localField })` when the inferred defaults are enough.
- Re-test populate and deep populate paths after migration. Consumer JSON should expose string ids, not serialized BSON or Buffer shapes.

## Plugins

`@joktec/mongo` includes package-level mongoose plugins:

- paranoid plugin: applies soft-delete filtering and handles aggregate first-stage constraints such as `$geoNear`.
- strict reference plugin: validates referenced documents for save/update/delete flows and resolves referenced models through the active connection.
- transform plugin: centralizes shared document transformation behavior without breaking Mongo update operators.

Plugins should be treated as framework behavior, not app business logic. App-specific validation belongs in app services, repositories, or schema decorators.

## Debug Output

`mongoDebug(collection, method, ...args)` renders common Mongoose debug callbacks as copyable Mongo shell commands:

```ts
mongoDebug('users', 'find', { username: 'ada' }, null, { limit: 5, sort: { createdAt: -1 } });
// db.users.find({ username: 'ada' }).sort({ createdAt: -1 }).limit(5)
```

The renderer supports common Mongo shell values such as `ObjectId(...)`, `ISODate(...)`, regular expressions, arrays, maps, buffers, projections, sort, skip, limit, and `maxTimeMS`.

## Error Contract

`MongoCatch` and Mongo exception helpers normalize common Mongoose/MongoDB failures such as validation errors, cast errors, duplicate keys, server selection failures, timeouts, transaction conflicts, and strict reference violations.

Application code should branch on stable framework-level error messages/codes rather than raw driver messages.

## Repository Layout

- `src/mongo.module.ts`: Nest module and model registration.
- `src/mongo.service.ts`: connection lifecycle service.
- `src/mongo.repo.ts`: base repository and pagination implementation.
- `src/mongo.config.ts`: config validation and defaults.
- `src/helpers`: query parsing, pipeline helpers, plugin helpers.
- `src/plugins`: Mongoose plugin hooks.
- `src/models`: schema, request, response, and options contracts.
- `src/index.ts`: public package export boundary.

## Development

```bash
yarn lint --scope @joktec/mongo
yarn build --scope @joktec/mongo
yarn test --scope @joktec/mongo
```
