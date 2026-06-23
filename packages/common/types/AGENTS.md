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

## Generator Behavior

- `src/main.ts` uses `CompletedConfig` with `DEFAULT_CONFIG` from `ts-json-schema-generator`.
- Custom parsers should use the `ts` export from `ts-json-schema-generator` so parser node types match the generator runtime.
- `config.schema.json` may change when TypeScript or `ts-json-schema-generator` improves union, enum, or regex-format detection.
- Treat generated schema diffs as package-level contract/tooling output and verify them with the package build.

## Verification

```bash
yarn build --scope @joktec/types
```
