# Changelog

## 2026-06-26 - Mongo Connection Params and Index Sync Diagnostics

- Recorded `@joktec/mongo` connection option precedence where query-style `params` override duplicate keys from `options`.
- Recorded Mongo auto-index diagnostics around `diffIndexes()` / `syncIndexes()` failures and noted distributed index-sync coordination as technical debt for multi-service deployments.

## 2026-06-26 - Wrapper Enum Inference and Controller Pagination Contract Sync

- Recorded `@joktec/mongo` `@Prop({ enum })` and `@joktec/mysql` `@Column({ enum })` as schema-first wrapper inputs that infer enum type, validation, and Swagger metadata unless explicitly overridden.
- Recorded `BaseController` pagination response selection as `IControllerProps.paginate.mode`, replacing the previous top-level controller pagination selector.

## 2026-06-25 - HTTP Proxy Agent Constructor Compatibility

- Recorded `@joktec/http` proxy agent construction fix for current `http-proxy-agent` and `https-proxy-agent` constructor contracts.
- Clarified that `HttpService.buildAgent(proxy, opts)` builds agents from a normalized proxy `URL` plus Node `AgentOptions`, keeping proxy endpoint/auth data separate from socket tuning options.

## 2026-06-25 - Mongo Schema-First Wrapper Contract Sync

- Recorded `@joktec/mongo` schema-first wrapper behavior for `@Schema`, `@Prop`, `RefId`, `PopulatedRef`, and wrapper-owned `ObjectId`.
- Documented Mongo schema modes for collection, embedded value objects, and embedded subdocuments with `_id` and timestamps.
- Recorded `@Prop` inference for virtual populate fields from `ref`, `localField`, and `foreignField`, including populate-one fallback to `ref`, automatic `justOne`, compact Swagger examples, virtual getter metadata, and raw map fields.
- Clarified Mongo response normalization expectations: repository reads should return schema class instances with string-safe ObjectId/BSON values, while raw Mongoose documents remain available through native model access.

## 2026-06-25 - MySQL Schema-First Wrapper Contract Sync

- Recorded `@joktec/mysql` schema-first wrapper behavior for `@Tables`, `@Column`, `@PrimaryColumn`, `@PrimaryGeneratedColumn`, and `@TimestampColumn`.
- Documented MySQL `Column({ kind })` modes for normal, version, view, virtual getter, SQL virtual, relation, relation-id, and tree fields.
- Recorded `immutable` as the MySQL API read-only hint, with Swagger `readOnly` inferred from `immutable`, selected system-managed column kinds, and TypeORM `update: false`.
- Recorded lazy Swagger metadata for MySQL relation wrappers so two-way relations do not require redundant consumer `swagger.type` overrides.
- Clarified the framework wrapper philosophy: wrappers standardize lifecycle, schema metadata, validation, transform, Swagger, and repository contracts while preserving native-library escape hatches.

## 2026-06-24 - Database Package Hardening and Example Consumer Sync

- Recorded Mongo hardening for multi-connection model resolution, safer query parsing, debug rendering, plugin behavior, ObjectId normalization, and expanded package tests.
- Recorded MySQL hardening for schema-first column decorators, uuidv7 primary keys, first-class relational dialects, query safety, normalized driver errors, and deprecated legacy finder usage.
- Documented focused package-level agent guides for `@joktec/mongo` and `@joktec/mysql`.
- Recorded the example social-network `profile-badges` flow that uses MySQL for badge catalog data and Mongo user profiles for assigned badge ids.

## 2026-06-24 - Package Testing Coverage and Consumer Harness Sync

- Recorded package-level Jest coverage as an implemented framework verification surface across common, adapters, brokers, databases, integrations, and tools.
- Documented `test/consumer/` as the example application scenario harness for smoke, database, Redis transport, and broker checks.
- Clarified that package tests mock external SDK clients and that live runtime stack checks belong to the consumer harness.
- Added agent search hints and local report-capture commands for broad lint, build, coverage, and consumer scenario runs.

## 2026-06-23 - Pagination Contract and Cursor Runtime Sync

- Documented shared page, offset, and cursor pagination contracts in `@joktec/core`.
- Recorded `BaseController` pagination response-shape selection with custom DTO override behavior.
- Recorded runtime pagination precedence: cursor, then offset, then page.
- Documented Mongo and MySQL cursor pagination as database-level keyset implementations.
- Clarified gateway/micro database ownership in runtime docs.

## 2026-06-23 - Document Sync and Changelog Governance

- Documented framework-level, package-family-level, package-level, and no-doc-impact routing for Document Sync.
- Clarified ownership of Agent Docs and package changelogs.
- Added commit and changelog rules for scoped conventional commits and generated package release notes.
- Recorded Husky hook migration to the v9+ direct-command format without the deprecated shim.
- Recorded `@joktec/types` schema generator behavior for the updated `ts-json-schema-generator` integration.

## 2026-06-22 - Initial Agent Documentation Baseline

Baseline: current stable implementation.

- Added first Agent Documentation system.
- Documented current stable architecture, runtime behavior, repository map, contracts, rules, glossary, decisions, and search hints.
- Recorded incomplete work only as technical debt, not as implemented behavior.
