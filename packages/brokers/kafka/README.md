# @joktec/kafka

Kafka broker package for JokTec applications.

`@joktec/kafka` wraps KafkaJS behind JokTec config, logging, metrics, producer helpers, consumer helpers, and decorator-driven handler discovery.

## What It Provides

- `KafkaModule` global Nest module.
- `KafkaService` built on `AbstractClientService` and KafkaJS.
- `KafkaConfig` and retry config models.
- Producer/consumer decorators, loaders, client interface, and metrics.
- Request/option contracts for single-message and batch produce/consume flows.

## Install

```bash
yarn add @joktec/kafka
```

## Usage

```ts
import { KafkaModule, KafkaService } from '@joktec/kafka';

@Module({
  imports: [KafkaModule],
})
export class AppModule {}
```

Decorators can be used on provider methods to send or consume messages. Apps own topic names and handler semantics.

```ts
import { KafkaConsume, KafkaSend } from '@joktec/kafka';

export class ArticleHandler {
  @KafkaSend('kafka.topics.article', { useEnv: true })
  async publishArticle(payload: unknown) {
    return payload;
  }

  @KafkaConsume('kafka.topics.article', 'article-group', { useEnv: true })
  async consumeArticle(payload: unknown) {
    return payload;
  }
}
```

Configure the `kafka` section in the application config. Multiple connections are selected with `conId`.

## Config

```yaml
kafka:
  conId: default
  clientId: joktec-service
  brokers:
    - localhost:9092
  connectionTimeout: 1000
  requestTimeout: 30000
  retry:
    retries: 5
```

Use `ssl` and `sasl` when the Kafka cluster requires secure authentication. Topic creation and partition ownership remain cluster concerns; apps should provision required topics before consumers start.

## Runtime Notes

- `KafkaSend` and `KafkaConsume` are decorator conveniences around `KafkaService`.
- Set stable consumer group IDs for long-running services.
- Keep payload versioning in the consuming app.
- Package tests mock KafkaJS; use consumer scenarios for live broker validation.

## Development

```bash
yarn lint --scope @joktec/kafka
yarn build --scope @joktec/kafka
yarn test --scope @joktec/kafka
```
