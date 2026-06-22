# @joktec/bigquery

Google BigQuery database package for JokTec applications.

## What It Provides

- `BigQueryModule` global Nest module.
- `BigQueryService` built on `AbstractClientService`.
- BigQuery client interface, config, models, utilities, and selected BigQuery date exports.

## Install

```bash
yarn add @joktec/bigquery
```

## Usage

```ts
import { BigQueryModule, BigQueryService } from '@joktec/bigquery';

@Module({
  imports: [BigQueryModule],
})
export class AppModule {}
```

Configure the `bigquery` section in the application config. Multiple connections are selected with `conId`.

## Development

```bash
yarn build --scope @joktec/bigquery
yarn test --scope @joktec/bigquery
```
