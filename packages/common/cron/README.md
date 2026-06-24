# @joktec/cron

Cron and worker primitives for JokTec microservices.

`@joktec/cron` provides reusable scheduling and resumable job-processing primitives for services that need cron metadata, persisted cron state, batch processing, retry behavior, and dependency-aware job execution.

## What It Provides

- `Crontab` decorator for declaring cron metadata.
- `CrontabScheduler` for loading, starting, stopping, refreshing, triggering, and recording cron jobs through app repositories.
- Cron repository interfaces and cron history models.
- `JobWorker` and job processor helpers.
- Re-exports from `@nestjs/schedule` and `cron`.
- Dayjs plugin setup used by cron/job scheduling utilities.

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

`CrontabScheduler` expects the consuming app to provide repositories for cron definitions and cron execution history. This keeps persistence technology in the application while sharing scheduler behavior.

## Job Worker Usage

Extend `JobWorker` when a service needs resumable date-range or batch job processing:

```ts
import { JobWorker, IJobModel, JobStatus } from '@joktec/cron';

export class FeedSyncWorker extends JobWorker<IJobModel> {
  protected async process(job: IJobModel): Promise<IJobModel> {
    await this.syncFeed(job.date);
    return { ...job, status: JobStatus.DONE };
  }
}
```

Config is read through `ConfigService` by the worker config key and supports concurrency, batch size, retries, date ranges, dependencies, reset timeout, and auto-exit behavior.

## Guidelines

- Keep cron repository implementations in the consuming app.
- Use persisted cron/job state when jobs must survive restarts.
- Keep job payload schemas explicit and idempotent.
- Prefer microservice/worker processes for cron execution instead of request-facing gateways.

## Development

```bash
yarn lint --scope @joktec/cron
yarn build --scope @joktec/cron
yarn test --scope @joktec/cron
```
