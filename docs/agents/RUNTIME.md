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

Bull Board is mounted by `BullBoardBootstrap` when `BullModule.forRoot(...)` is imported and `bull.board.enable` is true.

## Microservice Runtime

`MicroFactory`:

- parses `MicroConfig` from `micro`
- installs configured global guards, pipes, interceptors, and filters
- parses enabled transports
- calls `app.connectMicroservice(transport.getOptions(), { inheritAppConfig })`
- starts all microservices
- optionally starts an HTTP listener when `micro.httpEnable` is true

Transport models include TCP, gRPC, RMQ, Redis, MQTT, NATS, and Kafka.

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

`BullModule.forRoot` configures `@nestjs/bullmq` from `bull` config. `BullModule.registerQueue` delegates to Nest BullMQ.

`packages/common/cron` provides:

- `Crontab` decorator storing global cron metadata.
- `CrontabScheduler` that persists cron definitions, starts enabled jobs, triggers jobs manually, and records history.
- `JobWorker` for repository-backed batch job processing with retry/delay and dependency checks.

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
- Bull queues need `BullModule.forRoot(...)` before queue registration when the app expects configured Redis connection options to be used.
