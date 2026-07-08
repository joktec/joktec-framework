# Contracts

Baseline: current stable implementation.

## REST Controller Contract Pattern

`BaseController` creates standard REST endpoints for a DTO:

- `GET /`: paginate/list
- `POST /search`: search when `paginate.search` is enabled
- `GET /:id`: detail
- `POST /`: create
- `PUT /:id`: update
- `DELETE /:id`: delete

Endpoint visibility and behavior are controlled through `IControllerProps`: `hidden`, `disable`, `guards`, `pipes`, `hooks`, `filters`, `decorators`, `useBearer`, and `useApiKey`.

Create uses `BaseValidationPipe()`. Update uses `BaseValidationPipe({ skipMissingProperties: true })`.

`IControllerProps.paginate.mode` controls the generated pagination response shape for Swagger. Supported modes are `page`, `offset`, and `cursor`; the default is `page`. If `customDto.paginationDto` is provided, that custom DTO remains the response contract for the generated list/search endpoints.

Swagger intentionally exposes one representative pagination shape per controller. It does not use `oneOf` for page/offset/cursor responses.

## REST Sub-Resource Contract Pattern

`SubController` creates nested REST endpoints for parent-child resources:

- `GET /`: paginate/list children scoped to parent
- `POST /search`: search children scoped to parent when `paginate.search` enabled
- `GET /:childId`: child detail scoped to parent
- `POST /`: create child under parent
- `PUT /:childId`: update child under parent
- `DELETE /:childId`: delete child under parent

Default parent param is `id`; default child param is `childId`. Apps may override param names and parsers through `ISubControllerProps`.

`SubController` delegates to `IBaseSubService`. It does not decide whether data is embedded, subdocument, or relation-backed; that rule belongs to the app service/repository implementation.

## Gateway Request Normalization Contract

Gateway controllers receive the normalized request shape produced by `ExpressInterceptor`.

For query strings:

- primitive string values are cast to booleans, numbers, `null`, or omitted `undefined` when safe
- JSON object/array strings are parsed
- date strings are cast only for date-like fields or comparison operators such as `$eq`, `$gt`, `$gte`, `$lt`, and `$lte`
- `condition` and `sort` default to empty objects
- `limit`, `offset`, `page`, and `language` are normalized for base controller consumers

For `GET` and `POST` routes ending in `/search`, request bodies are normalized with a narrower policy that only promotes date-like strings. Create/update bodies are not globally recast by the interceptor.

Applications should customize request behavior by overriding resolver methods on `ExpressInterceptor`, especially `resolverLanguage`, `resolverTimezone`, `resolverQuery`, `resolverSearchBody`, and `transformResponse`. `resolverRequestCastOptions` is the lower-level extension point for changing cast policy.

## Pagination Request and Response Contracts

`IBaseRequest` supports shared query fields:

- `page`, `limit`
- `offset`, `limit`
- `cursor`, `cursorKey`, `limit`
- `select`, `keyword`, `condition`, `language`, `sort`, `near`, `populate`

Runtime pagination priority is cursor, then offset, then page. Cursor mode is selected when `cursor` or `cursorKey` is present.

Pagination responses share `items` and `total`, then add mode-specific metadata:

- page: `prevPage`, `currPage`, `nextPage`, `lastPage`
- offset: `prevOffset`, `currOffset`, `nextOffset`, `lastOffset`
- cursor: `hasNextPage`, `nextCursor`

## Microservice Controller Contract Pattern

`ClientController` creates message handlers:

- `{ cmd: "Entity.paginate" }`
- `{ cmd: "Entity.detail" }`
- `{ cmd: "Entity.create" }`
- `{ cmd: "Entity.update" }`
- `{ cmd: "Entity.delete" }`

Transport defaults to TCP unless set in `IMicroControllerProps`.

`SubClientController` creates nested message handlers:

- `{ cmd: "Parent.Child.paginate" }`
- `{ cmd: "Parent.Child.detail" }`
- `{ cmd: "Parent.Child.create" }`
- `{ cmd: "Parent.Child.update" }`
- `{ cmd: "Parent.Child.delete" }`

Nested payloads use `{ parentId, req }`, `{ parentId, childId, req }`, `{ parentId, dto }`, `{ parentId, childId, dto }`, and `{ parentId, childId }`.

`ClientController` and `SubClientController` support current `dto` payloads and legacy `entity` payloads for create/update. Validation is applied to the selected payload object, not to both fields independently.

## Gateway Implemented API Areas

The gateway app implements feature controllers under:

- `articles`
- `artists`
- `assets`
- `auth`
- `blocks`
- `categories`
- `comments`
- `connections`
- `contents`
- `data-logs`
- `emotions`
- `inquiries`
- `notifications`
- `otpLogs`
- `posts`
- `profile-badges`
- `profile`
- `reports`
- `sessions`
- `settings`
- `tags`
- `users`

Many controllers extend `BaseController` and add custom routes.

`profile-badges` uses the base CRUD contract for the MySQL-backed badge catalog and adds `PATCH /profile-badges/:id/users` to assign a badge id to a Mongo user profile.

## Micro Implemented Message Areas

The micro app implements controllers under:

- `articles`
- `artists`
- `assets`
- `crons`
- `notifications`
- `otpLogs`
- `users`

Article micro handlers include Redis `EventPattern` handlers for `Article.summary` and `Article.view`.

## Repository Contract

`IBaseRepository` defines:

- `paginate`
- `find`
- `count`
- `findOne`
- `create`
- `update`
- `delete`
- `restore`
- `upsert`
- `bulkUpsert`

Mongo and MySQL repositories implement this shape with database-specific query parsing.

Mongo cursor pagination defaults to `_id` and adds `_id` as a tie-breaker when a custom `cursorKey` is used.

Mongo repository stream contract uses `MongoRepo.watch(pipeline?, options?)` for model-level MongoDB Change Streams. This is realtime database listening and is separate from `MongoRepo.cursor(...)`, which iterates large query results. Stream availability is checked through `MongoService.getCoverage(...)` and `MongoService.assertCoverage('stream', conId)`.

MySQL cursor pagination defaults to `createdAt` plus primary key columns and validates cursor keys against TypeORM column metadata.

## Client Contract

`Client<Config, NativeClient>` exposes:

- `getConfig(conId)`
- `getClient(conId)`

`AbstractClientService` adds lifecycle semantics but concrete packages own provider-specific methods.

`MongoClient` additionally exposes `getCoverage(...)`, `assertCoverage(...)`, `startTransaction(...)`, and database-level `watch(...)`. Transaction and stream methods fail fast when coverage reports unsupported topology.

## Config Contract

Config classes use validation decorators and are parsed through `ConfigService`. External client packages generally read config by service key, such as `mongo`, `mysql`, `http`, `kafka`, `rabbit`, `cacher`, and `bull`.

## Generated Schema Contract

`packages/common/types/config.schema.json` is a generated schema artifact. It must reflect the stable implementation only.
