# Databases

Database packages provide reusable client, config, repository, decorator, and helper layers.

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

## Development

```bash
yarn build --scope @joktec/mongo
yarn build --scope @joktec/mysql
yarn build --scope @joktec/arango
yarn build --scope @joktec/bigquery
yarn build --scope @joktec/elastic
```
