# Brokers

Brokers provide messaging clients, decorators, loaders, and metrics for asynchronous communication.

Use broker packages when application services need to publish, consume, queue, or subscribe to messages through a provider-specific transport while keeping handler semantics in the app.

## Packages

- `@joktec/kafka`: KafkaJS wrapper for producing and consuming Kafka messages.
- `@joktec/rabbit`: RabbitMQ wrapper with queue, exchange, consumer, and auto-binding support.
- `@joktec/redcast`: Redis-backed Pub/Sub, list queue, and stream messaging wrapper.
- `@joktec/sqs`: AWS SQS/SNS wrapper for queue send/consume and topic publish behavior.

## Usage Pattern

Broker packages expose Nest modules, services, and decorators. Apps define message semantics in handlers while broker packages own transport wiring.

```ts
import { KafkaModule, KafkaService } from '@joktec/kafka';
```

Most broker services use the shared `AbstractClientService` lifecycle and read config by package key from application config. Decorator loaders discover provider methods at application startup and register producer, publisher, consumer, or subscriber behavior.

## Configuration

Each broker reads its own top-level config key:

- `kafka`
- `rabbit`
- `redcast`
- `sqs`

Apps own topic names, queue names, consumer groups, routing keys, and payload contracts. Decorator options may resolve names from config paths when the package supports it.

## Runtime Guidelines

- Start broker consumers only in processes intended to own those subscriptions.
- Keep idempotency, retry policy, and dead-letter behavior visible in the consuming app.
- Do not hide business workflows inside broker packages.
- Test package behavior with mocked clients; use consumer harness scenarios for live Redis/Kafka/Rabbit/SQS checks.

## Development

```bash
yarn test --scope @joktec/kafka
yarn test --scope @joktec/rabbit
yarn test --scope @joktec/redcast
yarn test --scope @joktec/sqs
yarn build --scope @joktec/kafka
yarn build --scope @joktec/rabbit
yarn build --scope @joktec/redcast
yarn build --scope @joktec/sqs
```
