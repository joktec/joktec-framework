# @joktec/notifier

Push notification adapter package for JokTec applications.

## What It Provides

- `NotifierModule` global Nest module.
- `NotifierService` built on `AbstractClientService`.
- Notification provider config for FCM, GCM, APN, ADM, WNS, and MPNS.
- Notification payload and provider models.

## Install

```bash
yarn add @joktec/notifier
```

## Usage

```ts
import { NotifierModule, NotifierService } from '@joktec/notifier';

@Module({
  imports: [NotifierModule],
})
export class AppModule {}
```

Configure the `notifier` section in the application config. Multiple connections are selected with `conId`.

## Development

```bash
yarn build --scope @joktec/notifier
yarn test --scope @joktec/notifier
```
