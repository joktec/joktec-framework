# Common Packages

Common packages provide the framework primitives used by the rest of the monorepo.

## Packages

- `@joktec/core`: NestJS bootstrap, runtime modules, abstractions, config, logging, metrics, exceptions, transports, Bull, JWT, and shared decorators.
- `@joktec/utils`: low-level constants, helpers, and validators.
- `@joktec/cron`: cron decorators, scheduler abstractions, worker helpers, and cron/job models.
- `@joktec/types`: configuration schema generation support.

## Dependency Direction

`common` packages sit below adapters, brokers, databases, integrations, tools, and apps. App-specific logic should not be placed here unless it is reusable framework infrastructure.

## Development

```bash
yarn build --scope @joktec/core
yarn build --scope @joktec/utils
yarn build --scope @joktec/cron
yarn build --scope @joktec/types
```
