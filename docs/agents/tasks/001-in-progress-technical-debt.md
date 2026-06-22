# In-Progress Technical Debt

This task note records incomplete work outside the stable baseline. It is not implementation truth.

## Observed Incomplete Work

- Bull Board setup was moved from `GatewayFactory` toward `BullModule`.
- `@bull-board/nestjs` was added in unfinished work.
- `BullModule.forRoot` shape changed in unfinished work.
- `BaseController` gained configurable validation pipe options in unfinished work.
- `DiscoveryService` was exported from core in unfinished work.
- HTTP package dependencies for cookie jar support were added in unfinished work, but no stable implementation uses them.
- Mongo config schema and dependency versions changed in unfinished work.

## Status

Technical debt / future review only.

## Documentation Rule

Do not describe unfinished behavior in `ARCHITECTURE.md`, `RUNTIME.md`, `PROJECT_CONTEXT.md`, or `CONTRACTS.md` unless equivalent implementation is present in the stable code.
