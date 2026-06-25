# JokTec Example Gateway

`@joktec/gateway` is a full HTTP gateway example for JokTec. It models a fictional social network similar to a photo-sharing app, with enough real-world shape to exercise framework packages through controllers, services, repositories, brokers, queues, storage, Firebase, and database integrations.

This is not a production product and is not affiliated with any real social platform. All domains, workflows, and feature names are hypothetical examples used for framework validation, documentation, and end-to-end testing.

## Example Product Scope

The gateway represents the public API used by mobile and web clients.

Implemented example areas include:

- Authentication, user profiles, sessions, and OTP flows.
- Social content such as articles, posts, comments, reactions, follows, blocks, tags, categories, and reports.
- Media-oriented examples through assets, storage, Firebase, and article file metadata.
- Notification and inquiry workflows.
- Search, filtering, sorting, relation population, and mixed pagination patterns.
- Operational log browsing through `data-logs`, backed by the Mongo collection written by `pino-mongodb`.
- Profile badge catalog management through `profile-badges`, backed by MySQL and assigned to Mongo user profiles.
- Creator analytics examples through `creator-insights` and `creator-milestones`, backed by MySQL entities with JSON columns, relations, checks, indexes, version columns, and computed virtual fields.

## Technical Purpose

This app exists to keep JokTec framework packages exercised in a near-real project shape:

- `@joktec/core` for gateway bootstrap, base controllers, base services, config, logging, metrics, BullMQ, Swagger, and guards/pipes/interceptors.
- `@joktec/mongo` and `@joktec/mysql` for repository examples.
- Broker packages for Kafka, RabbitMQ, SQS, Redis transport, and Redcast examples.
- Adapter and integration packages for cache, mail, storage, Firebase, and HTTP utilities.

`articles` and `comments` intentionally use offset pagination to mimic mobile load-more flows. Most other modules keep the default page pagination behavior.

`profile-badges` intentionally uses both database packages in one flow: MySQL stores catalog-style badge definitions, while Mongo stores the user's assigned badge ids. This keeps the example realistic without turning the app into a real customer product.

`creator-milestones` intentionally models a relational child table of `creator-insights`. It demonstrates the JokTec MySQL super decorators for relation columns, relation-id columns, property/table indexes, table checks, optimistic versioning, and virtual getter metadata.

## Common Commands

```bash
yarn dev --scope @joktec/gateway
yarn build --scope @joktec/gateway
yarn lint --scope @joktec/gateway
```

The app expects supporting services from the local JokTec Docker stack. Keep credentials as placeholders or local-only secrets; never commit real service credentials.
