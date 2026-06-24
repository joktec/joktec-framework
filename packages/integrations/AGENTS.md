# Integrations Agent Guide

This guide applies to `packages/integrations/*`.

## Scope

Integrations wrap third-party service SDKs:

- `firebase`: Firebase Admin SDK integration.
- `gpt`: OpenAI client integration.

## Boundary Rules

- Integrations may depend on `@joktec/core` and `@joktec/utils`.
- Keep credentials config-driven and never commit real credentials.
- Services should stay app-neutral and expose reusable client operations.
- Preserve `AbstractClientService` lifecycle and `conId` support.
- Export public APIs through `src/index.ts`.

## Runtime Pattern

- Modules are global Nest modules.
- Services initialize native SDK clients from validated config.
- Apps choose which integration modules to compose.

## Verification

```bash
yarn test --scope @joktec/firebase
yarn test --scope @joktec/gpt
yarn build --scope @joktec/firebase
yarn build --scope @joktec/gpt
```
