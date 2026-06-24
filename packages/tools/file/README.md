# @joktec/file

File utility package for JokTec applications.

`@joktec/file` provides local file helper operations and Magika-backed file classification setup behind the JokTec client lifecycle.

## What It Provides

- `FileModule` global Nest module.
- `FileService` built on `AbstractClientService`.
- Magika-backed file classification config.
- File client interface and metrics.
- Directory size, cleanup, modified-file lookup, read, append, and delete helpers.

## Install

```bash
yarn add @joktec/file
```

## Usage

```ts
import { FileModule, FileService } from '@joktec/file';

@Module({
  imports: [FileModule],
})
export class AppModule {}
```

Inject `FileService` into app services:

```ts
await fileService.appendFile('events.log', JSON.stringify(event), '\n');
const content = await fileService.readFile('events.log');
const size = await fileService.getSize();
```

## Config

Configure the `file` section in the application config. Multiple connections are selected with `conId`.

```yaml
file:
  conId: default
  directory: ./storage/tmp
  magika:
    modelPath: ./models/magika/model.onnx
    modelConfigPath: ./models/magika/config.json
```

The service creates the configured directory during startup when it does not exist.

## Guidelines

- Treat this package as a local utility, not durable object storage.
- Keep path selection and retention rules in the consuming app.
- Use `deleteFiles(start, end)` carefully; it deletes files by modified time.
- Use `@joktec/storage` for S3-compatible object storage.

## Development

```bash
yarn lint --scope @joktec/file
yarn build --scope @joktec/file
yarn test --scope @joktec/file
```
