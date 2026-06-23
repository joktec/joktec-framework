# Decisions

Baseline: current stable implementation.

## Durable Decisions

- Use a monorepo with apps and reusable packages.
- Keep `@joktec/core` as the central framework package.
- Keep `@joktec/utils` dependency-light and below `@joktec/core`.
- Use NestJS modules, dependency injection, decorators, and lifecycle hooks as the framework model.
- Use config-driven runtime behavior.
- Use `conId` for multi-connection clients.
- Use factory-generated CRUD controllers and microservice controllers for standard resource patterns.
- Keep database-specific repositories inside database packages.
- Keep app-specific repository queries inside apps.
- Use decorators and loaders for broker ergonomics.
- Bull root configuration and Bull Board setup belong to `BullModule`; gateway runtime remains responsible for HTTP bootstrap.
- Use `cz-git`, commitlint, and Lerna conventional commits as the release-note pipeline for package changelogs.
- Keep agent-facing changelog entries separate from generated package release notes.

## Decision Records

- `docs/agents/decisions/0001-monorepo-framework-boundaries.md`
- `docs/agents/decisions/0002-config-driven-client-lifecycle.md`
- `docs/agents/decisions/0003-generated-crud-contracts.md`
- `docs/agents/decisions/0004-release-changelog-document-sync-policy.md`
