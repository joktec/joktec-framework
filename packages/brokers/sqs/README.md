# @joktec/sqs

SQS/SNS broker package for JokTec applications.

`@joktec/sqs` wraps AWS SQS and SNS with JokTec config parsing, lifecycle hooks, queue/topic helpers, decorator-driven handlers, auto-binding metadata, and metrics.

## What It Provides

- `SqsModule` global Nest module with optional `forRoot(...)` auto-binding metadata.
- `SqsService` built on `AbstractClientService`.
- Queue send/consume and topic publish helpers.
- Decorators, loaders, AWS config, assume-role support, and metrics.
- Queue assertion, topic assertion, queue-to-topic binding, send, consume, and publish contracts.

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

```ts
import { SqsConsume, SqsMessage, SqsPublish, SqsSend } from '@joktec/sqs';

export class NotificationHandler {
  @SqsSend('email-jobs')
  async sendEmailJob(payload: unknown) {
    return payload;
  }

  @SqsPublish('notification-events')
  async publishEvent(payload: unknown) {
    return payload;
  }

  @SqsConsume('email-jobs')
  async consumeEmailJob(message: SqsMessage) {
    return message;
  }
}
```

Configure the `sqs` section in the application config. Multiple connections are selected with `conId`.

```yaml
sqs:
  conId: default
  region: ap-southeast-1
  endpoint: http://localhost:9324
  accessKeyId: root
  secretAccessKey: root
  sslEnabled: false
  timeout: 30000
```

## Runtime Notes

- Use `SqsModule.forRoot(...)` when the service should assert queue/topic bindings at startup.
- ElasticMQ can be used as a local SQS-compatible runtime for development.
- Do not commit AWS credentials.
- Keep retry, visibility timeout, and dead-letter policy explicit in the consuming app or infrastructure.

## Development

```bash
yarn lint --scope @joktec/sqs
yarn build --scope @joktec/sqs
yarn test --scope @joktec/sqs
```
