# @joktec/rabbit

RabbitMQ broker package for JokTec applications.

`@joktec/rabbit` wraps AMQP/RabbitMQ connection management with NestJS module registration, decorator-driven handler discovery, queue/exchange helpers, auto-binding metadata, and metrics.

## What It Provides

- `RabbitModule` global Nest module with optional `forRoot(...)` auto-binding metadata.
- `RabbitService` built on `AbstractClientService`.
- Queue, exchange, send, consume, config, and metric support.
- Decorators and loaders for provider-method message wiring.
- `RabbitExchangeType`, queue assertion, exchange assertion, binding, publish, and consume contracts.

## Install

```bash
yarn add @joktec/rabbit
```

## Usage

```ts
import { RabbitExchangeType, RabbitModule, RabbitService } from '@joktec/rabbit';

@Module({
  imports: [
    RabbitModule.forRoot({
      autoBinding: [{ queue: 'events', exchangeKey: 'events', routingKey: 'events.created', type: RabbitExchangeType.DIRECT }],
    }),
  ],
})
export class AppModule {}
```

Decorators can be used on provider methods to send, publish, or consume queue/exchange messages.

```ts
import { RabbitConsume, RabbitExchange, RabbitMessage, RabbitSend } from '@joktec/rabbit';

export class ArticleHandler {
  @RabbitSend('article.jobs')
  async sendJob(payload: unknown) {
    return payload;
  }

  @RabbitExchange('events', 'article.created')
  async publishEvent(payload: unknown) {
    return payload;
  }

  @RabbitConsume('article.jobs')
  async consumeJob(message: RabbitMessage) {
    return message;
  }
}
```

Configure the `rabbit` section in the application config. Multiple connections are selected with `conId`.

```yaml
rabbit:
  conId: default
  protocol: amqp
  hostname: localhost
  port: 5672
  username: guest
  password: guest
  vhost: /
```

## Runtime Notes

- Use `RabbitModule.forRoot(...)` when the service should assert queues, exchanges, or bindings at startup.
- Keep retry, poison-message, and idempotency behavior in the consuming app.
- Acknowledge or reject messages intentionally through `RabbitService.commit` and `RabbitService.reject` when handling manually.
- Package tests mock AMQP clients; use consumer scenarios for live RabbitMQ validation.

## Development

```bash
yarn lint --scope @joktec/rabbit
yarn build --scope @joktec/rabbit
yarn test --scope @joktec/rabbit
```
