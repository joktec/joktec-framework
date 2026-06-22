# Document Sync

## Policy

Document Sync is explicit-only. Do not update agent docs unless the user asks for Document Sync, docs sync, agent docs update, architecture/runtime docs update, changelog update, or equivalent wording.

## Source-of-Truth Priority

1. Current stable implementation.
2. Runtime behavior, tests, generated artifacts, and build output.
3. Current agent docs.
4. Changelog and decision records.
5. Task notes.
6. External references.

Task notes and unfinished work are not implementation truth.

## Sync Workflow

1. Identify the requested baseline.
2. Read `AGENTS.md`.
3. Read this file.
4. Inspect code before editing docs.
5. Compare implementation to docs.
6. Classify the impact.
7. Update only affected docs.
8. Keep incomplete work in `docs/agents/tasks/`.
9. Add changelog entries only for meaningful documented changes.

## Changelog Rules

For this first documentation version, `CHANGELOG.md` records only the stable baseline. Future entries must describe implementation-backed changes only.

Do not add changelog entries for plans, experiments, formatting-only edits, or unpublished incomplete work.

## In-Progress Work Handling

If unfinished work exists:

- exclude it from architecture, runtime, contracts, and project context
- record it only as technical debt or task material
- mark uncertainty explicitly when code intent is not complete

## Generated and Contract Docs

Contract docs must describe implemented controllers, message patterns, public interfaces, and generated schema behavior. If generated artifacts are stale, say so in task notes rather than changing implementation truth.
