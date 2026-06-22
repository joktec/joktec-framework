# Types Package Agent Guide

This package owns config schema generation support.

## Scope

- `src/joktec.config.ts`: aggregate JokTec config shape.
- `src/main.ts`: schema generation entry point.
- custom parser/formatter files for `ts-json-schema-generator`.

## Boundary Rules

- Keep this package focused on generated schema support.
- Do not add runtime service dependencies here.
- When config classes change in other packages, check whether `JoktecConfig` needs to expose the new shape.
- Generated schema output is derived from source config types; do not treat stale generated output as source truth.

## Verification

```bash
yarn build --scope @joktec/types
```
