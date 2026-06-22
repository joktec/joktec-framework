# @joktec/cron

Cron and worker primitives for JokTec microservices.

## What It Provides

- `Crontab` decorator for declaring cron metadata.
- `CrontabScheduler` for loading, starting, stopping, refreshing, triggering, and recording cron jobs through app repositories.
- Cron repository interfaces and cron history models.
- `JobWorker` and job processor helpers.
- Re-exports from `@nestjs/schedule` and `cron`.

## Install

```bash
yarn add @joktec/cron
```

## Usage

```ts
import { CronExpression, Crontab, CrontabScheduler, CrontabTz } from '@joktec/cron';

export class ArtistCronner {
  @Crontab(CronExpression.EVERY_DAY_AT_MIDNIGHT, { timezone: CrontabTz['Asia/Seoul'] })
  async syncArtists() {}
}
```

## Development

```bash
yarn build --scope @joktec/cron
yarn test --scope @joktec/cron
```
