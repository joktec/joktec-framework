# @joktec/types

Configuration schema support for JokTec projects.

## What It Provides

- `JoktecConfig` aggregate config type.
- Custom parser and formatter support for `ts-json-schema-generator`.
- A schema generation entry point that writes `config.schema.json`.

## Install

```bash
yarn add -D @joktec/types
```

## Usage

The package is built as a tooling package. Its source reads `joktec.config.{js|ts}` with the local TypeScript config and generates a JSON schema for `JoktecConfig`.

## Schema Generation Notes

- The generator entrypoint uses `CompletedConfig` with `DEFAULT_CONFIG`.
- Custom parser code should import `ts` from `ts-json-schema-generator` to avoid mismatched TypeScript node types.
- `config.schema.json` is generated output. Schema diffs can reflect generator improvements such as clearer enums, union handling, or regex-format detection.

## Development

```bash
yarn build --scope @joktec/types
```
