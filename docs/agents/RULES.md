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

## Commit And Changelog Rules

- Use `yarn commit` for the `cz-git` conventional commit prompt.
- Manual commits must still pass commitlint through the Husky `commit-msg` hook.
- Husky hooks use the v9+ direct-command format; do not re-add the deprecated `husky.sh` shim.
- Use package, package-family, app, or repo scopes from the approved commitlint scope list.
- `feat`, `fix`, `perf`, `refactor`, `impl`, and `build` commits must include a scope.
- Avoid generic subjects such as `update`, `upgrade package`, `fix bug`, or `impl: update`.
- Split unrelated scopes into separate commits and use partial staging when one file contains unrelated hunks.
- Package changelogs are generated from conventional commits during Lerna release.
- `docs/agents/CHANGELOG.md` is manually curated for meaningful agent-facing framework, policy, and documentation impact.
- Do not manually edit package `CHANGELOG.md` during normal coding or Document Sync unless correcting release documentation before publish.
