# JokTec Example Microservice

`@joktec/micro` is the worker and private-service example for JokTec. It belongs to the same fictional social-network scenario as `@joktec/gateway`, but focuses on background processing, private/admin-style APIs, cron jobs, and broker-driven workflows.

This is not a production product and is not affiliated with any real social platform. The social-network domain is a hypothetical reference scenario used for framework validation, documentation, and end-to-end testing.

## Example Product Scope

The microservice represents private backend capabilities that should not live directly in the public API gateway.

Implemented example areas include:

- Private service endpoints using microservice controllers and message patterns.
- Scheduled jobs for article and artist workflows.
- Notification processing and centralized outbound integration setup.
- OTP, user, asset, and article worker examples.
- Broker send/receive examples for Kafka, RabbitMQ, SQS, Redis transport, and Redcast.

A typical modeled flow is: the gateway receives a public API request, emits a message, and the microservice performs the private task such as sending mail, processing notifications, updating derived counters, or running scheduled maintenance.

## Technical Purpose

This app exists to validate JokTec packages in worker-style runtime conditions:

- `@joktec/core` microservice bootstrap, client controllers, transport proxies, config, logging, and shared base abstractions.
- `@joktec/cron` for scheduled jobs.
- `@joktec/mongo` for repository examples.
- `@joktec/notifier`, mail/storage/Firebase integrations, and broker packages in background workflows.

## Common Commands

```bash
yarn dev --scope @joktec/micro
yarn build --scope @joktec/micro
yarn lint --scope @joktec/micro
```

The app is intentionally broad rather than minimal, so framework packages can be tested in realistic service composition without depending on a real customer project.
