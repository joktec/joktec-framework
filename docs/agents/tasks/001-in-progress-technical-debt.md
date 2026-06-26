# In-Progress Technical Debt

This task note records incomplete work outside the stable baseline. It is not implementation truth.

## Observed Incomplete Work

- HTTP package dependencies for cookie jar support were added in unfinished work, but no stable implementation uses them.
- Mongo index synchronization has no distributed lock yet. If multiple services or restarted clusters enable `autoIndex` against the same database, concurrent `diffIndexes()` / `syncIndexes()` flows can race and abort index builds. Current guidance is to enable `autoIndex` in exactly one schema/index owner process and keep it disabled in request-facing clusters.

## Status

Technical debt / future review only.

## Documentation Rule

Do not describe unfinished behavior in `ARCHITECTURE.md`, `RUNTIME.md`, `PROJECT_CONTEXT.md`, or `CONTRACTS.md` unless equivalent implementation is present in the stable code.
