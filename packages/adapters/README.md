# Adapters

Adapters provide reusable wrappers around external capabilities that are not tied to one application domain.

## Packages

- `@joktec/cacher`: cache service with local, Redis, and Memcached stores.
- `@joktec/mailer`: SMTP/Nodemailer-based mail delivery.
- `@joktec/notifier`: push notification delivery through supported notification providers.
- `@joktec/storage`: S3-compatible object storage operations and metadata helpers.

## Usage Pattern

Adapter modules are global Nest modules. Import the module in the application and inject the matching service where needed.

```ts
import { CacheModule, CacheService } from '@joktec/cacher';
```

Most adapter services follow the `AbstractClientService` lifecycle from `@joktec/core`, including config parsing and `conId`-based multi-connection support.

## Development

```bash
yarn build --scope @joktec/cacher
yarn build --scope @joktec/mailer
yarn build --scope @joktec/notifier
yarn build --scope @joktec/storage
```
