# @joktec/storage

S3-compatible object storage adapter package for JokTec applications.

## What It Provides

- `StorageModule` global Nest module.
- `StorageService` built on `AbstractClientService`.
- AWS/S3-compatible config, assume-role support, constants, utilities, and metrics.
- Storage client interface and file metadata models.

## Install

```bash
yarn add @joktec/storage
```

## Usage

```ts
import { StorageModule, StorageService } from '@joktec/storage';

@Module({
  imports: [StorageModule],
})
export class AppModule {}
```

Configure the `storage` section in the application config. Multiple connections are selected with `conId`.

## Development

```bash
yarn build --scope @joktec/storage
yarn test --scope @joktec/storage
```
