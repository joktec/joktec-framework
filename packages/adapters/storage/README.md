# @joktec/storage

S3-compatible object storage adapter package for JokTec applications.

`@joktec/storage` wraps AWS SDK S3 clients with JokTec config parsing, lifecycle hooks, bucket checks, upload/download helpers, presigned URLs, object listing, and public link formatting.

## What It Provides

- `StorageModule` global Nest module.
- `StorageService` built on `AbstractClientService`.
- AWS/S3-compatible config, assume-role support, constants, utilities, and metrics.
- Storage client interface and file metadata models.
- Request/response contracts for upload, download, presigned URLs, and object listing.

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

Inject `StorageService` into app services:

```ts
import { StorageOperation } from '@joktec/storage';

const uploaded = await storageService.upload({
  filename: 'user-1.png',
  prefix: 'avatars',
  file: fileBuffer,
  contentType: 'image/png',
});

const presigned = await storageService.presigned({
  operation: StorageOperation.GET_OBJECT,
  filename: uploaded.key,
  expires: 3600,
});
```

## Config

Configure the `storage` section in the application config. Multiple connections are selected with `conId`.

```yaml
storage:
  conId: default
  region: ap-southeast-1
  endpoint: http://localhost:9000
  accessKeyId: minio
  secretAccessKey: minio123
  bucket: uploads
  forcePathStyle: true
  linkFormat: http://localhost:9000/<bucket>/<key>
```

`linkFormat` supports `<bucket>`, `<key>`, `<region>`, and `<namespace>` placeholders.

## Guidelines

- Keep object key naming and authorization in the consuming app.
- Use `checkBucket` only when the process should validate bucket availability at startup.
- Use assume-role config when runtime credentials should be delegated.
- Do not commit cloud credentials.

## Development

```bash
yarn lint --scope @joktec/storage
yarn build --scope @joktec/storage
yarn test --scope @joktec/storage
```
