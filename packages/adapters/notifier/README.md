# @joktec/notifier

Push notification adapter package for JokTec applications.

`@joktec/notifier` wraps the push notification provider configuration supported by `node-pushnotifications` and exposes a single NestJS service for application-level notification delivery.

## What It Provides

- `NotifierModule` global Nest module.
- `NotifierService` built on `AbstractClientService`.
- Notification provider config for FCM, GCM, APN, ADM, WNS, and MPNS.
- Notification payload and provider models.
- `NotifierRequest` and `NotifierResponse` contracts.

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

Inject `NotifierService` into app services:

```ts
await notifierService.send({
  regIds: ['device-token'],
  data: {
    title: 'New message',
    body: 'You have a new notification',
    topic: 'users',
  },
});
```

## Config

Configure the `notifier` section in the application config. Multiple connections are selected with `conId`.

```yaml
notifier:
  conId: default
  isAlwaysUseFCM: true
  fcm:
    appName: example
    serviceAccountKey: ./_credentials/firebase-cert.json
```

Provider-specific fields are represented by the config classes under `src/configs`.

## Guidelines

- Keep notification content and targeting rules in the consuming app.
- Do not commit provider keys, certificates, or service account files.
- Use a background worker when push delivery should be retried independently from HTTP requests.
- Package tests mock the provider client; use app-level scenarios for live provider verification.

## Development

```bash
yarn lint --scope @joktec/notifier
yarn build --scope @joktec/notifier
yarn test --scope @joktec/notifier
```
