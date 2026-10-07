# Rabbit amqplib 2.x type compatibility implementation report

Date: 2026-10-07
Status: READY-FOR-QA

## Understanding and acceptance criteria

- AC-1: Rabbit producer, publisher, and consumer models resolve `Options` from the public `amqplib` entrypoint.
- AC-2: The consumer model imports both `ConsumeMessage` and `Options` as types from the same public entrypoint.
- AC-3: `@RabbitSend` options continue to accept `Options.Publish`, including `persistent`, without changing decorator, payload, or runtime behavior.
- AC-4: Rabbit dependencies use the typings shipped by `amqplib` 2.x and do not retain a redundant legacy `@types/amqplib` package.
- AC-5: No other invalid `amqplib` subpath imports remain in repository source.

## Implementation

- Replaced the three `amqplib/properties` imports with type-only imports from `amqplib`.
- Consolidated `ConsumeMessage` and `Options` in the consumer type import.
- Removed `@types/amqplib` from the Rabbit package and its unique lockfile entry. `amqplib` 2.0.1 and 2.2.0 both ship `index.d.ts`, export `Options` and `ConsumeMessage` from the package root, and define `Options.Publish.persistent?: boolean`.
- Kept the runtime dependency range `amqplib: ^2.0.1` and its locked 2.0.1 resolution unchanged.
- No ADR is required because this corrects dependency type resolution without changing architecture or public behavior.

## Files changed and AC mapping

- `packages/brokers/rabbit/src/models/rabbit-producer.model.ts`: AC-1, AC-3
- `packages/brokers/rabbit/src/models/rabbit-publisher.model.ts`: AC-1, AC-3
- `packages/brokers/rabbit/src/models/rabbit-consumer.model.ts`: AC-1, AC-2
- `packages/brokers/rabbit/package.json`: AC-4
- `yarn.lock`: AC-4
- `docs/artifacts/impl-report/rabbit-amqplib-types.md`: implementation handoff

## Evidence collected

- Repository-wide `rg` found `amqplib/properties` only in the three corrected model files.
- Remaining Rabbit imports use the public `amqplib` entrypoint.
- `npm view` and isolated `npm pack` inspection confirmed built-in declarations and root exports in both locked `amqplib@2.0.1` and target-compatible `amqplib@2.2.0`.
- `git diff --check` passed.
- Build and typecheck were not run in the implementation role because the workspace has no installed `node_modules`; QA owns executable verification.

## Required QA coverage

Prepare dependencies without changing the lockfile, then verify the package:

```bash
yarn install --frozen-lockfile --ignore-scripts
yarn build --scope @joktec/rabbit
yarn tsc -p packages/brokers/rabbit/tsconfig.json --noEmit
```

Confirm the generated declarations accept a consumer usage such as `@RabbitSend({ persistent: true })`, and repeat type resolution against an isolated `amqplib@2.2.0` install. Do not edit repository `node_modules` manually.

## Risks and dependency impact

- The change is declaration-only and does not change Rabbit runtime calls, message payloads, or decorator signatures.
- Consumers resolving any supported `amqplib` 2.x version use that package's built-in declarations. The package continues to permit 2.0.1 through compatible 2.x releases through its existing semver range.
- Cross-repository impact is limited to fixing emitted declarations for consumers of `@joktec/rabbit`; no coordinated runtime or infrastructure change is required.

Next responsible role: quality_assurance.
