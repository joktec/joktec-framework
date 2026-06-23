# @joktec/utils

Low-level utility package used by JokTec framework packages and applications.

`@joktec/utils` is intentionally dependency-light. It provides reusable helpers, HTTP constants, validation decorators, and selected `class-transformer` / `class-validator` exports so higher-level packages can share the same utility layer.

## Install

```bash
yarn add @joktec/utils
```

## Public Surface

- HTTP constants:
  - `HttpMethod`
  - `HttpStatus`
  - `HttpRequestHeader`
  - `HttpContentType`
- conversion helpers:
  - numeric, boolean, array, object, class, URL, and string conversion utilities
- generator helpers:
  - random values, IDs, tokens, and string generation helpers
- validation helpers:
  - runtime checks and validator utilities
- decorators:
  - `Is2DArray`
  - `IsTypes`
- re-exports:
  - `class-transformer`
  - `class-validator`
  - `validateSync`

## Basic Usage

```ts
import { HttpStatus, isEmpty, joinUrl, toArray, toBool } from '@joktec/utils';

const endpoint = joinUrl('https://api.example.com', 'v1', 'users');
const enabled = toBool(process.env.FEATURE_ENABLED, false);
const values = toArray('admin');

if (isEmpty(values)) {
  throw new Error(`Expected at least one role. HTTP ${HttpStatus.BAD_REQUEST}`);
}
```

## Config Validation Usage

JokTec config classes commonly use validators from this package:

```ts
import { IsBoolean, IsOptional, IsString, toBool } from '@joktec/utils';

export class ExampleConfig {
  @IsString()
  name!: string;

  @IsOptional()
  @IsBoolean()
  debug?: boolean;

  constructor(props: ExampleConfig) {
    Object.assign(this, {
      ...props,
      debug: toBool(props.debug, false),
    });
  }
}
```

## Design Guidelines

- Keep this package free of framework, database, broker, adapter, and app dependencies.
- Prefer small deterministic helpers over stateful services.
- Use helpers here only when they are broadly reusable across packages.
- Avoid placing business-domain behavior in this package.
- Keep validation decorators generic and independent from any specific application model.

## Repository Layout

- `src/constants`: HTTP constants.
- `src/helpers`: conversion, generation, encryption, validation, and runtime helper functions.
- `src/validators`: class-validator decorators.
- `src/index.ts`: public package export boundary.

## Development

```bash
yarn lint --scope @joktec/utils
yarn build --scope @joktec/utils
yarn test --scope @joktec/utils
```
