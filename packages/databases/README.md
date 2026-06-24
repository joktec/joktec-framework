# Databases

Database packages provide reusable client, config, repository, decorator, and helper layers.

Use database packages to standardize connection lifecycle, configuration, pagination contracts, repository primitives, and provider-specific helpers while keeping application schemas and entities outside the package layer.

## Packages

- `@joktec/mongo`: MongoDB/Mongoose/Typegoose client and repository helpers.
- `@joktec/mysql`: TypeORM-based SQL client and repository helpers.
- `@joktec/arango`: ArangoDB client wrapper.
- `@joktec/bigquery`: Google BigQuery client wrapper and helpers.
- `@joktec/elastic`: Elasticsearch-compatible HTTP client wrapper.

## Usage Pattern

Apps register their own models or entities in app repository modules. Database packages provide reusable clients and base repositories, but do not own application schemas.

```ts
import { MongoModule, MongoRepo } from '@joktec/mongo';
import { MysqlModule, MysqlRepo } from '@joktec/mysql';
```

## Runtime Guidelines

- Keep entity/schema definitions in consuming apps.
- Enable automatic schema/index/migration behavior only in a single owner process when multiple apps share the same database.
- Use `conId` for multi-connection setups.
- Prefer shared `@joktec/core` pagination contracts for repository-facing list APIs.
- Use package tests for repository/helper behavior and consumer harness scenarios for live stack validation.

## Development

```bash
yarn test --scope @joktec/mongo
yarn test --scope @joktec/mysql
yarn test --scope @joktec/arango
yarn test --scope @joktec/bigquery
yarn test --scope @joktec/elastic
yarn build --scope @joktec/mongo
yarn build --scope @joktec/mysql
yarn build --scope @joktec/arango
yarn build --scope @joktec/bigquery
yarn build --scope @joktec/elastic
```
