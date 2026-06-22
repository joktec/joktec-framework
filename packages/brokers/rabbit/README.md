# @joktec/rabbit

RabbitMQ broker package for JokTec applications.

## What It Provides

- `RabbitModule` global Nest module with optional `forRoot(...)` auto-binding metadata.
- `RabbitService` built on `AbstractClientService`.
- Queue, exchange, send, consume, config, and metric support.
- Decorators and loaders for provider-method message wiring.

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

Decorators can be used on provider methods to send or consume queue/exchange messages.

Configure the `rabbit` section in the application config. Multiple connections are selected with `conId`.

## Development

```bash
yarn build --scope @joktec/rabbit
yarn test --scope @joktec/rabbit
```
