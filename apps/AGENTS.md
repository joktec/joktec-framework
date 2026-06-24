# Apps Agent Guide

This guide applies to runnable applications under `apps/`.

## Scope

- `apps/example-gateway`: full HTTP gateway reference application.
- `apps/example-micro`: full microservice and worker reference application.

These apps are implementation examples and runtime verification surfaces for framework packages. Keep their setup complete enough to show how packages are composed in real services.

## Boundaries

- Apps may depend on `@joktec/*` packages.
- Packages must not depend on app code.
- App schemas, repositories, controllers, guards, interceptors, and handlers are app-owned examples.
- Shared framework behavior belongs in `packages/`, not in app-local helpers.

## Runtime Pattern

- Entry points call `Application.bootstrap(AppModule)` from `@joktec/core`.
- `ConfigModule.forRoot(...)` loads app config.
- `LoggerModule`, `GatewayModule` or `MicroModule`, adapters, brokers, integrations, repositories, and feature modules are composed in `AppModule`.
- Day.js plugins are initialized in `src/main.ts`.

## Verification

- Build one app with `yarn build --scope @joktec/gateway` or `yarn build --scope @joktec/micro`.
- Use `yarn test:consumer:*` from the repository root for example application smoke, database, Redis transport, and broker scenarios when the required local stack is running.
- Run development mode with the existing package scripts only when the required local infrastructure is available.
- Stop local app processes after runtime verification so ports are not held open.

## Local Guides

- `apps/example-gateway/AGENTS.md`
- `apps/example-micro/AGENTS.md`
