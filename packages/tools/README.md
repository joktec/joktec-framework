# Tools

Tools provide reusable utility services shared by apps and packages.

## Packages

- `@joktec/alert`: Slack-compatible alert webhook client. This package is present in the repo but its developer guideline is intentionally left untouched until the package is completed.
- `@joktec/file`: file classification and local file helper service.
- `@joktec/http`: Axios-backed HTTP client wrapper with retry, proxy, upload, and metric support.

## Usage Pattern

Tool packages expose global Nest modules and injectable services.

```ts
import { HttpModule, HttpService } from '@joktec/http';
```

Use tools for generic infrastructure concerns that are useful across packages but do not belong in the core runtime. Keep app-specific workflows outside tool packages.

## Runtime Guidelines

- Configure tools through the application config layer.
- Use `conId` when multiple external endpoints or local stores are needed.
- Keep file paths, proxy credentials, and remote URLs environment-specific.
- Package tests should mock filesystem/HTTP dependencies unless the test is intentionally a consumer scenario.

## Development

```bash
yarn test --scope @joktec/file
yarn test --scope @joktec/http
yarn build --scope @joktec/file
yarn build --scope @joktec/http
```
