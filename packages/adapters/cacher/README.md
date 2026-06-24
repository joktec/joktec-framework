# @joktec/cacher

Cache adapter package for JokTec applications.

`@joktec/cacher` standardizes cache access behind a NestJS global module and an `AbstractClientService` lifecycle. It supports local file cache, Redis, and Memcached stores while keeping cache keys and invalidation semantics in the consuming app.

## What It Provides

- `CacheModule` global Nest module.
- `CacheService` built on `AbstractClientService`.
- Config models for local, Redis, and Memcached cache stores.
- Cache decorators, interceptors, utilities, and metrics.
- `CacheType` and store abstractions for provider-specific clients.

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

Inject `CacheService` into app services:

```ts
await cacheService.set('article:1', article, { namespace: 'feed', expiry: 300 });
const article = await cacheService.get<Article>('article:1', { namespace: 'feed' });
await cacheService.del('article:*', { namespace: 'feed' });
```

## Config

Configure the `cache` section in the application config. Multiple connections are selected with `conId`.

```yaml
cache:
  conId: default
  type: redis
  host: localhost
  port: 6379
  password: root
  database: 0
  retryTimeout: 20000
  connectTimeout: 20000
```

For local cache:

```yaml
cache:
  conId: default
  type: local
  cacheDir: ./.cacher
```

## Guidelines

- Keep cache key naming in the consuming app.
- Use namespaces to separate feature-level cache data.
- Treat local cache as development or single-process storage.
- Use Redis or Memcached for shared runtime cache.
- Package tests use mocked/local stores; verify live Redis through consumer scenarios when needed.

## Development

```bash
yarn lint --scope @joktec/cacher
yarn build --scope @joktec/cacher
yarn test --scope @joktec/cacher
```
