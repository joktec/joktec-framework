# Tools

Tools provide reusable utility services shared by apps and packages.

## Packages

- `@joktec/alert`: Slack-compatible alert webhook client.
- `@joktec/file`: file classification and local file helper service.
- `@joktec/http`: Axios-backed HTTP client wrapper with retry, proxy, upload, and metric support.

## Usage Pattern

Tool packages expose global Nest modules and injectable services.

```ts
import { HttpModule, HttpService } from '@joktec/http';
```

## Development

```bash
yarn build --scope @joktec/alert
yarn build --scope @joktec/file
yarn build --scope @joktec/http
```
