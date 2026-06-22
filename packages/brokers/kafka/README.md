# @joktec/kafka

Kafka broker package for JokTec applications.

## What It Provides

- `KafkaModule` global Nest module.
- `KafkaService` built on `AbstractClientService` and KafkaJS.
- `KafkaConfig` and retry config models.
- Producer/consumer decorators, loaders, client interface, and metrics.

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

## Development

```bash
yarn build --scope @joktec/kafka
yarn test --scope @joktec/kafka
```
