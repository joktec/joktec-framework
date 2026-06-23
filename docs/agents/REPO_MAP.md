# Repository Map

Baseline: current stable implementation.

## Root

- `package.json`: workspace scripts, Lerna/Nx orchestration, shared dev dependencies.
- `nx.json`: Nx workspace layout and cacheable targets.
- `tsconfig.json`: root TypeScript compiler defaults.
- `yarn.lock`: dependency lockfile.
- `apps/`: runnable example applications.
- `packages/`: reusable JokTec packages.

## Apps

`apps/AGENTS.md`
- Shared agent guidance for runnable applications.

`apps/example-gateway`
- HTTP gateway example.
- Entry: `src/main.ts`.
- Composition: `src/app.module.ts`.
- Local agent guide: `apps/example-gateway/AGENTS.md`.
- Feature modules: `src/modules/*`.
- Repositories: `src/repositories/*`.
- Models: `src/models/*`.
- Common HTTP concerns: `src/common/*`.

`apps/example-micro`
- Microservice/worker example.
- Entry: `src/main.ts`.
- Composition: `src/app.module.ts`.
- Local agent guide: `apps/example-micro/AGENTS.md`.
- Feature modules: `src/modules/*`.
- Shared module: `src/shared/shared.module.ts`.
- Repositories and models mirror the gateway example.

## Packages

Package-family agent guides:

- `packages/common/AGENTS.md`
- `packages/adapters/AGENTS.md`
- `packages/brokers/AGENTS.md`
- `packages/databases/AGENTS.md`
- `packages/integrations/AGENTS.md`
- `packages/tools/AGENTS.md`

`packages/common/core`
- Framework core: bootstrap, abstractions, config, logger, metrics, exceptions, transports, Bull, JWT, static assets.
- Pagination contracts and cursor helpers: `src/models/paginations/*`.
- Local agent guide: `packages/common/core/AGENTS.md`.

`packages/common/utils`
- Conversion helpers, generators, validators, class-validator/class-transformer exports.

`packages/common/cron`
- Cron decorators, scheduler, job worker, job queue abstractions.

`packages/common/types`
- Type/config schema generation package.
- Local agent guide: `packages/common/types/AGENTS.md`.

`packages/adapters/cacher`
- Cache service with local, Redis, and Memcached stores.

`packages/adapters/mailer`
- Mailer service and transport config.

`packages/adapters/notifier`
- Push notification adapter configs and service.

`packages/adapters/storage`
- Storage service and file metadata helpers.

`packages/brokers/kafka`
- Kafka client, decorators, loaders, metrics.

`packages/brokers/rabbit`
- RabbitMQ client, decorators, auto-binding, metrics.

`packages/brokers/redcast`
- Redis-backed broker wrapper for list, stream, and pub/sub behavior.

`packages/brokers/sqs`
- AWS SQS/SNS queue and topic wrapper.

`packages/databases/mongo`
- Mongoose/Typegoose config, service, decorators, repository, helpers, plugins, and cursor pagination implementation.

`packages/databases/mysql`
- TypeORM config, service, repository, naming strategy, helpers, and cursor pagination implementation.

`packages/databases/arango`, `bigquery`, `elastic`
- Client packages for additional data systems.

`packages/integrations/firebase`, `gpt`
- Third-party integrations.

`packages/tools/http`, `file`, `alert`
- Shared utility services.
