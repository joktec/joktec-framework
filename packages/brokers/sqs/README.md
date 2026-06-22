# @joktec/sqs

SQS/SNS broker package for JokTec applications.

## What It Provides

- `SqsModule` global Nest module with optional `forRoot(...)` auto-binding metadata.
- `SqsService` built on `AbstractClientService`.
- Queue send/consume and topic publish helpers.
- Decorators, loaders, AWS config, assume-role support, and metrics.

## Install

```bash
yarn add @joktec/sqs
```

## Usage

```ts
import { SqsModule, SqsService } from '@joktec/sqs';

@Module({
  imports: [SqsModule],
})
export class AppModule {}
```

Decorators can be used on provider methods to send, consume, or publish messages. Queue and topic names may be read from application config when decorator options request config resolution.

Configure the `sqs` section in the application config. Multiple connections are selected with `conId`.

## Development

```bash
yarn build --scope @joktec/sqs
yarn test --scope @joktec/sqs
```
