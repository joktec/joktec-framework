# 0002 - Config-Driven Client Lifecycle

Baseline: current stable implementation.

## Decision

External systems are managed through config classes and `AbstractClientService`.

## Rationale From Code

Adapters, brokers, tools, and databases extend `AbstractClientService` and read service-specific config during application bootstrap. `ClientConfig` provides common `conId`, inheritance, retry, timeout, and debug fields.

## Consequence

New external clients should follow the same lifecycle unless there is a concrete reason not to.
