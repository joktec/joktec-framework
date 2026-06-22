# 0001 - Monorepo Framework Boundaries

Baseline: current stable implementation.

## Decision

JokTec is structured as a monorepo with runnable apps under `apps/` and reusable framework packages under `packages/`.

## Rationale From Code

Root workspaces include `packages/*/*` and `apps/*`. Apps depend on concrete `@joktec/*` packages. Packages mostly depend on `@joktec/core` and `@joktec/utils`.

## Consequence

Framework packages must remain app-neutral. App modules may compose packages, but packages should not import app code.
