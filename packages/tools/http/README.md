# @joktec/http

Axios-backed HTTP client package for JokTec applications.

## What It Provides

- `HttpModule` global Nest module.
- `HttpService` built on `AbstractClientService`.
- Request, response, upload, retry, proxy, auth, and metric models.
- HTTP exception types and proxy agent exports.

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

Configure the `http` section in the application config. Multiple connections are selected with `conId`.

## Development

```bash
yarn build --scope @joktec/http
yarn test --scope @joktec/http
```
