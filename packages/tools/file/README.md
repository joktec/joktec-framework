# @joktec/file

File utility package for JokTec applications.

## What It Provides

- `FileModule` global Nest module.
- `FileService` built on `AbstractClientService`.
- Magika-backed file classification config.
- File client interface and metrics.

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

Configure the `file` section in the application config. Multiple connections are selected with `conId`.

## Development

```bash
yarn build --scope @joktec/file
yarn test --scope @joktec/file
```
