# MySQL Package Agent Guide

This package is the relational TypeORM database layer for JokTec. The package name is `mysql`, but the stable target set is MySQL, MariaDB, and Postgres through TypeORM.

## Read First

- `src/index.ts`: public export boundary.
- `src/mysql.module.ts`: dynamic module and entity registration.
- `src/mysql.service.ts`: DataSource lifecycle, sync handling, and connection lookup.
- `src/mysql.repo.ts`: base repository, query builder, CRUD methods, pagination, transactions, and soft delete behavior.
- `src/mysql.config.ts`: supported dialects and runtime config defaults.
- `src/helpers/mysql.helper.ts`: request-to-TypeORM query parsing and field validation.
- `src/decorators/table.decorator.ts`: entity/table wrapper.
- `src/decorators/column.decorator.ts` and `src/decorators/columns/*`: schema-first column and primary-key wrappers.
- `src/services/mysql.dialect.ts`: first-class dialect capability matrix.

## Boundary Rules

- Do not import app entities, app repositories, or app-specific SQL behavior into this package.
- Preserve `conId` support for multiple DataSource instances.
- Keep `MysqlRepo` compatible with the shared `IBaseRepository` contract from `@joktec/core`.
- Keep page, offset, and cursor response behavior aligned with the shared pagination contracts.
- Keep entity decorators schema-first so app entities can be reused as mapped DTO sources.
- Validate field paths through TypeORM metadata before interpolating SQL identifiers.
- Do not add Mongo/ObjectId support to this package. TypeORM may support MongoDB, but JokTec routes Mongo schemas through `@joktec/mongo`.

## Wrapper Philosophy

`@joktec/mysql` is a schema-first wrapper over TypeORM, not a replacement ORM. Its decorators should reduce repeated TypeORM, Swagger, `class-validator`, and `class-transformer` stacks while preserving escape hatches for advanced TypeORM behavior.

Preferred wrapper behavior:

- Keep `@Column` as the main property-level entrypoint for persisted columns, relation metadata, relation ids, view columns, version columns, SQL virtual columns, and TypeScript getter virtuals.
- Keep `@PrimaryColumn` / `@PrimaryGeneratedColumn` and `@TimestampColumn` separate because primary keys and business timestamps are high-frequency, semantically special fields.
- Infer validation, transform, and Swagger metadata from wrapper options whenever possible. Use `swagger` only as an override.
- Keep relation Swagger metadata lazy so normal two-way or circular entity relations do not require consumer-level `swagger.type` overrides.
- Use `immutable` as the cross-package API read-only hint. `update: false` remains the TypeORM write behavior and is also treated as Swagger read-only when `immutable` is not set.
- Default read-only metadata for fields that are naturally system-managed or computed, including primary keys, timestamps, version columns, view columns, virtual columns, relation ids, and tree level columns.
- Do not wrap rare TypeORM features unless they remove meaningful duplication. Raw TypeORM remains available for advanced cases that are intentionally outside the wrapper surface.

## Runtime Rules

- `MysqlService.start()` must fail startup when `DataSource.initialize()` or controlled sync fails.
- `sync` is disabled by default and should be enabled only by an owner process such as the example microservice or a migration owner.
- `MysqlRepo.qb()` is the canonical read path for standard repository methods.
- Cursor pagination defaults to `createdAt` plus primary keys; custom cursor keys must be mapped columns.
- `uuidv7` primary keys are framework-generated before insert and are intended for UUID use cases that benefit from time-ordered ids.
- `@Column` is the schema-first property wrapper for persisted columns and metadata-only virtual getters.
- `TimestampColumn('create' | 'update' | 'delete')` is the timestamp wrapper for `CreateDateColumn`, `UpdateDateColumn`, and `DeleteDateColumn` behavior.
- JSON/jsonb/simple-json columns can opt into nested class transformation and validation through the wrapper options instead of duplicating `@Type` and `@ValidateNested` stacks.
- `swagger.readOnly` is inferred from `immutable`, selected system-managed column kinds, or `update: false`. Use `immutable: false` or `swagger.readOnly` only for explicit exceptions.

## Dialect Notes

- First-class dialects: `mysql`, `mariadb`, and `postgres`.
- Dialect capabilities own differences such as `LIKE` vs `ILIKE`, array operator support, fulltext index support, and generated map reliability.
- Do not claim stable support for additional TypeORM drivers without package-level contract tests.

## Verification

```bash
yarn lint --scope @joktec/mysql
yarn build --scope @joktec/mysql
yarn test --scope @joktec/mysql
yarn test:consumer:db
```
