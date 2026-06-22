# Search Hints

Use `rg` first.

## Architecture Entry Points

```bash
rg -n "class Application|GatewayFactory|MicroFactory" packages/common/core/src
rg -n "AbstractClientService|ClientConfig" packages/common/core/src packages
rg -n "BaseController|ClientController|BaseService" packages/common/core/src
```

## Package Boundaries

```bash
rg -n "from '@joktec/" apps packages
rg --files packages | rg '/src/index.ts$|package.json$'
```

## Runtime

```bash
rg -n "forRoot|registerQueue|connectMicroservice|EventPattern|MessagePattern" apps packages
rg -n "Crontab|JobWorker|Processor|Queue" apps packages
```

## Brokers

```bash
rg -n "KafkaSend|KafkaConsume|RabbitSend|RabbitConsume|RedcastSend|SqsSend" apps packages
rg -n "ConsumerLoader|Producer|Publisher" packages/brokers
```

## Databases

```bash
rg -n "MongoRepo|MysqlRepo|IBaseRepository" apps packages
rg -n "MongoModule.forRoot|MysqlModule.forRoot" apps packages
```

## Gateway API

```bash
rg -n "@Controller|@Get|@Post|@Put|@Patch|@Delete" apps/example-gateway/src/modules
rg -n "BaseController<" apps/example-gateway/src/modules
```

## Config

```bash
rg -n "parseOrThrow|parse\\(|resolveConfigValue|initConfig" apps packages
rg -n "class .*Config" packages apps
```

## Version Hygiene

To inspect a specific revision without switching working state:

```bash
git show <revision>:path/to/file.ts
git diff --name-status <revision>..HEAD
```
