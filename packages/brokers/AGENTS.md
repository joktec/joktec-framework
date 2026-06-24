# Brokers Agent Guide

This guide applies to `packages/brokers/*`.

## Scope

Brokers expose messaging clients and decorator-driven producer/consumer registration:

- `kafka`
- `rabbit`
- `redcast`
- `sqs`

## Boundary Rules

- Brokers may depend on `@joktec/core` and `@joktec/utils`.
- Broker packages must not own app message semantics.
- Decorators define transport wiring; apps define business handlers.
- Preserve `conId` support and config-driven connection selection.
- Export public APIs through `src/index.ts`.

## Runtime Pattern

- Services extend `AbstractClientService`.
- Loader classes discover decorator metadata after module initialization.
- Metrics providers count send/publish operations where implemented.
- RabbitMQ and SQS support module `forRoot(...)` options for auto-binding metadata.

## Verification

Use package-scoped commands:

```bash
yarn test --scope @joktec/kafka
yarn test --scope @joktec/rabbit
yarn test --scope @joktec/redcast
yarn test --scope @joktec/sqs
yarn build --scope @joktec/kafka
yarn build --scope @joktec/rabbit
yarn build --scope @joktec/redcast
yarn build --scope @joktec/sqs
```
