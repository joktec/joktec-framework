# @joktec/elastic

Elasticsearch-compatible database package for JokTec applications.

`@joktec/elastic` is an Elasticsearch-compatible HTTP wrapper built on `@joktec/http`. It exposes search, index, get, and delete operations using Elastic request/response contracts while reusing JokTec HTTP retry, proxy, and curl logging support.

## What It Provides

- `ElasticModule` global Nest module.
- `ElasticService` built on `AbstractClientService`.
- `ElasticConfig`, client interface, and models.
- HTTP-backed Elasticsearch request helpers through `@joktec/http`.
- Search, index, get, delete request/response types.

## Install

```bash
yarn add @joktec/elastic
```

## Usage

```ts
import { ElasticModule, ElasticService } from '@joktec/elastic';

@Module({
  imports: [ElasticModule],
})
export class AppModule {}
```

Inject `ElasticService` into app services:

```ts
await elasticService.index({
  index: 'articles',
  id: article.id,
  doc: article,
});

const result = await elasticService.search({
  index: 'articles',
  search: {
    query: { match: { title: 'joktec' } },
  },
});
```

## Config

Configure the `elastic` section in the application config. Multiple connections are selected with `conId`.

```yaml
elastic:
  conId: default
  protocol: http
  host: localhost
  port: 9200
  timeout: 30000
  retryConfig:
    retries: 3
    retryDelay: 1000
```

`baseURL` can be supplied directly through inherited `HttpConfig`; otherwise it is built from `protocol`, `host`, and `port`.

## Guidelines

- Keep index names, mappings, and query DSL ownership in the consuming app.
- Treat this package as a client wrapper, not a search-domain abstraction.
- Configure retry/proxy/curl behavior through inherited HTTP config fields.
- Package tests mock the HTTP layer; use live Elasticsearch/OpenSearch checks only in integration scenarios.

## Development

```bash
yarn lint --scope @joktec/elastic
yarn build --scope @joktec/elastic
yarn test --scope @joktec/elastic
```
