# @joktec/mailer

Mailer adapter package for JokTec applications.

## What It Provides

- `MailerModule` global Nest module.
- `MailerService` built on `AbstractClientService`.
- SMTP, auth, OAuth2, template, preview, and transport config models.
- Mail client interface and mailer exception types.

## Install

```bash
yarn add @joktec/mailer
```

## Usage

```ts
import { MailerModule, MailerService } from '@joktec/mailer';

@Module({
  imports: [MailerModule],
})
export class AppModule {}
```

Configure the `mailer` section in the application config. Multiple connections are selected with `conId`.

## Development

```bash
yarn build --scope @joktec/mailer
yarn test --scope @joktec/mailer
```
