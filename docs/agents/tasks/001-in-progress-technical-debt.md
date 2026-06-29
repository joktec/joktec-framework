# In-Progress Technical Debt

This task note records incomplete work outside the stable baseline. It is not implementation truth.

## Observed Incomplete Work

- HTTP package dependencies for cookie jar support were added in unfinished work, but no stable implementation uses them.
- Mongo index synchronization has no distributed lock yet. If multiple services or restarted clusters enable `autoIndex` against the same database, concurrent `diffIndexes()` / `syncIndexes()` flows can race and abort index builds. Current guidance is to enable `autoIndex` in exactly one schema/index owner process and keep it disabled in request-facing clusters.
- Mongo aggregation condition casting needs a clearer helper contract. `MongoRepo.qb()` and `MongoRepo.cursor()` already parse `query.condition` with schema-aware ObjectId casting, but custom aggregation code can still build `$match` stages outside that path. Future review should decide whether to add one official helper such as `MongoHelper.parseCondition(condition, { schema, omitUndefined })`, make `MongoRepo.pipeline(query)` auto-cast only the root `query.condition`, and document that nested/raw `$lookup.pipeline.$match` stages require explicit helper usage with the correct schema. Avoid broad recursive casting across arbitrary aggregation pipelines because stage context may change collection/schema shape.

## Status

Technical debt / future review only.

## Documentation Rule

Do not describe unfinished behavior in `ARCHITECTURE.md`, `RUNTIME.md`, `PROJECT_CONTEXT.md`, or `CONTRACTS.md` unless equivalent implementation is present in the stable code.
