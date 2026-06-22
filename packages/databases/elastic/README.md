# @joktec/elastic

Elasticsearch-compatible database package for JokTec applications.

## What It Provides

- `ElasticModule` global Nest module.
- `ElasticService` built on `AbstractClientService`.
- `ElasticConfig`, client interface, and models.
- HTTP-backed Elasticsearch request helpers through `@joktec/http`.

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

Configure the `elastic` section in the application config. Multiple connections are selected with `conId`.

## Development

```bash
yarn build --scope @joktec/elastic
yarn test --scope @joktec/elastic
```
