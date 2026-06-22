# Adapters Agent Guide

This guide applies to `packages/adapters/*`.

## Scope

Adapters expose pluggable external capability wrappers:

- `cacher`: cache stores.
- `mailer`: mail delivery.
- `notifier`: push notifications.
- `storage`: object storage.

## Boundary Rules

- Adapters may depend on `@joktec/core` and `@joktec/utils`.
- Adapters must stay app-neutral and should not import from `apps/`.
- Prefer `AbstractClientService` for client lifecycle, multi-connection `conId`, config parsing, retry, and destroy hooks.
- Keep config classes validated with decorators from `@joktec/utils`.
- Export public APIs through `src/index.ts`.

## Runtime Pattern

- Modules are global Nest modules.
- Services own native client creation and service-specific operations.
- Config is read by service key from application config.
- Metrics and decorators live with the adapter when present.

## Verification

Use package-scoped commands:

```bash
yarn build --scope @joktec/cacher
yarn build --scope @joktec/mailer
yarn build --scope @joktec/notifier
yarn build --scope @joktec/storage
```
