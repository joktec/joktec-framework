# Example Gateway Agent Guide

This app is the public HTTP gateway reference for a fictional social-network project. The domain is intentionally realistic for framework testing, but it is not a real product.

## Read First

- `src/main.ts`: runtime entry point.
- `src/app.module.ts`: package composition and global providers.
- `config.yml`: app runtime configuration.
- `src/modules/main.module.ts`: feature module aggregation.
- `src/repositories/repository.module.ts`: Mongo/MySQL model registration.

## Architecture

- HTTP controllers live in `src/modules/*/*.controller.ts`.
- Services usually extend `BaseService` from `@joktec/core`.
- Most repositories extend `MongoRepo`; `ProductRepo` extends `MysqlRepo`.
- Shared app guards, filters, interceptors, decorators, and response types live under `src/common`.
- Broker consumer examples are in `src/modules/articles/article.handler.ts`.
- `articles` and `comments` model mobile load-more APIs with offset pagination.
- `dataLogs` exposes read-only pino Mongo logs with cursor pagination.

## Package Composition

`AppModule` composes core gateway infrastructure, Bull, HTTP, Firebase, cache, Kafka, RabbitMQ, Redcast, SQS, repositories, feature modules, and i18n.

## Constraints

- Keep this app as a complete reference setup.
- Do not move app-specific schemas or repositories into reusable packages.
- Do not remove package wiring only because a local stack is unavailable.
- Do not commit real credentials in `_credentials`; use example or placeholder files only.

## Useful Searches

```bash
rg -n "BaseController|BaseService|MongoRepo|MysqlRepo" apps/example-gateway/src
rg -n "KafkaConsume|RabbitConsume|RedcastConsume|SqsConsume" apps/example-gateway/src
rg -n "GatewayModule|BullModule|RepositoryModule" apps/example-gateway/src/app.module.ts
```
