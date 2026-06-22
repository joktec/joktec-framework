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

- Gateway bootstrap with Swagger, static assets, security middleware, metrics, and Bull Board support.
- Microservice bootstrap with configurable Nest transports.
- Shared config, logging, metrics, exceptions, validation, and base CRUD abstractions.
- Client lifecycle abstraction for external systems.
- Mongo and MySQL repository implementations.
- Broker packages for Kafka, RabbitMQ, Redcast, and SQS.
- Adapter packages for cache, mailer, notifier, and storage.
- Cron and job worker abstractions.
- Example application modules using repositories, controllers, services, guards, interceptors, i18n, and message events.

## Not Baseline

Unfinished work is not part of the stable snapshot. This includes the incomplete relocation of Bull Board setup into `BullModule` and HTTP cookie dependency additions. These are tracked only as technical debt in `docs/agents/tasks/`.

## Current Documentation Version

This is the first version of the Agent Documentation system. `CHANGELOG.md` records only the documented stable baseline.
