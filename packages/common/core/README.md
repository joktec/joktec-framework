# @joktec/core

Core framework package for JokTec applications and reusable packages.

`@joktec/core` contains the shared NestJS infrastructure used by the rest of the framework: application bootstrap, gateway and microservice runtime factories, config, logging, metrics, exceptions, base CRUD abstractions, microservice client helpers, Swagger decorators, and pagination contracts.

## Install

```bash
yarn add @joktec/core
```

## Public Surface

- bootstrap:
  - `Application.bootstrap`
  - `GatewayModule`
  - `MicroModule`
- framework modules:
  - `ConfigModule`
  - `LoggerModule`
  - `MetricModule`
  - `JwtModule`
  - `BullModule`
  - `StaticModule`
- base abstractions:
  - `BaseService`
  - `BaseController`
  - `BaseResolver`
  - `ClientController`
  - `ClientService`
  - `AbstractClientService`
- shared contracts:
  - `IBaseRequest`
  - `IBaseRepository`
  - `IBaseService`
  - `IPaginationResponse`
  - `PaginationMode`
- pagination DTO factories:
  - `PagePaginationResponse`
  - `OffsetPaginationResponse`
  - `CursorPaginationResponse`
  - `BasePaginationResponse`
- cursor utility:
  - `CursorPagination`
- decorators, exceptions, interceptors, pipes, transport models, and selected NestJS exports.

## Bootstrap Usage

```ts
import { Application, ConfigModule, GatewayModule, LoggerModule, Module } from '@joktec/core';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule,
    GatewayModule.forRoot({ metric: true }),
  ],
})
export class AppModule {}

Application.bootstrap(AppModule);
```

Runtime mode is selected from config:

- `gateway` config enables HTTP gateway bootstrap.
- `micro` config enables microservice bootstrap.
- Both can exist when a process needs both HTTP and transport listeners.

## Base Controller Usage

`BaseController` creates standard REST endpoints for a DTO:

- `GET /`
- `POST /search`
- `GET /:id`
- `POST /`
- `PUT /:id`
- `DELETE /:id`

```ts
import { BaseController, Controller, IControllerProps } from '@joktec/core';
import { Article } from './article.schema';
import { ArticleService } from './article.service';

const props: IControllerProps<Article> = {
  dto: Article,
  paginationMode: 'offset',
  useBearer: true,
  create: { disable: true },
};

@Controller('articles')
export class ArticleController extends BaseController<Article, string>(props) {
  constructor(protected articleService: ArticleService) {
    super(articleService);
  }
}
```

`customDto.paginationDto` has priority over `paginationMode` when a controller needs a custom Swagger response DTO.

## Pagination Contract

`IBaseRequest` supports three pagination styles:

```ts
type PaginationMode = 'page' | 'offset' | 'cursor';
```

Runtime priority is:

1. cursor when `cursor` or `cursorKey` exists
2. offset when `offset` exists
3. page as the default fallback

Page response:

```ts
{
  items: T[];
  total: number;
  prevPage: number | null;
  currPage: number;
  nextPage: number | null;
  lastPage: number | null;
}
```

Offset response:

```ts
{
  items: T[];
  total: number;
  prevOffset: number | null;
  currOffset: number;
  nextOffset: number | null;
  lastOffset: number | null;
}
```

Cursor response:

```ts
{
  items: T[];
  total: number;
  hasNextPage: boolean;
  nextCursor: string | null;
}
```

`BaseController.paginationMode` controls the representative Swagger response shape. It does not force runtime clients to use only that mode.

## Cursor Pagination Utility

`CursorPagination` creates opaque base64url cursor tokens from ordered item keys. Database packages use it to resolve cursor keys, sort directions, `limit + 1` slicing, and `nextCursor` generation.

```ts
import { CursorPagination } from '@joktec/core';

const limit = CursorPagination.getLimit(query.limit);
const cursor = CursorPagination.resolve({
  cursor: query.cursor,
  cursorKey: query.cursorKey,
  defaultKeys: ['createdAt', 'id'],
  tieBreakerKeys: ['id'],
  sort: query.sort,
});
```

## External Client Pattern

Reusable packages that manage external systems normally extend `AbstractClientService` and use `ClientConfig`. This preserves shared config validation, `conId` multi-connection support, lifecycle hooks, and retry/debug behavior.

## Repository Layout

- `src/abstractions`: base services, controllers, resolvers, and client factories.
- `src/infras`: application, gateway, and microservice runtime factories.
- `src/modules`: config, logger, metrics, JWT, Bull, and static assets modules.
- `src/models`: shared DTO, request, response, repository, and pagination contracts.
- `src/decorators`: HTTP, Swagger, metric, and transport decorators.
- `src/exceptions`, `src/interceptors`, `src/pipes`: cross-cutting runtime concerns.
- `src/index.ts`: public package export boundary.

## Development

```bash
yarn lint --scope @joktec/core
yarn build --scope @joktec/core
yarn test --scope @joktec/core
```
