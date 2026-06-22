# @joktec/redcast

Redis-backed messaging package for JokTec applications.

## What It Provides

- `RedcastModule` global Nest module.
- `RedcastService` built on `AbstractClientService`.
- Redis Pub/Sub, list queue, and stream helpers.
- Send, consume, publish, subscribe decorators, loaders, config, and metrics.

## Install

```bash
yarn add @joktec/redcast
```

## Usage

```ts
import { RedcastModule, RedcastService } from '@joktec/redcast';

@Module({
  imports: [RedcastModule],
})
export class AppModule {}
```

Decorators can be used on provider methods to send, consume, publish, or subscribe through Redis-backed channels, lists, and streams.

Configure the `redcast` section in the application config. Multiple connections are selected with `conId`.

## Development

```bash
yarn build --scope @joktec/redcast
yarn test --scope @joktec/redcast
```
