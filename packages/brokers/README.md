# Brokers

Brokers provide messaging clients, decorators, loaders, and metrics for asynchronous communication.

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

Most broker services use the shared `AbstractClientService` lifecycle and read config by package key from application config.

## Development

```bash
yarn build --scope @joktec/kafka
yarn build --scope @joktec/rabbit
yarn build --scope @joktec/redcast
yarn build --scope @joktec/sqs
```
