# QA report: Rabbit amqplib 2.x type compatibility

Date: 2026-10-07
Verdict: PASS

## Acceptance evidence

| AC | Result | Evidence |
| --- | --- | --- |
| AC-1 | PASS | Source and emitted declarations for producer, publisher, and consumer import `Options` from `amqplib`; package build and sequential no-emit typecheck pass. |
| AC-2 | PASS | Consumer source and declaration use one type-only import for `ConsumeMessage, Options` from `amqplib`. |
| AC-3 | PASS | Strict isolated consumer fixtures compile `@RabbitSend('jobs', { persistent: true })` against exact `amqplib` 2.0.1 and 2.2.0. An `@ts-expect-error` assertion for an unknown option is consumed in both fixtures, proving the option type did not degrade to `any`. Decorator/service source has no diff, and the three emitted model JavaScript files contain no runtime `amqplib` import. |
| AC-4 | PASS | Frozen install resolves `amqplib` 2.0.1 with built-in `index.d.ts`; `@types/amqplib` is absent from the installed tree and removed from the Rabbit manifest/lock entry. The same emitted Rabbit declarations compile with exact `amqplib` 2.2.0. |
| AC-5 | PASS | Repository source scan finds no `amqplib/properties` import. Emitted Rabbit declarations also contain no invalid subpath. |

## Commands and outcomes

- `yarn install --frozen-lockfile --ignore-scripts` under default Node 22.9.0: exit 1 before `node_modules` creation because `@commitlint/cli@21.0.2` requires Node >=22.12.0.
- `PATH=/Users/user/.nvm/versions/node/v22.23.2/bin:$PATH yarn install --frozen-lockfile --ignore-scripts`: exit 0. Install scripts stayed disabled. `yarn.lock` SHA-256 remained `32b0ba4679a9bf35d0e63fc4c62d4079d6cf0beaf6a0b5cffa8d75515592a3e1` before and after installation.
- `PATH=... yarn build --scope @joktec/rabbit`: exit 0; Nx/Lerna built Rabbit plus required `@joktec/utils` and `@joktec/core` dependencies.
- An initial no-emit command started in parallel with the dependency build and failed on unresolved workspace declarations. This was an ordering race. The authoritative sequential post-build command `PATH=... yarn tsc -p packages/brokers/rabbit/tsconfig.json --noEmit --incremental false` exited 0.
- In each ignored fixture directory `temp/rabbit-types-2.0.1` and `temp/rabbit-types-2.2.0`: `npm install --ignore-scripts --package-lock=false --no-audit --no-fund`, then `./node_modules/.bin/tsc -p tsconfig.json --pretty false`: exit 0. Runtime version readback reported exact `amqplib` 2.0.1 and 2.2.0 respectively and Rabbit 0.2.17.
- `git diff --check`: exit 0.
- Declaration/source scans: three corrected source imports and three matching emitted imports found; no invalid subpath in emitted declarations; no runtime imports in the three emitted model JavaScript files.

## Files and scope

Implementation files verified:

- `packages/brokers/rabbit/src/models/rabbit-producer.model.ts`
- `packages/brokers/rabbit/src/models/rabbit-publisher.model.ts`
- `packages/brokers/rabbit/src/models/rabbit-consumer.model.ts`
- `packages/brokers/rabbit/package.json`
- `yarn.lock`

QA added only this report. Isolated fixtures and build output are ignored under `temp/` and package `dist/`; no permanent test file was added. No service, consumer harness, publish, stage, or commit command ran.

## Defects and residual risk

No implementation defect found. The default shell Node 22.9.0 cannot install the current workspace dependency set; QA used the already-installed Node 22.23.2 that satisfies declared engines. No live RabbitMQ runtime was exercised because the accepted change is type/declaration-only and runtime services were outside scope.

Next responsible role: Main for final handoff; no engineering fix is required.
