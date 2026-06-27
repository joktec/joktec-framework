# Runtime

Baseline: current stable implementation.

## Bootstrap

App entrypoints call `Application.bootstrap(AppModule)` after extending Day.js plugins.

`Application.bootstrap` creates a Nest Express application with buffered logs, installs pino logging, resolves `ConfigService`, then routes runtime setup:

- if `gateway` config exists, run `GatewayFactory.bootstrap`
- if `micro` config exists, run `MicroFactory.bootstrap`
- otherwise log an error and exit

Process signal, uncaught exception, and unhandled rejection handlers are registered during bootstrap.

## Gateway Runtime

`GatewayFactory`:

- parses `GatewayConfig` from `gateway`
- sets global prefix from `contextPath`
- installs JSON and URL-encoded body parsers with `50mb` limits
- installs configured global guards, pipes, interceptors, and filters
- sets up Swagger when enabled
- sets static assets and HBS view engine when static config exists
- applies CSRF, CORS, and Helmet when configured
- listens on `gateway.port`

Bull Board is mounted by `BullBoardBootstrap` when `BullModule.forRoot(...)` is imported and the final Bull Board config has `board.enable` set.

Gateway examples keep database auto schema/index behavior disabled so the gateway can run as the HTTP-facing process without owning database mutation concerns.

## Gateway Request Normalization

`ExpressInterceptor` owns the shared HTTP request boundary for gateway apps.

During interception it:

- snapshots raw `query`, `body`, and `params` into `res.locals`
- resolves locale, timezone, user agent, and GeoIP metadata
- casts query-string primitives before controllers read `req.query`
- normalizes `GET` and `POST` search bodies for routes ending in `/search`
- wraps successful handler output in the standard JokTec response envelope

Query casting handles booleans, numbers, `null`, `undefined`, JSON object/array strings, and date strings. Date casting is intentionally guarded by operator/path context so arbitrary string ids, slugs, and codes are not promoted to `Date`.

Search-body casting is narrower than query casting. JSON request bodies already preserve booleans, numbers, and nulls, so the default search-body policy only casts date-like strings.

Express 5 exposes `req.query` as a getter. The core interceptor replaces it with a normalized value using `Object.defineProperty` after resolving the query contract.

## Microservice Runtime

`MicroFactory`:

- parses `MicroConfig` from `micro`
- installs configured global guards, pipes, interceptors, and filters
- parses enabled transports
- calls `app.connectMicroservice(transport.getOptions(), { inheritAppConfig })`
- starts all microservices
- optionally starts an HTTP listener when `micro.httpEnable` is true

Transport models include TCP, gRPC, RMQ, Redis, MQTT, NATS, and Kafka.

Micro examples own database auto index/sync behavior and can expose HTTP only when `micro.httpEnable` is enabled. This keeps schema/index initialization in one runtime process while the gateway remains focused on request handling.

## Mongo Runtime

Mongo connection options are merged as framework defaults, then `config.options`, then query-style `config.params`. Duplicate connection keys in `params` override `options`, so deployment-specific connection-string parameters can take final precedence.

When Mongo `autoIndex` is enabled, `MongoService` registers Typegoose models, checks index drift with `diffIndexes()`, and calls `syncIndexes({ continueOnError: true })` only when Mongo reports indexes to create or drop. Sync errors are caught and logged with connection/schema context.

Only one owner process should enable Mongo `autoIndex` for a shared database. Request-facing clusters should keep it disabled.

## Client Lifecycle

Most clients extend `AbstractClientService`.

Lifecycle:

1. `onModuleInit` sets logger context.
2. `onApplicationBootstrap` reads config by service key.
3. Config may be a single object or list.
4. `conId` selects the connection identity.
5. Config is validated.
6. `init` creates the native client.
7. `start` opens or prepares runtime resources.
8. `onModuleDestroy` stops all clients.

## Queues and Workers

`BullModule.forRoot` configures `@nestjs/bullmq` from framework defaults, module options, and external config. Final precedence is `default < BullModule.forRoot(...) < config.yml`, so an app can keep Redis connection values in `bull` config while setting Bull Board options such as `board.enable` and `board.queues` in the module call. `BullModule.registerQueue` delegates to Nest BullMQ.

Gateway static asset exclusions use the same final Bull config, so the Bull Board route is not swallowed by static serving when board options come from `BullModule.forRoot(...)`.

`packages/common/cron` provides:

- `Crontab` decorator storing global cron metadata.
- `CrontabScheduler` that persists cron definitions, starts enabled jobs, triggers jobs manually, and records history.
- `JobWorker` for repository-backed batch job processing with retry/delay and dependency checks.

## Pagination Runtime

List requests use a shared request model. Runtime precedence is:

1. cursor pagination when `cursor` or `cursorKey` is present
2. offset pagination when `offset` is present
3. page pagination as the default fallback

Cursor pagination uses `limit + 1` fetching to determine `hasNextPage` and generates `nextCursor` from the last displayed item. Mongo builds lexicographic `$or` cursor conditions. MySQL builds lexicographic SQL conditions through TypeORM query builders.

## Broker Runtime

Broker services manage native clients and metrics. Consumers are usually registered by decorators plus loader classes:

- Kafka: `KafkaConsume`, `KafkaSend`
- RabbitMQ: `RabbitConsume`, `RabbitSend`, `RabbitExchange`
- Redcast: Redis list/stream/pubsub wrappers
- SQS: queue/topic send, publish, consume wrappers

Loaders resolve decorated service instances through Nest `ModuleRef` after module initialization.

## Runtime Constraints

- Runtime behavior is config-driven.
- External clients require valid config sections.
- Multiple connections use `conId`.
- Gateway and micro modes are selected by config presence.
- Bull queues need `BullModule.forRoot(...)` before queue registration when the app expects configured Redis connection options or Bull Board options to be used.
