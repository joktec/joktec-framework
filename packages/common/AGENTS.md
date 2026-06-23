# Common Packages Agent Guide

This guide applies to `packages/common/*`.

## Scope

- `core`: framework bootstrap, modules, abstractions, transports, logging, metrics, exceptions, and decorators.
- `utils`: low-level helpers, constants, and validators.
- `cron`: cron decorators, schedulers, workers, and related models.
- `types`: config schema generation utilities.

## Boundary Rules

- `core` is the central framework layer and must stay app-neutral.
- `utils` should not depend on higher-level framework packages.
- `cron` may use `@joktec/core` primitives for config/logging and repository contracts.
- `types` aggregates package config types for schema generation.
- Do not introduce dependencies from common packages back into apps.

## Runtime Pattern

- `Application.bootstrap` selects gateway or micro runtime from config.
- `GatewayModule`, `MicroModule`, `BullModule`, `LoggerModule`, `ConfigModule`, and metrics live in `core`.
- Client-style packages share `AbstractClientService` and `ClientConfig`.
- Page, offset, and cursor pagination contracts live in `core`; database packages execute storage-specific pagination.
- Cron runtime persists and schedules jobs through app-provided repositories.

## Local Guides

- `packages/common/core/AGENTS.md`
- `packages/common/types/AGENTS.md`
