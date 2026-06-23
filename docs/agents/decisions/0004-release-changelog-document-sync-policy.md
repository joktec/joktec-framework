# 0004 - Release Changelog and Document Sync Policy

## Status

Accepted.

## Context

JokTec is an independent-versioned monorepo with reusable packages, example apps, generated package changelogs, and Agent Docs. Package release notes, framework-level impact notes, and Agent Docs history serve different audiences and should not be mixed.

## Decision

Use `cz-git` as the standard conventional commit prompt, commitlint as the enforcement layer, and Lerna conventional commits as the package changelog generator.

Maintain separate changelog ownership:

- `docs/agents/CHANGELOG.md`: meaningful agent-facing framework, policy, and documentation impact.
- Package `CHANGELOG.md`: generated package release notes.

Document Sync must route updates by verified impact level: framework-level, package-family-level, package-level, or no-doc-impact.

## Consequences

- Package release note quality depends on scoped, release-quality commit messages.
- Agent Docs stay focused on implementation-backed architecture, runtime, rules, release policy, and navigation changes.
- Package-local changes no longer pollute framework-level documentation unless they affect architecture, runtime, public contracts, or future-agent navigation.
