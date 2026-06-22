# @joktec/alert

Alert utility package for JokTec applications.

## What It Provides

- `AlertModule` global Nest module.
- `AlertService` built on `AbstractClientService`.
- Slack-compatible webhook config, client interface, models, and alert utilities.

## Install

```bash
yarn add @joktec/alert
```

## Usage

```ts
import { AlertModule, AlertService } from '@joktec/alert';

@Module({
  imports: [AlertModule],
})
export class AppModule {}
```

Configure the `alert` section in the application config. Multiple connections are selected with `conId`.

## Development

```bash
yarn build --scope @joktec/alert
yarn test --scope @joktec/alert
```
