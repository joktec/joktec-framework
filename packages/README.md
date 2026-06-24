# JokTec Packages

`packages/` contains reusable framework packages published under the `@joktec/*` scope.

Each package README is written for developers who want a fast GitHub-level overview before opening the source. The package source remains the implementation authority.

## Package Families

- `common`: framework core, utilities, cron helpers, and config schema tooling.
- `adapters`: cache, mail, notification, and storage adapters.
- `brokers`: Kafka, RabbitMQ, Redis-backed Redcast, and SQS messaging clients.
- `databases`: MongoDB, MySQL, ArangoDB, BigQuery, and Elasticsearch clients.
- `integrations`: third-party service integrations.
- `tools`: shared HTTP, file, and alert utilities.

## Common Package Pattern

Most runtime packages expose:

- a global Nest module such as `MongoModule`, `KafkaModule`, or `HttpModule`
- an injectable service such as `MongoService`, `KafkaService`, or `HttpService`
- a config class parsed from application config through `@joktec/core`
- optional decorators, loaders, metrics, request models, and response models

Packages should keep application-specific schemas, entities, topics, queues, and business workflows in the consuming app. The package layer provides reusable infrastructure only.

## Development

Build a package with its workspace name:

```bash
yarn build --scope @joktec/core
```

Run lint or tests the same way when the package defines the script:

```bash
yarn lint --scope @joktec/core
yarn test --scope @joktec/core
```

Package public APIs are exported from each package `src/index.ts` and emitted to `dist/index`.
