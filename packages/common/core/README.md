# @joktec/core

Core framework package for JokTec applications and reusable packages.

## What It Provides

- `Application.bootstrap` for gateway and microservice startup.
- `GatewayModule` and `MicroModule` runtime infrastructure.
- `ConfigModule`, `LoggerModule`, metrics, JWT, static assets, and Bull support.
- Base abstractions: `BaseService`, `BaseController`, `ClientController`, `ClientService`, and `AbstractClientService`.
- Decorators, exceptions, interceptors, pipes, transport models, and shared NestJS exports.

## Install

```bash
yarn add @joktec/core
```

## Usage

```ts
import { Application, ConfigModule, GatewayModule, LoggerModule, Module } from '@joktec/core';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), LoggerModule, GatewayModule.forRoot({ metric: true })],
})
export class AppModule {}

Application.bootstrap(AppModule);
```

## Development

```bash
yarn build --scope @joktec/core
yarn test --scope @joktec/core
```
