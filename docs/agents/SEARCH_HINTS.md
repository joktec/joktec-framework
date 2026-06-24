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
rg --files apps packages | rg 'AGENTS.md$'
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
rg -n "CursorPagination|cursorKey|paginateByCursor|paginationMode" packages apps
rg -n "PagePaginationResponse|OffsetPaginationResponse|CursorPaginationResponse" packages/common/core/src
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

## Tests And Reports

```bash
rg --files packages apps test | rg '__tests__|__mocks__|\\.scenario\\.ts$'
rg -n "moduleNameMapper|test:consumer|jest.consumer" package.json packages apps test
rg -n "createMock|jest\\.fn|mock.*Instances|preflightDependencies" packages test
```

Package-scoped verification:

```bash
yarn test --scope @joktec/<package>
yarn lint --scope @joktec/<package>
yarn build --scope @joktec/<package>
```

Broad local report capture:

```bash
mkdir -p reports
yarn lint 2>&1 | tee reports/lint.log
yarn build 2>&1 | tee reports/build.log
yarn test:cov 2>&1 | tee reports/unit-coverage.log
```

Consumer harness commands:

```bash
yarn test:consumer:smoke
yarn test:consumer:db
yarn test:consumer:transport
yarn test:consumer:broker
```
