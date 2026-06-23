# Architecture

Baseline: current stable implementation.

JokTec is a NestJS TypeScript monorepo for reusable microservice infrastructure. It is not a business application. The repository contains framework packages under `packages/` and example applications under `apps/`.

## System Shape

- `apps/example-gateway`: HTTP gateway example.
- `apps/example-micro`: microservice/worker example.
- `packages/common/core`: central framework layer.
- `packages/common/utils`: low-level helpers, conversion utilities, validators.
- `packages/common/cron`: cron and job worker abstractions.
- `packages/adapters/*`: cache, mail, notifier, storage adapters.
- `packages/brokers/*`: Kafka, RabbitMQ, Redcast, SQS clients and decorators.
- `packages/databases/*`: Mongo, MySQL, Arango, BigQuery, Elastic clients.
- `packages/integrations/*`: Firebase and GPT integrations.
- `packages/tools/*`: HTTP, file, alert utilities.

## Dependency Flow

Stable direction:

```text
apps/*
  -> @joktec/* concrete packages
  -> @joktec/core
  -> @joktec/utils
```

Most concrete packages depend only on `@joktec/core` and `@joktec/utils`. `@joktec/elastic` also depends on `@joktec/http`. `@joktec/types` aggregates many package types for schema generation.

## Core Abstractions

- `Application.bootstrap`: creates the Nest app and selects gateway or micro bootstrap from config.
- `GatewayModule` / `GatewayFactory`: HTTP server, Swagger, static views, and security middleware.
- `BullModule` / `BullBoardBootstrap`: BullMQ root configuration, queue registration delegates, and Bull Board dashboard mounting.
- `MicroModule` / `MicroFactory`: microservice transport binding and optional HTTP listener.
- `AbstractClientService`: common lifecycle for external clients with config validation, multi-connection `conId`, start/stop hooks, retry support.
- `ClientConfig`: base config with `conId`, `inherit`, `initTimeout`, `retry`, and `debug`.
- `BaseService`: generic CRUD service over `IBaseRepository`.
- `BaseController`: generated REST CRUD controller factory.
- Pagination contracts: page, offset, and cursor response factories plus cursor token utilities under `packages/common/core/src/models/paginations`.
- `ClientController`: generated microservice message-pattern CRUD controller factory.
- `ClientService`: generated client-side microservice proxy service.
- `TransportProxyFactory`: creates Nest `ClientProxy` instances from named transport config.

## Module Boundaries

`packages/common/core` owns framework primitives and re-exports Nest building blocks. It should not depend on adapters, brokers, integrations, or app code.

Adapters wrap external capabilities such as cache, mail, notification, and storage. They expose global Nest modules and services.

Brokers wrap messaging clients and decorator-driven producer/consumer registration. Broker packages do not own app message semantics.

Database packages own client connections and repository abstractions. App repositories extend database repositories and add app-specific queries. Mongo and MySQL repositories implement storage-specific cursor pagination through keyset conditions while keeping the shared request and response contract in `@joktec/core`.

Apps compose packages, define schemas/entities, repositories, controllers, services, guards, interceptors, and feature modules.

## Communication Patterns

Gateway controllers call services and repositories directly for HTTP behavior. Gateway services also emit microservice events through injected `ClientProxy` instances.

Microservice controllers use `EventPattern` and `MessagePattern` handlers. Broker packages additionally provide decorators such as `KafkaSend`, `RabbitSend`, `RedcastSend`, and `SqsSend`.

## Pagination Architecture

`IBaseRequest` accepts page, offset, and cursor query fields. Runtime precedence is cursor first, then offset, then page. If none is provided, `BaseService` defaults to page pagination.

`BaseController` exposes a `paginationMode` option for Swagger and response DTO selection. The mode defaults to `page`. `offset` and `cursor` select one representative OpenAPI response shape. A custom `customDto.paginationDto` still overrides the generated shape.

Cursor pagination is backed by opaque base64url cursor tokens that store ordered key values. Mongo defaults to `_id` and appends `_id` as a tie-breaker for custom keys. MySQL defaults to `createdAt` plus primary key columns and validates cursor keys against TypeORM metadata.

## Technical Debt Boundary

Unfinished work is not architecture truth. See `docs/agents/tasks/001-in-progress-technical-debt.md`.
