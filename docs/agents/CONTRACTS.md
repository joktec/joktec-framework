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

`IControllerProps.paginationMode` controls the generated pagination response shape for Swagger. Supported modes are `page`, `offset`, and `cursor`; the default is `page`. If `customDto.paginationDto` is provided, that custom DTO remains the response contract for the generated list/search endpoints.

Swagger intentionally exposes one representative pagination shape per controller. It does not use `oneOf` for page/offset/cursor responses.

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

MySQL cursor pagination defaults to `createdAt` plus primary key columns and validates cursor keys against TypeORM column metadata.

## Client Contract

`Client<Config, NativeClient>` exposes:

- `getConfig(conId)`
- `getClient(conId)`

`AbstractClientService` adds lifecycle semantics but concrete packages own provider-specific methods.

## Config Contract

Config classes use validation decorators and are parsed through `ConfigService`. External client packages generally read config by service key, such as `mongo`, `mysql`, `http`, `kafka`, `rabbit`, `cacher`, and `bull`.

## Generated Schema Contract

`packages/common/types/config.schema.json` is a generated schema artifact. It must reflect the stable implementation only.
