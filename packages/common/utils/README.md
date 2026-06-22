# @joktec/utils

Low-level utility package used across JokTec packages.

## What It Provides

- Shared constants.
- Helper functions for values, classes, objects, strings, URLs, arrays, files, and runtime checks.
- Validation decorators and validator helpers used by package config classes.

## Install

```bash
yarn add @joktec/utils
```

## Usage

```ts
import { isEmpty, joinUrl, toArray } from '@joktec/utils';
```

## Development

```bash
yarn build --scope @joktec/utils
yarn test --scope @joktec/utils
```
