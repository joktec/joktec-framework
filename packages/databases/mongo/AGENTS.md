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
- Use `RefId<T, RawId>` for stored reference id fields and `PopulatedRef<T>` for populated virtual fields. Do not use Typegoose `Ref<T>` for populated virtuals when application code expects direct property access on the populated instance.

## Wrapper Philosophy

`@joktec/mongo` is a schema-first wrapper, not a replacement for Mongoose or Typegoose. The wrapper should make high-frequency schema work compact by combining Typegoose metadata, class-validator, class-transformer, Swagger, repository response normalization, and plugin hooks in one declaration.

Prefer wrapper options when they express a normal JokTec schema contract. Use native Mongoose/Typegoose APIs through `MongoService.getModel(...)`, raw Typegoose decorators, or Mongoose plugins when the project needs behavior that is too rare or too specific for the wrapper.

## Runtime Rules

- `MongoService` owns connection startup, readiness, shutdown, and registered model lookup.
- Mongo connection options merge base defaults first, `config.options` second, and query-style `config.params` last. Duplicate keys in `params` override `options`.
- `MongoModule.forRoot(...)` registers app schema classes; apps own the schema list.
- `autoIndex` uses `diffIndexes()` before `syncIndexes({ continueOnError: true })` and logs sync failures with connection/schema context. Keep `autoIndex` enabled only in a single schema/index owner process when multiple services share the same database.
- `MongoRepo.qb()` is the canonical read path for standard repository methods.
- Repository id conditions must accept strings, JokTec `ObjectId`, and native Mongoose/BSON ObjectId values without falling through to generic object filters.
- Cursor pagination defaults to `_id`; custom cursor keys append `_id` as a tie-breaker.
- `MongoHelper` should cast ObjectId values only for `_id`, schema ObjectId paths, or explicitly configured ObjectId paths.
- `$like`, `$begin`, and `$end` escape regex input by default. Raw regex behavior must be explicit.
- Repository read responses use lean query results and then transform them into schema class instances. ObjectId values should be normalized into DTO-friendly strings, including populated and deep-populated values.
- Use `@Schema({ kind: 'embedded' })` for value objects without `_id` or timestamps.
- Use `@Schema({ kind: 'subdocument' })` for embedded documents that still need their own `_id` and timestamps.
- Use explicit lazy `type` resolvers for arrays and nested classes. Populate-one fields can infer `type` from `ref`; populate arrays still need `type: () => [Target]`.
- Virtual computed getters should use `@Prop({ kind: 'virtual', mode: 'getter', ... })` to apply expose and Swagger metadata without registering a persisted Mongoose path.
- Virtual populate fields are inferred from `ref`, `localField`, and `foreignField`. Use `@Prop({ ref: () => Target, foreignField: '_id', localField: 'targetId' })` for populate-one fields and add `type: () => [Target]` for populate arrays.
- Use `@Prop({ kind: 'map', type: Object, ... })` only for Mongoose Map-shaped key/value objects.
- Use `@Prop({ kind: 'mixed', type: Object | [Object], ... })` for explicit raw Mixed payloads such as flexible provider snapshots or arrays of raw upstream actions/targets. Do not use `kind: 'map'` for array payloads.

## Plugin Notes

- Paranoid soft delete must respect aggregate first-stage constraints such as `$geoNear`.
- Paranoid aggregate handling must preserve the caller pipeline and never share the same array reference when replacing Mongoose aggregate stages.
- Strict reference checks must be connection-aware and should validate save/update/delete paths without assuming the default mongoose registry.
- Transform hooks should preserve Mongo update operators and avoid breaking snapshot-style Map or subdocument payloads.

## Verification

```bash
yarn lint --scope @joktec/mongo
yarn build --scope @joktec/mongo
yarn test --scope @joktec/mongo
yarn test:consumer:db
```
