# @joktec/arango

ArangoDB database package for JokTec applications.

## What It Provides

- `ArangoModule` global Nest module.
- `ArangoService` built on `AbstractClientService`.
- ArangoDB client interface, config, and models.

## Install

```bash
yarn add @joktec/arango
```

## Usage

```ts
import { ArangoModule, ArangoService } from '@joktec/arango';

@Module({
  imports: [ArangoModule],
})
export class AppModule {}
```

Configure the `arango` section in the application config. Multiple connections are selected with `conId`.

## Development

```bash
yarn build --scope @joktec/arango
yarn test --scope @joktec/arango
```
