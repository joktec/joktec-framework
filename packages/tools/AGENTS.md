# Tools Agent Guide

This guide applies to `packages/tools/*`.

## Scope

Tools expose reusable utility services:

- `alert`: alert delivery through Slack-compatible webhook clients.
- `file`: local file classification helpers.
- `http`: Axios-backed HTTP client wrapper.

## Boundary Rules

- Tools may depend on `@joktec/core` and `@joktec/utils`.
- Keep tools app-neutral and reusable.
- Preserve `AbstractClientService` lifecycle and `conId` support.
- Export public APIs through `src/index.ts`.

## Runtime Pattern

- Modules are global Nest modules.
- Services own native client creation and operational methods.
- HTTP exposes request/upload helpers, proxy agent exports, retry config, and metrics.

## Verification

```bash
yarn test --scope @joktec/alert
yarn test --scope @joktec/file
yarn test --scope @joktec/http
yarn build --scope @joktec/alert
yarn build --scope @joktec/file
yarn build --scope @joktec/http
```
