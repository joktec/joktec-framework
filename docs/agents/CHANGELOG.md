# Changelog

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
- Recorded `BaseController.paginationMode` as the Swagger response-shape selector with custom DTO override behavior.
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
