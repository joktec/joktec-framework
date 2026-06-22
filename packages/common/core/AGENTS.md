# Core Package Agent Guide

This package is the framework hub. Changes here have broad blast radius.

## Read First

- `src/index.ts`: public package exports.
- `src/infras/application.ts`: bootstrap entry.
- `src/infras/gateway/*`: HTTP gateway runtime.
- `src/infras/micro/*`: microservice runtime.
- `src/abstractions/*`: base services/controllers/resolvers and client factories.
- `src/client/abstract-client.service.ts`: external client lifecycle.
- `src/modules/*`: config, logger, metrics, JWT, Bull, static assets.

## Boundary Rules

- Do not import app code or concrete adapters/brokers/databases into core.
- Keep core primitives reusable and framework-level.
- Preserve NestJS compatibility and existing re-export patterns.
- Preserve `conId`, config parsing, lifecycle, and retry behavior in client abstractions.
- Export public symbols through `src/index.ts` and family index files.

## Runtime Rules

- `Application.bootstrap` owns process-level bootstrap and lifecycle hooks.
- Gateway runtime remains in `GatewayFactory` and `GatewayModule`.
- Micro runtime remains in `MicroFactory` and `MicroModule`.
- Bull root configuration and Bull Board bootstrap live under `src/modules/bull`.
- Global middleware, interceptors, filters, and metrics must stay config-aware.

## Verification

```bash
yarn build --scope @joktec/core
yarn test --scope @joktec/core
yarn madge --scope @joktec/core
```
