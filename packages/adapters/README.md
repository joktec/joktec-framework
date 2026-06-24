# Adapters

Adapters provide reusable wrappers around external capabilities that are not tied to one application domain.

Use adapters when an application needs a common capability such as cache, mail, push notification, or object storage without coupling business code to provider SDKs.

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

Most adapter services follow the `AbstractClientService` lifecycle from `@joktec/core`, including config parsing, logger binding, lifecycle hooks, and `conId`-based multi-connection support.

## Configuration

Each adapter reads its own top-level config key:

- `cache`
- `mailer`
- `notifier`
- `storage`

Single-connection apps can use the default connection. Multi-tenant or multi-provider apps can define multiple connections and pass `conId` when calling the service.

## Design Guidelines

- Keep provider credentials and endpoints in runtime config, not in source.
- Keep business payload composition in the consuming service.
- Use adapters for transport/provider concerns only.
- Prefer package tests with SDK mocks; use example app consumer scenarios for live provider checks.

## Development

```bash
yarn test --scope @joktec/cacher
yarn test --scope @joktec/mailer
yarn test --scope @joktec/notifier
yarn test --scope @joktec/storage
yarn build --scope @joktec/cacher
yarn build --scope @joktec/mailer
yarn build --scope @joktec/notifier
yarn build --scope @joktec/storage
```
