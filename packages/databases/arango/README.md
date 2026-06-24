# @joktec/arango

ArangoDB database package for JokTec applications.

`@joktec/arango` wraps the ArangoDB JavaScript driver with JokTec config parsing, lifecycle hooks, collection helpers, bulk upsert support, and AQL query execution.

## What It Provides

- `ArangoModule` global Nest module.
- `ArangoService` built on `AbstractClientService`.
- ArangoDB client interface, config, and models.
- Basic and bearer credential config contracts.
- `ArangoDocument` and `ArangoQueryRequest` types.

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

Inject `ArangoService` into app services:

```ts
const cursor = await arangoService.query<{ name: string }>(aql`
  FOR doc IN users
  FILTER doc.status == "active"
  RETURN doc
`);

const users = await cursor.all();
```

Bulk upsert is available for document arrays:

```ts
await arangoService.bulkUpsert('users', docs, ['_key']);
```

## Config

Configure the `arango` section in the application config. Multiple connections are selected with `conId`.

```yaml
arango:
  conId: default
  url: http://localhost:8529
  databaseName: joktec
  auth:
    username: root
    password: root
  maxRetries: 3
```

`auth` can be basic credentials or bearer credentials depending on the target ArangoDB setup.

## Guidelines

- Keep collection names, graph semantics, and AQL query ownership in the consuming app.
- Use `_key` or explicit upsert fields for deterministic bulk upserts.
- Keep long-running graph/search workloads visible at the app/service layer.
- Package tests mock `arangojs`; use live stack scenarios only when a local ArangoDB service is available.

## Development

```bash
yarn lint --scope @joktec/arango
yarn build --scope @joktec/arango
yarn test --scope @joktec/arango
```
