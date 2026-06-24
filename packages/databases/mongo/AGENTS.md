# Mongo Package Agent Guide

This package is the MongoDB/Mongoose/Typegoose database layer for JokTec. Treat it as a high-impact framework package because it owns connection lifecycle, schema registration, repository behavior, query parsing, plugins, and Mongo-specific error contracts.

## Read First

- `src/index.ts`: public export boundary.
- `src/mongo.module.ts`: dynamic module and schema registration.
- `src/mongo.service.ts`: connection lifecycle, readiness, and connection-aware model resolution.
- `src/mongo.repo.ts`: base repository, query builder, pagination, soft delete, and response transformation.
- `src/helpers/mongo.helper.ts`: request-to-Mongo condition/projection/sort/populate parsing.
- `src/helpers/mongo.pipeline.ts`: aggregation and lookup helpers.
- `src/helpers/mongo.utils.ts`: debug command rendering for Mongo shell usage.
- `src/plugins/*`: paranoid soft delete, strict reference validation, and transform hooks.
- `src/decorators/*`: schema and property wrappers around Typegoose, validation, transform, and Swagger metadata.

## Boundary Rules

- Do not import app schemas, app repositories, or app-specific query semantics into this package.
- Preserve `conId` support. Repositories and plugins must resolve models through the intended Mongo connection.
- Keep `MongoRepo` compatible with the shared `IBaseRepository` contract from `@joktec/core`.
- Keep page, offset, and cursor response behavior aligned with the shared pagination contracts.
- Keep decorators schema-first and reusable by DTO mapped types, but avoid mutating caller-provided option objects.
- Keep query parsing predictable. Avoid broad magic casting that can change user data semantics.

## Runtime Rules

- `MongoService` owns connection startup, readiness, shutdown, and registered model lookup.
- `MongoModule.forRoot(...)` registers app schema classes; apps own the schema list.
- `MongoRepo.qb()` is the canonical read path for standard repository methods.
- Cursor pagination defaults to `_id`; custom cursor keys append `_id` as a tie-breaker.
- `MongoHelper` should cast ObjectId values only for `_id`, schema ObjectId paths, or explicitly configured ObjectId paths.
- `$like`, `$begin`, and `$end` escape regex input by default. Raw regex behavior must be explicit.
- Read responses should normalize ObjectId values into DTO-friendly string values, including populated/nested values.

## Plugin Notes

- Paranoid soft delete must respect aggregate first-stage constraints such as `$geoNear`.
- Strict reference checks must be connection-aware and should validate save/update/delete paths without assuming the default mongoose registry.
- Transform hooks should preserve Mongo update operators and avoid breaking snapshot-style Map or subdocument payloads.

## Verification

```bash
yarn lint --scope @joktec/mongo
yarn build --scope @joktec/mongo
yarn test --scope @joktec/mongo
yarn test:consumer:db
```
