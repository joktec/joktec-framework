# JokTec Packages

`packages/` contains reusable framework packages published under the `@joktec/*` scope.

## Package Families

- `common`: framework core, utilities, cron helpers, and config schema tooling.
- `adapters`: cache, mail, notification, and storage adapters.
- `brokers`: Kafka, RabbitMQ, Redis-backed Redcast, and SQS messaging clients.
- `databases`: MongoDB, MySQL, ArangoDB, BigQuery, and Elasticsearch clients.
- `integrations`: third-party service integrations.
- `tools`: shared HTTP, file, and alert utilities.

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
