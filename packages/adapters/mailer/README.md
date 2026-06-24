# @joktec/mailer

Mailer adapter package for JokTec applications.

`@joktec/mailer` wraps Nodemailer with JokTec config parsing, lifecycle hooks, optional template compilation, preview support, and a reusable send contract.

## What It Provides

- `MailerModule` global Nest module.
- `MailerService` built on `AbstractClientService`.
- SMTP, auth, OAuth2, template, preview, and transport config models.
- Mail client interface and mailer exception types.
- Template support for Handlebars, EJS, and Pug stores.

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

Inject `MailerService` into app services:

```ts
await mailerService.send({
  to: 'user@example.com',
  subject: 'Welcome',
  html: '<p>Hello</p>',
});
```

Template rendering can be used when `template` config is enabled:

```ts
const html = await mailerService.compile({
  name: 'welcome',
  context: { name: 'JokTec' },
});
```

## Config

Configure the `mailer` section in the application config. Multiple connections are selected with `conId`.

```yaml
mailer:
  conId: default
  host: smtp.example.com
  port: 587
  secure: false
  sender: no-reply@example.com
  auth:
    user: smtp-user
    pass: smtp-password
  template:
    dir: ./templates
    engine: hbs
```

## Guidelines

- Keep mail composition and business events in the consuming app.
- Do not commit SMTP credentials or OAuth2 secrets.
- Use preview mode only in development.
- Prefer sending mail from worker/microservice processes when delivery should not block request handling.

## Development

```bash
yarn lint --scope @joktec/mailer
yarn build --scope @joktec/mailer
yarn test --scope @joktec/mailer
```
