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

`@joktec/mongo` is the schema-first Mongo layer. It wraps Mongoose/Typegoose schemas, `Schema`/`Prop` metadata inference, multi-connection model registration, Mongo repositories, query helpers, debug rendering, exception mapping, and plugins for paranoid soft delete, strict reference checks, and transformation.

`@joktec/mysql` is the schema-first relational layer. It wraps TypeORM entities, connection lifecycle, MySQL/MariaDB/Postgres dialect capabilities, repository query building, normalized driver exceptions, and decorators that combine TypeORM column metadata with validation, transform, and Swagger metadata.

Apps compose packages, define schemas/entities, repositories, controllers, services, guards, interceptors, and feature modules.

## Wrapper Philosophy

JokTec packages wrap proven libraries to standardize framework conventions, not to hide the underlying ecosystem completely. Wrappers should reduce repeated setup, decorator stacks, lifecycle code, config parsing, query safety checks, and response contracts while preserving escape hatches to the native library when a project needs advanced behavior.

Schema-first database wrappers follow this rule most strongly:

- entity/schema classes should be reusable as DTO metadata sources when practical
- wrapper decorators should infer validation, transform, and Swagger metadata from one declaration
- wrapper decorators may infer common modes when source metadata is explicit, such as Mongo virtual populate from `ref`, `localField`, and `foreignField`
- package-specific semantics should use shared names where possible, such as `immutable` for API read-only metadata across Mongo and MySQL
- storage write behavior remains storage-specific, such as TypeORM `update: false` for relational columns
- rare native features should remain available through raw TypeORM or Mongoose/Typegoose instead of forcing the wrapper to model every edge case

## Communication Patterns

Gateway controllers call services and repositories directly for HTTP behavior. Gateway services also emit microservice events through injected `ClientProxy` instances.

Microservice controllers use `EventPattern` and `MessagePattern` handlers. Broker packages additionally provide decorators such as `KafkaSend`, `RabbitSend`, `RedcastSend`, and `SqsSend`.

## Pagination Architecture

`IBaseRequest` accepts page, offset, and cursor query fields. Runtime precedence is cursor first, then offset, then page. If none is provided, `BaseService` defaults to page pagination.

`BaseController` exposes a `paginationMode` option for Swagger and response DTO selection. The mode defaults to `page`. `offset` and `cursor` select one representative OpenAPI response shape. A custom `customDto.paginationDto` still overrides the generated shape.

Cursor pagination is backed by opaque base64url cursor tokens that store ordered key values. Mongo defaults to `_id` and appends `_id` as a tie-breaker for custom keys. MySQL defaults to `createdAt` plus primary key columns and validates cursor keys against TypeORM metadata.

## Example Cross-Store Pattern

The example applications model a fictional social-network feature named `profile-badges`. The badge catalog is a relational entity backed by MySQL, while user badge assignment is stored on Mongo user profiles through `profileBadgeIds`. This keeps SQL catalog-style data and Mongo social profile state separate while exercising both database packages in one realistic consumer flow.

## Technical Debt Boundary

Unfinished work is not architecture truth. See `docs/agents/tasks/001-in-progress-technical-debt.md`.
