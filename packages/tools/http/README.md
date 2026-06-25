# @joktec/http

Axios-backed HTTP client package for JokTec applications.

`@joktec/http` wraps Axios with JokTec config parsing, retry behavior, proxy agent construction, optional cURL logging, request serialization, authorization helpers, upload helpers, and metrics.

## What It Provides

- `HttpModule` global Nest module.
- `HttpService` built on `AbstractClientService`.
- Request, response, upload, retry, proxy, auth, and metric models.
- HTTP exception types and proxy agent exports.
- `HttpProxyAgent` and `HttpsProxyAgent` re-exports for advanced agent use.

## Install

```bash
yarn add @joktec/http
```

## Usage

```ts
import { HttpModule, HttpService } from '@joktec/http';
import { HttpMethod } from '@joktec/utils';

@Module({
  imports: [HttpModule],
})
export class AppModule {}

await httpService.request({
  method: HttpMethod.GET,
  url: 'https://example.com',
});
```

Authorization helpers can be passed per request:

```ts
await httpService.request({
  method: HttpMethod.GET,
  url: '/users/me',
  authorization: {
    bearerToken: accessToken,
  },
});
```

## Config

Configure the `http` section in the application config. Multiple connections are selected with `conId`.

```yaml
http:
  conId: default
  baseURL: https://api.example.com
  timeout: 30000
  maxRedirects: 3
  curlirize: false
  retryConfig:
    retries: 3
    shouldResetTimeout: true
    retryDelay: 1000
    httpMethodsToRetry: [GET, POST]
    statusCodesToRetry:
      - [500, 599]
```

Proxy config can be set globally or per request:

```yaml
http:
  conId: proxy
  baseURL: https://api.example.com
  proxy:
    protocol: http
    host: localhost
    port: 3128
    keepAlive: true
```

`HttpService.buildAgent(proxy, opts)` builds proxy agents from a normalized proxy `URL` plus Node `AgentOptions`. The `protocol` value may be provided as `http` or `http:`. Advanced callers that need custom agent options should pass them through the second argument instead of shaping the proxy object like an agent constructor argument.

## Guidelines

- Prefer `baseURL` in config and relative URLs in app services.
- Use `serializer: true` for bracket-style array query serialization.
- Keep third-party API response mapping in the consuming app.
- Avoid enabling `curlirize` when logs could expose tokens or sensitive payloads.
- Keep proxy protocol, host, port, and auth in `HttpProxyConfig`; keep keep-alive, timeout, and socket tuning in proxy config or explicit agent options.
- Package tests mock Axios and proxy agents; use consumer scenarios for live endpoint checks.

## Development

```bash
yarn lint --scope @joktec/http
yarn build --scope @joktec/http
yarn test --scope @joktec/http
```
