# JokTec Agent Docs

This file is the minimal entrypoint for agents working in this repository.

## Reading Order

1. `docs/agents/PROJECT_CONTEXT.md`
2. `docs/agents/ARCHITECTURE.md`
3. `docs/agents/RUNTIME.md`
4. `docs/agents/REPO_MAP.md`
5. Nearest scoped `AGENTS.md` for the area being changed.
6. `docs/agents/RULES.md`
7. `docs/agents/CONTRACTS.md`
8. `docs/agents/SEARCH_HINTS.md`
9. `docs/agents/GLOSSARY.md`
10. `docs/agents/DECISIONS.md`
11. `docs/agents/tasks/`

## Source of Truth

The current stable implementation is the source of truth.

Do not document unfinished, experimental, or unpublished work as implemented behavior. Incomplete work belongs only in `docs/agents/tasks/`.

## Document Hierarchy

- `AGENTS.md`: entrypoint and read order.
- `docs/agents/*.md`: stable project documentation.
- `docs/agents/decisions/`: durable architecture decision records.
- `docs/agents/tasks/`: technical debt, incomplete work, and future review notes.
- `apps/AGENTS.md`: shared guidance for runnable applications.
- `packages/*/AGENTS.md`: package-family guidance.
- Selected app/package `AGENTS.md`: focused guidance for high-impact areas.

## Document Sync

Only run Document Sync when explicitly requested. During Document Sync, read `docs/agents/DOCUMENT_SYNC.md`, inspect code first, and update docs only when implementation truth changed.
