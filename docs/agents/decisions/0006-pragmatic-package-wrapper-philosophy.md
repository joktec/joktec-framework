# Decision 0006: Pragmatic Package Wrapper Philosophy

## Status

Accepted.

## Context

JokTec packages wrap established libraries such as TypeORM, Mongoose/Typegoose, broker clients, adapters, and SDKs. The framework needs consistent config, lifecycle, repository, validation, serialization, Swagger, and error contracts without turning each wrapper into a full replacement for the native library.

Database packages make this most visible. `@joktec/mysql` wraps TypeORM decorators so one schema-first entity declaration can carry database metadata, validation, transformation, and Swagger metadata. At the same time, TypeORM still owns advanced behavior that is too rare or dialect-specific for the wrapper to model directly.

## Decision

JokTec wrappers standardize repeated framework conventions and high-frequency patterns, but they preserve native-library escape hatches.

For schema-first database packages:

- wrapper decorators should reduce duplicated metadata stacks
- entity/schema classes may act as DTO metadata sources when practical
- common semantic names should align across packages, such as `immutable` for API read-only metadata
- storage-specific controls remain available, such as TypeORM `update: false`
- rare native features should remain available through raw TypeORM or Mongoose/Typegoose APIs

## Consequences

`@joktec/mysql` keeps `Column` as the broad property-level wrapper while leaving primary keys and timestamps as separate high-frequency wrappers. It does not wrap every TypeORM decorator; advanced projects may still use raw TypeORM decorators when the wrapper would add more complexity than it removes.

Future package wrappers should follow the same rule: wrap common framework contracts first, keep implementation truth in source, and avoid documenting native features as wrapped unless code supports them.
