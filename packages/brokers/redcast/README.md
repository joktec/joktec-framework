# @joktec/redcast

Redis-backed messaging package for JokTec applications.

`@joktec/redcast` provides Redis-backed messaging primitives for lightweight pub/sub, list queues, and streams. It is useful for local infrastructure scenarios where Redis is already part of the stack.

## What It Provides

- `RedcastModule` global Nest module.
- `RedcastService` built on `AbstractClientService`.
- Redis Pub/Sub, list queue, and stream helpers.
- Send, consume, publish, subscribe decorators, loaders, config, and metrics.
- Dead-letter options and batch consume options for list/stream workflows.

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

```ts
import { RedcastConsume, RedcastMessage, RedcastPublish, RedcastSend, RedcastSubscribe } from '@joktec/redcast';

export class FeedHandler {
  @RedcastSend('feed.jobs')
  async sendJob(payload: unknown) {
    return payload;
  }

  @RedcastConsume('feed.jobs', { batchSize: 10 })
  async consumeJob(payload: RedcastMessage) {
    return payload;
  }

  @RedcastPublish('feed.events')
  async publishEvent(payload: unknown) {
    return payload;
  }

  @RedcastSubscribe('feed.events')
  async subscribeEvent(payload: RedcastMessage) {
    return payload;
  }
}
```

Configure the `redcast` section in the application config. Multiple connections are selected with `conId`.

```yaml
redcast:
  conId: default
  host: localhost
  port: 6379
  password: root
  database: 0
  retryTimeout: 20000
  connectTimeout: 20000
```

## Runtime Notes

- Use Redis lists/streams for lightweight work queues, not for Kafka-scale event history.
- Configure dead-letter behavior for jobs that can fail repeatedly.
- Keep message schemas and idempotency rules in the consuming app.
- Package tests mock Redis; use consumer scenarios for live Redis transport validation.

## Development

```bash
yarn lint --scope @joktec/redcast
yarn build --scope @joktec/redcast
yarn test --scope @joktec/redcast
```
