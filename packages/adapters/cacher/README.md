# @joktec/cacher

Cache adapter package for JokTec applications.

## What It Provides

- `CacheModule` global Nest module.
- `CacheService` built on `AbstractClientService`.
- Config models for local, Redis, and Memcached cache stores.
- Cache decorators, interceptors, utilities, and metrics.

## Install

```bash
yarn add @joktec/cacher
```

## Usage

```ts
import { CacheModule, CacheService } from '@joktec/cacher';

@Module({
  imports: [CacheModule],
})
export class AppModule {}
```

Configure the `cache` section in the application config. Multiple connections are selected with `conId`.

## Development

```bash
yarn build --scope @joktec/cacher
yarn test --scope @joktec/cacher
```
