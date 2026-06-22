# JokTec Agent Docs

This file is the minimal entrypoint for agents working in this repository.

## Reading Order

1. `docs/agents/PROJECT_CONTEXT.md`
2. `docs/agents/ARCHITECTURE.md`
3. `docs/agents/RUNTIME.md`
4. `docs/agents/REPO_MAP.md`
5. `docs/agents/RULES.md`
6. `docs/agents/CONTRACTS.md`
7. `docs/agents/SEARCH_HINTS.md`
8. `docs/agents/GLOSSARY.md`
9. `docs/agents/DECISIONS.md`
10. `docs/agents/tasks/`

## Source of Truth

The current stable implementation is the source of truth.

Do not document unfinished, experimental, or unpublished work as implemented behavior. Incomplete work belongs only in `docs/agents/tasks/`.

## Document Hierarchy

- `AGENTS.md`: entrypoint and read order.
- `docs/agents/*.md`: stable project documentation.
- `docs/agents/decisions/`: durable architecture decision records.
- `docs/agents/tasks/`: technical debt, incomplete work, and future review notes.

## Document Sync

Only run Document Sync when explicitly requested. During Document Sync, read `docs/agents/DOCUMENT_SYNC.md`, inspect code first, and update docs only when implementation truth changed.
