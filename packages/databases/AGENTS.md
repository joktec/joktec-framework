# Databases Agent Guide

This guide applies to `packages/databases/*`.

## Scope

Database packages expose client modules, services, config classes, repositories, helpers, and decorators for supported stores:

- `mongo`
- `mysql`
- `arango`
- `bigquery`
- `elastic`

## Boundary Rules

- Database packages may depend on `@joktec/core` and `@joktec/utils`.
- `elastic` also uses `@joktec/http`.
- Database packages must not contain app schemas or app-specific queries.
- Apps register models/entities through module options and extend repository classes.
- Preserve `conId` support for multi-connection setups.

## Runtime Pattern

- Services extend `AbstractClientService`.
- Mongo and MySQL provide repository base classes.
- Mongo and MySQL modules expose `forRoot(...)` to register app models/entities.
- Mongo and MySQL execute cursor pagination as storage-specific keyset pagination while reusing `@joktec/core` request and response contracts.
- Config classes define the accepted runtime config shape.

## Verification

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
