# Example Microservice Agent Guide

This app is the private microservice and worker reference for the same fictional social-network project as the gateway. It models background jobs, broker handlers, and private service APIs, not a real product.

## Read First

- `src/main.ts`: runtime entry point.
- `src/app.module.ts`: package composition and global providers.
- `config.yml`: app runtime configuration.
- `src/modules/main.module.ts`: feature module aggregation.
- `src/shared/shared.module.ts`: shared repository exports.
- `src/repositories/repository.module.ts`: Mongo schema and MySQL entity registration.

## Architecture

- Micro controllers use `ClientController`, `EventPattern`, and `MessagePattern`.
- Services usually extend `BaseService` from `@joktec/core`.
- Repositories extend `MongoRepo` or `MysqlRepo` depending on the backing store.
- Cron examples live in `src/modules/crons` and `src/modules/artists/artist.cronner.ts`.
- Broker producer examples are in `src/modules/articles/article.handler.ts`.
- Use this app to understand private/admin-style flows, scheduled processing, and centralized outbound integrations such as mail or notifications.
- This app is the owner process for database auto index/sync in the example stack. The gateway should stay request-facing and avoid automatic schema/index mutation.

## Package Composition

`AppModule` composes core microservice infrastructure, HTTP, Firebase, notifier, cache, Kafka, RabbitMQ, Redcast, SQS, repositories, feature modules, and i18n.

## Constraints

- Keep this app as a complete reference setup.
- Preserve broker, cron, repository, and transport examples unless replacing them with equivalent reference coverage.
- Do not move app-specific schemas or repositories into reusable packages.

## Useful Searches

```bash
rg -n "ClientController|MessagePattern|EventPattern|MicroModule" apps/example-micro/src
rg -n "ProfileBadge|profileBadgeIds|MysqlRepo|MongoRepo" apps/example-micro/src
rg -n "Crontab|CrontabScheduler|CronScheduler" apps/example-micro/src packages/common/cron/src
rg -n "KafkaSend|RabbitSend|RedcastSend|SqsSend" apps/example-micro/src
```
