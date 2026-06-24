# @joktec/types

Configuration schema support for JokTec projects.

`@joktec/types` is a tooling package. It aggregates JokTec config classes into a `JoktecConfig` type and uses `ts-json-schema-generator` to emit a JSON schema for config authoring and validation assistance.

## What It Provides

- `JoktecConfig` aggregate config type.
- Custom parser and formatter support for `ts-json-schema-generator`.
- A schema generation entry point that writes `config.schema.json`.
- A reference `config.yml` used while developing the schema output.

## Install

```bash
yarn add -D @joktec/types
```

## Usage

The package is built as a tooling package. Its source reads `joktec.config.{js|ts}` with the local TypeScript config and generates a JSON schema for `JoktecConfig`.

```bash
yarn build --scope @joktec/types
```

The build compiles `src/main.ts`, runs the generator, and writes:

```text
packages/common/types/config.schema.json
```

The generated schema includes config surfaces from core, adapters, brokers, databases, integrations, tools, and cron packages.

## Schema Generation Notes

- The generator entrypoint uses `CompletedConfig` with `DEFAULT_CONFIG`.
- Custom parser code should import `ts` from `ts-json-schema-generator` to avoid mismatched TypeScript node types.
- `config.schema.json` is generated output. Schema diffs can reflect generator improvements such as clearer enums, union handling, or regex-format detection.
- Function types are formatted as a marker object because functions are not directly representable in JSON schema.
- Constructor types are parsed as strings by the custom constructor parser.

## Guidelines

- Treat source config classes in package code as the schema source of truth.
- Do not hand-edit generated schema to describe behavior that code does not expose.
- Keep schema generation deterministic before publishing or consuming schema diffs.
- Rebuild this package after changing public config classes that belong to `JoktecConfig`.

## Development

```bash
yarn lint --scope @joktec/types
yarn build --scope @joktec/types
```
