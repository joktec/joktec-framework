# Rules

## Source of Truth

The current stable code is authoritative. Documentation must follow implemented code, not work-in-progress notes, task notes, or assumptions.

## Repository Rules

- Keep package boundaries intact.
- Do not make app code a dependency of packages.
- Prefer existing `@joktec/core` and `@joktec/utils` primitives.
- Preserve `conId` support in client-style packages.
- Keep framework packages reusable and app-neutral.
- Do not document experimental or unfinished work as implemented behavior.

## Coding Standards

- TypeScript and NestJS patterns are standard.
- Use existing module/service/config naming conventions.
- Use `BaseService`, `BaseController`, `ClientController`, and `AbstractClientService` where the existing package pattern applies.
- Keep config classes validated with decorators from `@joktec/utils`.
- Keep package exports routed through `src/index.ts`.

## Forbidden Actions

- Do not expose secrets, credentials, tokens, or connection strings.
- Do not bypass git hooks or quality gates.
- Do not run destructive git commands unless explicitly requested.
- Do not merge unfinished or experimental work into docs as baseline truth.
- Do not update agent docs during normal coding unless Document Sync is explicitly requested.

## Quality Gates

Use the package scripts already present in the repository:

- `yarn build`
- `yarn lint`
- `yarn test`
- package-level `yarn build`, `yarn lint`, `yarn test`
- `yarn madge` where circular dependency checks are relevant

For commits, follow the repository's commit convention and do not bypass hooks.
