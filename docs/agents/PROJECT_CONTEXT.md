# Project Context

Baseline: current stable implementation.

JokTec is a reusable microservices framework implemented as a Yarn workspace monorepo with Lerna and Nx. It provides shared NestJS infrastructure packages plus example gateway and microservice applications.

## Stable Snapshot

- Package manager: Yarn workspaces.
- Monorepo tools: Lerna, Nx.
- Runtime framework: NestJS.
- Language: TypeScript.
- Package groups: apps, adapters, brokers, common, databases, integrations, tools.
- Stable apps: `apps/example-gateway`, `apps/example-micro`.
- Published-style packages use `dist/index` as package entry.

## What Exists Now

- Gateway bootstrap with Swagger, static assets, security middleware, and metrics.
- BullMQ root configuration and Bull Board support through `BullModule`.
- Microservice bootstrap with configurable Nest transports.
- Shared config, logging, metrics, exceptions, validation, and base CRUD abstractions.
- Standard page, offset, and cursor pagination contracts in `@joktec/core`.
- Client lifecycle abstraction for external systems.
- Mongo and MySQL repository implementations with page/offset pagination and cursor-based keyset pagination.
- Mongo hardening for multi-connection model resolution, safer query parsing, plugin behavior, shell-friendly debug output, and ObjectId normalization on read responses.
- MySQL hardening for TypeORM connection lifecycle, schema-first column decorators, uuidv7 primary keys, dialect capabilities, strict query parsing, and normalized driver errors.
- Broker packages for Kafka, RabbitMQ, Redcast, and SQS.
- Adapter packages for cache, mailer, notifier, and storage.
- Cron and job worker abstractions.
- Package-level Jest coverage for core framework primitives, utilities, cron, adapters, brokers, databases, integrations, and tools.
- Consumer integration harness under `test/consumer/` for example-gateway/example-micro smoke, database, Redis transport, and broker scenarios.
- Example application modules using repositories, controllers, services, guards, interceptors, i18n, and message events.
- Example social-network badge flow through `profile-badges`, where MySQL stores the badge catalog and Mongo user profiles store assigned badge ids.

## Current Documentation Version

Agent Docs use `docs/agents/CHANGELOG.md` for meaningful agent-facing history. Package release history belongs in each package `CHANGELOG.md`.
