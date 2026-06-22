# Integrations

Integrations wrap third-party SDKs behind JokTec module, config, and service patterns.

## Packages

- `@joktec/firebase`: Firebase Admin SDK integration.
- `@joktec/gpt`: OpenAI client integration.

## Usage Pattern

Import the integration module in an app and inject the service where needed. Credentials and provider settings are supplied through application config.

```ts
import { FirebaseModule, FirebaseService } from '@joktec/firebase';
import { GptModule, GptService } from '@joktec/gpt';
```

## Development

```bash
yarn build --scope @joktec/firebase
yarn build --scope @joktec/gpt
```
