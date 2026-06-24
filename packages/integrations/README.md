# Integrations

Integrations wrap third-party SDKs behind JokTec module, config, and service patterns.

## Packages

- `@joktec/firebase`: Firebase Admin SDK integration.
- `@joktec/gpt`: OpenAI client integration. This package is present in the repo but its developer guideline is intentionally left untouched until the package is completed.

## Usage Pattern

Import the integration module in an app and inject the service where needed. Credentials and provider settings are supplied through application config.

```ts
import { FirebaseModule, FirebaseService } from '@joktec/firebase';
```

Integration packages should keep SDK initialization, lifecycle, and config validation in the package. Product-specific workflows, prompts, notification semantics, or domain logic belong in the consuming app.

## Credential Guidelines

- Do not commit real service account files, API keys, or private keys.
- Prefer environment-specific config and local ignored credential files.
- Package tests should mock external SDK clients.

## Development

```bash
yarn test --scope @joktec/firebase
yarn build --scope @joktec/firebase
```
