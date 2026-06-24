# @joktec/bigquery

Google BigQuery database package for JokTec applications.

`@joktec/bigquery` wraps the Google BigQuery SDK with JokTec config parsing, dataset/table helpers, insert/load/query operations, merge utilities, and duplicate cleanup helpers.

## What It Provides

- `BigQueryModule` global Nest module.
- `BigQueryService` built on `AbstractClientService`.
- BigQuery client interface, config, models, utilities, and selected BigQuery date exports.
- `BigQueryRequest`, `BigQuerySchema`, `SortOrder`, and row helper contracts.

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

Inject `BigQueryService` into app services:

```ts
await bigQueryService.insert('events', [
  { id: 'evt-1', type: 'article.created', createdAt: new Date() },
]);

const rows = await bigQueryService.query('events', {
  fields: ['id', 'type'],
  where: ['type = "article.created"'],
  limit: 100,
});
```

## Config

Configure the `bigquery` section in the application config. Multiple connections are selected with `conId`.

```yaml
bigquery:
  conId: default
  keyFilename: ./_credentials/bigquery.json
  projectId: joktec-project
  datasetId: analytics
  location: asia-southeast1
  autoRetry: true
  maxRetries: 5
  defaultTable: events
```

## Guidelines

- Do not commit Google Cloud credential files.
- Keep SQL fragments and table ownership in the consuming app.
- Use `createTable` with explicit schema when the process is responsible for table setup.
- Prefer package tests with mocked BigQuery clients; verify real datasets only in controlled integration environments.

## Development

```bash
yarn lint --scope @joktec/bigquery
yarn build --scope @joktec/bigquery
yarn test --scope @joktec/bigquery
```
