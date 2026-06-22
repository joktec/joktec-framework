# @joktec/gpt

OpenAI client integration package for JokTec applications.

## What It Provides

- `GptModule` global Nest module.
- `GptService` built on `AbstractClientService`.
- `GptConfig`, client interface, and response models.
- Native OpenAI client initialization from config.

## Install

```bash
yarn add @joktec/gpt
```

## Usage

```ts
import { GptModule, GptService } from '@joktec/gpt';

@Module({
  imports: [GptModule],
})
export class AppModule {}
```

Configure the `gpt` section in the application config. Keep API keys in local environment or secret management, not in committed files.

## Development

```bash
yarn build --scope @joktec/gpt
yarn test --scope @joktec/gpt
```
