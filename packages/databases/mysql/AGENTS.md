# MySQL Package Agent Guide

This package is the relational TypeORM database layer for JokTec. The package name is `mysql`, but the stable target set is MySQL, MariaDB, and Postgres through TypeORM.

## Read First

- `src/index.ts`: public export boundary.
- `src/mysql.module.ts`: dynamic module and entity registration.
- `src/mysql.service.ts`: DataSource lifecycle, sync handling, and connection lookup.
- `src/mysql.repo.ts`: base repository, query builder, CRUD methods, pagination, transactions, and soft delete behavior.
- `src/mysql.config.ts`: supported dialects and runtime config defaults.
- `src/helpers/mysql.helper.ts`: request-to-TypeORM query parsing and field validation.
- `src/helpers/mysql.finder.ts`: deprecated legacy FindOptions parser.
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

## Runtime Rules

- `MysqlService.start()` must fail startup when `DataSource.initialize()` or controlled sync fails.
- `sync` is disabled by default and should be enabled only by an owner process such as the example microservice or a migration owner.
- `MysqlRepo.qb()` is the canonical read path for standard repository methods.
- `MysqlFinder` is deprecated compatibility code and should not receive new behavior.
- Cursor pagination defaults to `createdAt` plus primary keys; custom cursor keys must be mapped columns.
- `uuidv7` primary keys are framework-generated before insert and are intended for UUID use cases that benefit from time-ordered ids.

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
