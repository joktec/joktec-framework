# Decision 0005: Pagination Contracts and Cursor Keyset Runtime

## Status

Accepted.

## Context

Standard CRUD controllers need stable pagination response contracts for REST and Swagger. Clients also need flexibility to use page pagination for classic lists, offset pagination for mobile-style load-more screens, and cursor pagination for stable ordered streams.

Mongo and MySQL repositories already own database-specific query parsing. Cursor pagination must therefore keep the shared request/response contract in `@joktec/core` while letting each database package build the correct storage-level keyset condition.

## Decision

Use `@joktec/core` as the owner of pagination contracts:

- page response: `prevPage`, `currPage`, `nextPage`, `lastPage`
- offset response: `prevOffset`, `currOffset`, `nextOffset`, `lastOffset`
- cursor response: `hasNextPage`, `nextCursor`

`BaseController` reads `IControllerProps.paginate.mode` to select one representative Swagger response shape per controller. The default is `page`. `customDto.paginationDto` remains the highest-priority override.

Runtime request precedence is cursor first, then offset, then page. Cursor mode is selected when `cursor` or `cursorKey` is present.

Mongo and MySQL implement cursor pagination as keyset pagination:

- Mongo defaults to `_id` and appends `_id` as a tie-breaker for custom cursor keys.
- MySQL defaults to `createdAt` plus primary key columns and validates cursor keys against TypeORM column metadata.
- Both use `limit + 1` fetching to compute `hasNextPage` and generate `nextCursor`.

## Consequences

Swagger shows one configured response shape instead of a `oneOf` union. Runtime clients may still choose a pagination mechanism through request fields.

Database packages keep storage-specific cursor execution. Core remains responsible for shared DTOs, token encoding/decoding, and response metadata shape.
