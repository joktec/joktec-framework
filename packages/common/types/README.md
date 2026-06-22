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

## Development

```bash
yarn build --scope @joktec/types
```
