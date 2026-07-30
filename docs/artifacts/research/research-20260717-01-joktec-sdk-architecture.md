# Architecture Research: Kiến trúc `@joktec/sdk` dựa trên OpenAPI

| Metadata | Giá trị |
| --- | --- |
| File | `research-20260717-01-joktec-sdk-architecture.md` |
| ID | `RESEARCH-20260717-01` |
| Artifact Type | Architecture Research |
| Revision | `r05` |
| Updated | `2026-07-17 12:32:11 +07:00` (Asia/Bangkok) |
| Author | `engineer` |
| Reviewed by | `reviewer` (`READY`, r04 review) |
| Status | `proposed` |

> Đây là tài liệu nghiên cứu kiến trúc, chưa phải ADR được chấp nhận. Mọi package,
> API và quy trình dưới đây đều là đề xuất cho bước thiết kế/triển khai tiếp theo.

## Context

### Mục tiêu

JokTec cần một SDK TypeScript cho frontend và các consumer HTTP, lấy OpenAPI do
backend phát hành làm contract đầu vào. SDK phải cho phép:

1. frontend hiện hữu tiếp tục dùng Axios;
2. frontend mới dùng API theo endpoint và model đã sinh kiểu;
3. consumer nâng cao dùng façade gần với repository nhưng chỉ trên các endpoint,
   query và quyền mà server công bố;
4. backend giữ toàn quyền validation, tenant isolation, authentication và
   authorization.

Mục tiêu không phải đưa repository cơ sở dữ liệu lên browser, cũng không phải biến
OpenAPI thành mã tùy ý trong lúc ứng dụng đang chạy.

### Bốn persona

| Persona | Nhu cầu chính | Cách phục vụ đề xuất |
| --- | --- | --- |
| Backend OpenAPI producer | Định nghĩa schema/repository/module/controller, phát hành contract đúng với runtime | Xuất OpenAPI tái lập được; chạy fidelity gate; công bố version và fingerprint |
| Legacy Axios FE | Không bị buộc viết lại toàn bộ data layer | Giữ Axios; có thể dùng riêng generated DTO/types hoặc di chuyển từng endpoint |
| Endpoint/model SDK FE | Gọi hàm theo `operationId`, có path/query/body/response/error types | Level 1: generated service contract kết hợp runtime `@joktec/sdk` |
| Advanced full-stack consumer | Muốn thao tác resource theo phong cách repository và query có kiểu | Level 2 tùy chọn, chỉ sinh khi server công bố grammar/quyền/giới hạn đầy đủ |

### Bằng chứng từ source JokTec hiện tại

- `packages/common/core/src/infras/gateway/gateway.factory.ts` —
  `GatewayFactory.setupSwagger()` dùng `DocumentBuilder`, thêm `server`, security
  schemes, gọi `SwaggerModule.createDocument()` và `SwaggerModule.setup()`.
  Hiện chưa truyền `operationIdFactory`, chưa ghi snapshot OpenAPI ra artifact và
  chưa phát hành contract fingerprint. Cùng factory hiện gọi
  `app.set('query parser', 'extended')` trước khi đăng ký global middleware; đây là
  seam sở hữu query parser toàn ứng dụng và là nơi duy nhất đủ sớm để thay parser.
- Express `5.2.1` được cài trong workspace. `node_modules/express/lib/request.js` định
  nghĩa `req.query` là getter gọi global `query parser fn`; extended path trong
  `node_modules/express/lib/utils.js` gọi `qs.parse(..., { allowPrototypes: true })`
  với `qs 6.15.0`. `ExpressInterceptor.backupQuery()` đọc `req.query` trước
  `injectRequest()`/`resolverQuery()`, nên mọi check trong interceptor/controller xảy
  ra sau semantic construction của parser extended hiện tại.
- Reproduction read-only với dependency đang cài cho thấy extended parser tạo root
  object có `Object.prototype` và nested
  `condition.constructor.prototype.polluted`; case thử không làm
  `Object.prototype` toàn cục bị pollution. Bằng chứng này là lỗi ordering/trust
  boundary, không phải tuyên bố exploit global pollution đã được chứng minh.
- `packages/common/core/src/decorators/swagger/swagger.config.ts` —
  `SwaggerConfig` có `enable`, `path`, `server`, `auth`, `security`; đường dẫn mặc
  định là `swagger`. `SwaggerAuth` bảo vệ Swagger UI bằng basic auth khi cấu hình,
  nhưng contract JSON và chính sách exposure vẫn cần được xác minh/siết rõ ở bước
  triển khai.
- `packages/common/core/src/interceptors/express.interceptor.ts` —
  `ExpressInterceptor.transformResponse()` bọc object thành
  `{ timestamp, success, errorCode, message, data }`, nhưng primitive được trả thẳng.
- `packages/common/core/src/models/base.dto.ts` — `IResponseDto<T>` khai báo envelope
  dùng cho cả thành công và lỗi; shape khai báo hiện chưa hoàn toàn đồng nhất với
  implementation (`errorCode` xuất hiện ở interceptor nhưng interface dùng `code`).
- `packages/common/core/src/exceptions/filters/gateway-exception.filter.ts` —
  `GatewayExceptionsFilter` tạo envelope lỗi với HTTP status riêng và các trường
  `error`, `message`, `title`, `code`; ở non-production có thể thêm thông tin request,
  còn app mẫu xóa các trường này trong `CustomExceptionFilter`.
- `packages/common/core/src/abstractions/base/base.controller.ts` —
  `BaseController()` sinh list/search/detail/create/update/delete, query/create/update
  DTO và Swagger response. Các `@ApiOkResponse({ type: ... })` hiện mô tả payload DTO
  trực tiếp, trong khi runtime interceptor bọc object vào envelope. Đây là mismatch
  có thể làm client sinh sai kiểu nếu không sửa contract producer. Controller chọn
  một `PaginationDto` cố định từ `props.paginate.mode`, trong khi query runtime vẫn có
  thể chọn page/offset/cursor theo tham số request.
- `packages/common/core/src/decorators/swagger/swagger.decorator.ts` — filter, sorter,
  geo-search và populate hiện được mô tả bằng `style: deepObject`, `type: object`; OAS
  không định nghĩa cách deepObject serialize property lồng nhau/array. Cùng file,
  `ApiUseBearer()` và `ApiUseApiKey()` chỉ gắn Swagger security metadata, không cài
  runtime guard.
- `packages/common/core/src/interceptors/express.interceptor.ts` và
  `packages/common/core/src/models/paginations/cursor-pagination.ts` — runtime mặc
  định `limit = 20`; page dương thắng offset, offset không âm được dùng khi không có
  page, và khi cả hai bị bỏ trống interceptor tự đặt `page = 1`, `offset = 0`; cursor
  hoặc cursorKey sau đó khiến service chọn cursor response. Hành vi request-selected
  này không khớp response DTO cố định trong Swagger.
- `apps/example-gateway/src/modules/assets/asset.controller.ts` — cấu hình
  `useBearer: true` nhưng `guards: [AuthGuard, RoleGuard]` đang bị comment; các route
  vẫn nhận `@Jwt()` payload. Đây là bằng chứng cụ thể rằng bearer metadata hiện có thể
  tuyên bố endpoint được bảo vệ trong OpenAPI dù runtime không enforce.
- `apps/example-gateway/src/common/guards/auth.guard.ts`, `role.guard.ts` và
  `packages/common/core/src/infras/gateway/gateway.module.ts` — enforcement 401/403
  chỉ xuất hiện khi guard thật được cài; bật JWT module không tự tạo global guard.
- `packages/common/core/src/abstractions/sub/sub.controller.ts` —
  `SubController()` sinh contract parent-child, parse parent/child id và giao nghiệp
  vụ embedded/subdocument/relation cho `IBaseSubService`; vì vậy SDK không được suy
  diễn storage model từ URL.
- `packages/common/core/src/models/base.request.ts` — `IBaseRequest<T>` có select,
  keyword, condition đệ quy, page/offset/cursor, sort, near và populate; đồng thời có
  index signature `[key: string]: any`. Type này hữu ích trong backend nhưng quá rộng
  để dùng trực tiếp làm ranh giới an toàn cho browser.
- `packages/common/core/src/abstractions/base/base.service.ts` — `BaseService` quyết
  định page/offset/cursor response và giao query cho `IBaseRepository`; client không
  được bỏ qua lớp service này để gọi database.
- `packages/databases/mongo/src/mongo.repo.ts` và
  `packages/databases/mongo/src/helpers/mongo.helper.ts` — Mongo repository chuyển
  condition/select/sort/populate thành Mongoose query, có keyset cursor và các biện
  pháp parse/cast theo schema. Đây là code server-only.
- `packages/databases/mysql/src/mysql.repo.ts` và
  `packages/databases/mysql/src/helpers/mysql.helper.ts` — MySQL repository chuyển
  request thành TypeORM query builder và kiểm tra đường dẫn field qua metadata; đây
  cũng là code server-only.
- `packages/common/core/src/index.ts`, `packages/common/core/package.json` và root
  `package.json` — package hiện phát hành qua `dist/index`; monorepo dùng Yarn
  workspaces `packages/*/*` và `apps/*`, Lerna/Nx, TypeScript `~5.6.3`. `@joktec/core`
  mang nhiều dependency Nest/server nên không phù hợp làm browser runtime.
- `packages/common/core/src/abstractions/__tests__`, các `src/__tests__` của Mongo/MySQL
  và `test/consumer/` — pattern hiện tại tách package Jest tests khỏi consumer
  scenarios; build package dùng `nest build`. Script lint của package chạy
  `eslint --fix`, do đó không phù hợp cho kiểm tra read-only.

### Sự thật từ hệ sinh thái chính thức

Các quan sát sau là fact từ nguồn chính thức, không phải quyết định JokTec:

- Directus SDK dùng client có thể ghép module: `createDirectus(url).with(rest())`;
  schema TypeScript do consumer cung cấp điều khiển inference cho collection/query.
  SDK nhấn mạnh modular, dependency-free và có custom endpoint escape hatch.
- OpenAPI là interface description độc lập ngôn ngữ. Operation có thể mô tả
  `operationId`, parameters, request body, responses theo media type, servers và
  security requirements. Với `deepObject`, OAS 3.0.4 chỉ định object có scalar
  properties; representation của array hoặc object properties là **không được định
  nghĩa**. OAS cũng yêu cầu tooling cân nhắc spec như input có rủi ro và sanitize
  Markdown/HTML trước khi render.
- RFC 9110 cho phép tự lặp lại request idempotent khi communication failure xảy ra,
  nhưng khuyến cáo không tự retry method non-idempotent nếu client không biết semantics
  thực sự idempotent hoặc không biết request trước chưa được áp dụng. `Retry-After`
  truyền thời gian client nên chờ trước request tiếp theo.
- Express 5 định nghĩa `req.query` là getter, coi shape/value là untrusted và cho phép
  application cài một custom query-parser function nhận toàn bộ raw query string.
  Query parser là application setting toàn cục, không có route context.
- NestJS Swagger có thể xuất JSON/YAML thay vì chỉ UI; `createDocument()` nhận
  `operationIdFactory`. Reflection TypeScript không đủ cho mọi DTO, vì vậy cần
  decorator rõ ràng hoặc CLI plugin và vẫn phải giữ runtime validators.
- `openapi-typescript` sinh types từ OpenAPI 3.0/3.1; `openapi-fetch` dùng `paths`
  types cho request. CLI có `--check`, hỗ trợ input local/remote và validation qua
  Redocly. Đây là lựa chọn nhẹ, nhưng không tự giải quyết envelope và fidelity riêng
  của JokTec.
- Orval sinh models, HTTP functions và tùy chọn mocks/query integrations; input có
  thể là file hoặc URL. Kubb và Hey API dùng plugin pipeline để sinh types, client,
  validators/hooks/mocks. OpenAPI Generator có nhiều target nhưng feature matrix của
  từng generator khác nhau; không thể mặc định mọi cấu trúc OpenAPI đều được hỗ trợ.

## Forces và nguyên tắc

1. **Contract fidelity hơn convenience**: type sai nhưng compile được nguy hiểm hơn
   Axios không có type.
2. **Tách runtime và contract**: transport dùng lại được; DTO/endpoint thay đổi theo
   từng service.
3. **Build-time trước runtime**: codegen phải tái lập được, review được và chạy trong
   CI; browser không parse spec rồi sinh/eval code.
4. **Server là security boundary**: typing phía client không thay thế validation,
   tenant isolation, authorization hay rate limit.
5. **Incremental migration**: SDK không yêu cầu big-bang migration khỏi Axios.
6. **Fail closed khi lấy contract**: discovery mơ hồ, spec không hợp lệ hoặc source
   ngoài allowlist phải làm generation thất bại.
7. **Escape hatch có chủ đích**: consumer được lấy raw response/transport metadata,
   nhưng không có đường tắt vào database package.
8. **Unknown semantics fail closed theo blast radius**: serializer, pagination mode
   hoặc auth policy không rõ làm operation không được generate; retry extension không
   hỗ trợ chỉ được hạ về no-retry khi base operation vẫn là contract hoàn chỉnh.

## Reviewer Finding Closure — `r04`

| Finding / AC | Closure kiến trúc trong revision này |
| --- | --- |
| `SDK-RVW-001` / `AC-SDK-007`, `AC-SDK-008` | Chọn JSON body của typed `POST /search` làm wire contract chuẩn cho query đệ quy; recursive GET v1 là future capability, không được advertise/generate trong MVP. |
| `SDK-RVW-002` / `AC-SDK-008` | Chọn **fixed pagination mode per operation** cho MVP; request, default và response phải cùng mode, cross-mode parameters bị reject; Phase 0 có black-box matrix omitted/page/offset/cursor trước codegen. |
| `SDK-RVW-003` / `AC-SDK-008`, `AC-SDK-010` | Fidelity auth hai chiều so runtime guard/policy với OpenAPI security; public exception phải allowlist rõ; kiểm thử 401 unauthenticated, 403 insufficient-role/scope và public route. |
| `SDK-RVW-004` / `AC-SDK-007`, `AC-SDK-010` | Runtime mặc định không retry; opt-in bị giới hạn bởi idempotency/idempotency key, bounded backoff, `Retry-After`, replayable body và `AbortSignal`. |
| `SDK-RVW-005` / `AC-SDK-010` | Toàn bộ rich text/example/vendor extension/comment/literal từ spec là untrusted; validate, escape/sanitize bằng sink phù hợp và chạy malicious fixtures. |
| `SDK-RVW-006` / `AC-SDK-010` | Future GET v1 phải có GatewayFactory-owned safe global parser làm semantic constructor đầu tiên, sau đó mới route-parse bằng `Map`/null-prototype; raw HTTP fixtures enforce reserved-key/limit controls. |
| `SDK-RVW-007` / `AC-SDK-010` | Unsupported retry extension trên base operation đầy đủ sinh operation ở chế độ no-retry với diagnostic deterministic; chỉ reject khi retry metadata là nguồn của wire/idempotency semantics mà base OAS không mô tả. |
| `SDK-RVW-008` / `AC-SDK-010` | Sửa fidelity gate thành đúng năm lớp và gắn prototype-pollution/retry-fallback fixtures vào lớp 5. |
| `SDK-RVW-009` / `AC-SDK-010` | Xác định `GatewayFactory` là ownership seam; MVP disable recursive GET và dùng typed `POST /search`; future GET cần safe-flat global parser + explicit version marker + capability fingerprint, integration proof extended parser bị bypass và flat query vẫn tương thích. |

## Options considered

### A. Legacy Axios thuần

Giữ các service wrapper Axios thủ công và DTO viết tay.

- Ưu: không thêm codegen pipeline; migration bằng không; linh hoạt cho endpoint lạ.
- Nhược: type drift, error/envelope không thống nhất, khó chứng minh contract coverage,
  trùng boilerplate và phụ thuộc con người cập nhật interface.
- Kết luận: tiếp tục được hỗ trợ như đường rollback/coexistence, không phải baseline
  cho integration mới.

### B. Pure runtime client đọc OpenAPI

`@joktec/sdk` nhận `baseUrl + openapiUrl`, tải và parse spec khi ứng dụng chạy rồi tạo
request động.

- Ưu: không cần checked-in generated code; có thể phản ánh server mới nhanh.
- Nhược: startup phụ thuộc docs endpoint/network, bundle parser lớn, khó tree-shake,
  type compile-time không thể xuất hiện sau khi browser đã chạy; tăng SSRF/ref/parser
  attack surface; build không tái lập được.
- Kết luận: loại khỏi production browser. Chỉ có thể dùng read-only tooling nội bộ
  bị sandbox ở Node, không phải SDK runtime.

### C. Generated per-service client đầy đủ

Mỗi service sinh toàn bộ transport, model và functions/classes vào một package riêng.

- Ưu: contract rõ, không cần tải spec runtime, dễ review diff và publish độc lập.
- Nhược: lặp transport/auth/envelope/error code giữa service; generator upgrade tạo
  diff lớn; khó giữ hành vi thống nhất; bundle có thể phình.
- Kết luận: khả thi nhưng không tối ưu cho monorepo nhiều service.

### D. Build-time generation không có shared runtime

Generator chỉ sinh types/functions dùng trực tiếp `fetch` hoặc Axios cho từng app.

- Ưu: ít abstraction runtime; app toàn quyền kiểm soát.
- Nhược: mỗi app tự giải quyết auth, retry, timeout, envelope, telemetry và raw
  response; migration/behavior không thống nhất.
- Kết luận: phù hợp cho dự án đơn lẻ, không đạt mục tiêu framework JokTec.

### E. Hybrid generic runtime + generated service contracts

`@joktec/sdk` chứa transport app-neutral. Công cụ build đọc OpenAPI đã xác minh để
sinh package contract theo service; generated functions truyền operation descriptor
vào runtime.

- Ưu: tách concern, shared behavior nhỏ, contract versionable, build tái lập, migration
  từng endpoint, không kéo backend dependency vào browser.
- Nhược: cần governance OpenAPI, generator/fidelity gate và release coordination.
- Kết luận: **được đề xuất**.

### So sánh ba chế độ consumer

| Tiêu chí | Legacy Axios | Level 1: endpoint + model | Level 2: schema + repository façade |
| --- | --- | --- | --- |
| Encapsulation | App tự bọc request, dễ lộ chi tiết URL/envelope | Operation function che serialization, transport và unwrap nhưng vẫn phản ánh HTTP | Resource façade che nhóm CRUD/query; nguy cơ che quá nhiều semantics nếu thiết kế rộng |
| Security | Hoàn toàn phụ thuộc app/server; dễ gắn token/log sai | Auth provider app-owned; chỉ endpoint/spec công bố được sinh | Chỉ an toàn nếu server-authorized grammar, field/operator/depth/limit allowlist; không bao giờ là DB access |
| Utility | Tốt cho code cũ/custom flow, thấp về autocomplete/consistency | Cao cho phần lớn FE: typed path/query/body/success/error/security | Cao cho admin/data-heavy app có CRUD chuẩn; thấp cho workflow/command endpoint |
| Migration | Không cần migration nhưng giữ debt | Từng endpoint; có thể dùng generated types với Axios trước | Chỉ sau khi Level 1 ổn định và backend chuẩn hóa resource metadata |
| Coupling | Coupling ẩn với URL/shape viết tay | Coupling công khai với OpenAPI operation/version | Coupling mạnh hơn với resource/query grammar và extension JokTec |
| Operational risk | Drift phát hiện muộn ở runtime | Codegen/CI tăng chi phí nhưng drift được chặn sớm | Query cost, over-fetch/populate và authorization regression có blast radius lớn hơn |

## Proposed Architecture

### Package boundaries

```text
Backend service (Nest/JokTec)
  -> OpenAPI snapshot + manifest + fingerprint
  -> fidelity/security lint + contract tests
  -> generated service contract package
       -> imports @joktec/sdk only
       -> used by FE / Node consumers

@joktec/sdk                         browser/Node runtime, app-neutral
@joktec/sdk-codegen                 Node-only build/dev tooling
@joktec/<service>-contract          generated, versioned per service
legacy Axios services               coexist during migration
```

#### `@joktec/sdk`

Public surface tối thiểu:

- `createJoktecClient({ baseUrl, transport?, auth?, envelope?, driftPolicy? })`;
- Fetch-based transport mặc định, transport adapter interface để app có thể dùng
  Axios mà không buộc runtime phụ thuộc Axios;
- request/response middleware có thứ tự rõ, timeout/abort và headers hợp lệ;
- không retry tự động theo mặc định; retry chỉ được bật bằng policy có typed
  operation metadata và guardrail idempotency;
- `AuthProvider` callback do app sở hữu; SDK không quyết định nơi lưu token;
- `JoktecEnvelope<T>`, `JoktecErrorEnvelope<E>`, `SdkHttpError<E>`,
  `SdkNetworkError`, `ContractDriftError`;
- unwrap envelope mặc định khi operation khai báo envelope; `raw: true` hoặc
  `.raw()` trả `{ status, headers, body, data, requestId }`;
- không có NestJS, Mongoose, TypeORM, Swagger parser hay generator dependency.

Runtime không nên dùng class inheritance sâu. Một client nhỏ + composable transport,
auth và middleware dễ tree-shake hơn; generated façade có thể dùng plain functions
hoặc factory object. Class chỉ nên tồn tại nếu cần lifecycle/state rõ ràng.

#### `@joktec/sdk-codegen`

Node-only và chỉ dùng trong build/CI:

- fetch/bundle/validate OpenAPI theo policy;
- canonicalize và tính fingerprint;
- sinh `types`, endpoint descriptors, functions và optional Level 2 façade;
- ghi metadata generator version/config/input fingerprint;
- output deterministic; không chứa credential và không thực thi code từ spec;
- validate extension JokTec theo schema/version allowlist; extension không biết bị
  reject nếu operation phụ thuộc vào nó, không âm thầm bỏ qua rồi sinh semantics khác;
- generator ecosystem cụ thể vẫn là open question. Nên làm proof-of-concept giữa
  `openapi-typescript + openapi-fetch` và một generator plugin-based trước khi chọn.

#### Generated service contract

Mỗi service có package/output riêng, ví dụ `@joktec/gateway-contract`:

- `models.gen.ts`: component schemas và input/output DTO;
- `operations.gen.ts`: path/query/header/body/success/error/security types theo
  status và content type;
- `client.gen.ts`: named functions ổn định từ `operationId`;
- `resources.gen.ts`: Level 2, chỉ được sinh khi operation có metadata hợp lệ;
- `contract.meta.json` hoặc constant tương đương: OAS version, API version,
  `contractFingerprint`, `artifactFingerprint`, generator id/version/config hash và
  source revision; bỏ `generatedAt` hoặc lấy từ `SOURCE_DATE_EPOCH` để output không
  đổi chỉ vì thời điểm chạy;
- không import DTO class backend, `@joktec/core`, database packages hoặc generator.

Nếu cần runtime validation ở consumer, validator schemas phải là plugin/output tùy
chọn, tách khỏi baseline để không ép bundle mọi app.

### Data flow và generation

1. `GatewayFactory.bootstrap()` sở hữu global Express query-parser setting trước mọi
   middleware/`req.query` access. MVP đánh dấu recursive-GET capability là disabled;
   future capability chỉ bật khi custom safe-flat function đã thay `extended`.
2. Backend bootstrap một app dành cho contract generation, không listen public; một
   app integration riêng listen loopback để chạy query-parser security fixtures.
3. `SwaggerModule.createDocument()` tạo OpenAPI snapshot với `operationIdFactory`
   ổn định hoặc `@ApiOperation({ operationId })` rõ ràng.
4. Producer fidelity gate lint/validate snapshot và runtime capability manifest.
5. Contract tests so response thực với response schema/envelope, security metadata và
   query-parser identity/ordering.
6. Snapshot + capability được canonicalize; SHA-256 tạo contract fingerprint.
7. Codegen với version/config đã pin sinh output tạm và artifact fingerprint riêng.
8. Formatter chạy deterministic; CI diff output tạm với output đã commit/publish.
9. Chỉ publish service contract khi gate pass. Runtime app chỉ import generated
   output; không cần truy cập OpenAPI endpoint.

Build/CI generation là đường chuẩn. Local generation có thể lấy file snapshot để
offline/reproducible; lấy URL chỉ là bước fetch có policy, sau đó luôn lưu/verify
snapshot trước khi codegen.

### OpenAPI URL và deterministic discovery

Thứ tự ưu tiên đề xuất:

1. `openapiUrl` truyền rõ qua CLI/config — ưu tiên cao nhất;
2. service manifest đã khai báo rõ trong repo/artifact registry, chứa URL tuyệt đối,
   expected service id và optional expected fingerprint;
3. một endpoint same-origin cố định `/.well-known/joktec-openapi` khi và chỉ khi
   `discovery: "well-known"` được bật; response chỉ trả URL/version/fingerprint;
4. Nest conventional raw path chỉ khi caller cung cấp `swaggerPath` cụ thể, từ đó
   suy ra đúng một `${baseUrl}/${swaggerPath}-json`.

Không quét port, không thử danh sách path, không dò subnet/DNS và không chọn “URL đầu
tiên trả 200”. Override explicit luôn thắng discovery. Nếu có nhiều candidate, host
không được phép, redirect ngoài policy, service id/fingerprint không khớp, manifest
thiếu hoặc response không phải OpenAPI hợp lệ thì **fail closed** với lỗi có cấu trúc.
Không tự fallback sang spec khác.

### Level 1: endpoint + model baseline

Level 1 là public MVP và baseline bắt buộc:

- mỗi operation cần `operationId` duy nhất, ổn định;
- typed path/query/header/cookie parameters;
- typed request body theo content type;
- typed success responses theo từng status/content type;
- typed error responses, không gộp mọi lỗi thành `unknown` nếu OpenAPI đã mô tả;
- typed security requirement để generator biết operation cần auth nào, nhưng app
  vẫn quyết định credential và consent;
- JokTec envelope được mô tả trong OpenAPI rồi runtime unwrap `data` mặc định;
- raw-response escape hatch giữ HTTP status, headers, envelope/body và request id;
- custom endpoints vẫn được sinh theo operation, không buộc vào CRUD abstraction.

Không được “sửa” spec sai chỉ trong client. Với mismatch hiện tại giữa
`@ApiOkResponse({ type: DTO })` và `ExpressInterceptor`, hướng chuẩn là backend công
khai response envelope thật. Generator transform chỉ được dùng tạm thời, có version,
test và deadline loại bỏ.

### Wire contract cho query đệ quy

`deepObject` không phải contract đủ cho `condition`, `sort`, `near` hay `populate`
lồng nhau: OAS 3.0.4 chỉ định object có scalar properties và tuyên bố representation
của array/object properties là không được định nghĩa. Vì vậy r04 chọn:

1. **Baseline/MVP:** query đệ quy đi qua typed `POST /search` với
   `Content-Type: application/json`; request body schema phải đóng, mô tả field,
   operator, union và limit thực tế. JSON body là canonical semantic transport cho
   Level 1 và Level 2.
2. **GET đơn giản:** chỉ sinh tự động cho scalar và array phẳng có OAS serialization
   xác định. Một recursive parameter chỉ ghi `style: deepObject` là unsupported.
3. **Recursive GET trong MVP: disabled/fail closed.** Không advertise
   `x-joktec-query-serialization/v1`, không generate Level 1/Level 2 recursive GET và
   không coi current `deepObject` là supported. Consumer dùng typed `POST /search`.
   GET v1 chỉ là future capability sau khi GatewayFactory thay global `extended`
   parser và integration/security gate pass.

#### Ownership seam và coexistence

Current `GatewayFactory` cài `app.set('query parser', 'extended')`. Trong Express 5,
`req.query` là getter gọi parser global; `ExpressInterceptor.backupQuery()` là lần đọc
đầu trong core flow, nên interceptor/controller không thể undo object graph đã được
`qs` dựng. R04 quy ownership cho `GatewayFactory.bootstrap()` tại đúng dòng setting
này. Không được claim `resolverQuery()`, pipe hay controller đơn lẻ thỏa
pre-construction safety khi global parser vẫn là `extended`.

Future GET v1 phải cài **trước mọi middleware và mọi `req.query` access**:

```ts
app.set('query parser', safeFlatQueryParserV1);
```

`safeFlatQueryParserV1(rawQueryString)` là semantic constructor đầu tiên và không có
route context. Nó áp hard global byte/pair/key/value limits trước allocation lớn,
percent-decode strict đúng một lần, **không diễn giải bracket path**, không gọi
`qs.parse`/`extended`/deep merge, và trả flat `Object.create(null)` chứa own string
values hoặc arrays cho repeated exact key. Nó reject duplicate policy violations,
reserved top-level key và malformed encoding. Không có marker thì giữ flat-form
compatibility (`+` là space, percent decode một lần, repeated key thành ordered array)
nhưng bracket vẫn là literal. Nếu thấy exact marker
`joktecQueryVersion=1`, nó còn enforce canonical v1 encoding/hard ceilings nhưng vẫn
không dựng nested graph. Output mang internal non-enumerable symbol metadata chứa
frozen flat records, encoded byte count và parser capability id/fingerprint để
route-aware parser áp operation policy mà không đọc lại/delegate raw input.

Coexistence recommendation là **globally safe flat parser + explicit version marker**:

```text
page=2&limit=20&select=id&select=title
  -> null-prototype { page: "2", limit: "20", select: ["id", "title"] }

joktecQueryVersion=1&condition%5Bstatus%5D%5B%24eq%5D=%22published%22
  -> safe flat map first; bracket key remains one literal own key
  -> only a route advertised as recursive-v1 may invoke the route-aware parser
```

Flat query behavior above is compatibility baseline. Legacy nested bracket query is
không còn được delegate cho `qs`; route không có v1 metadata, thiếu marker hoặc có
marker/version không hỗ trợ phải reject. Sau safe-flat construction, route-aware v1
parser mới áp limits thấp hơn theo operation, validate path, build `Map` trie và
materialize null-prototype query. Later interceptor/pipe chỉ hợp lệ ở bước này vì
Gateway parser đã loại unsafe early construction. Không dùng typed top-level payload
trong r04 để tránh có hai GET wire formats; nếu bracket-path không đạt gate, dùng
`POST /search`, không fallback serializer khác.

Runtime manifest phải công bố explicit state; với dependency hiện tại, đề xuất:

```yaml
queryParserCapability:
  activeParser: express-extended/5.2.1
  recursiveGet: disabled
  reason: unsafe-preconstruction-ordering
```

Đây là proposed MVP manifest state cho dependency hiện tại, không phải capability đã
được source implement. Chỉ sau replacement + fixtures mới được chuyển thành:

```yaml
queryParserCapability:
  id: joktec-safe-flat
  version: 1
  firstSemanticConstructor: gateway
  recursiveGetSerializations: [joktec-bracket-path/v1]
  fingerprint: sha256:<parser-code-config-fixture-fingerprint>
```

Capability/fingerprint là input của contract fingerprint. Swagger producer chỉ được
emit recursive GET extension khi capability active; codegen chỉ generate khi snapshot
và runtime manifest khớp. Thiếu/mismatch capability đồng nghĩa không advertise/generate
recursive GET, kể cả endpoint legacy vẫn tồn tại; typed `POST /search` là fallback.

Extension v1 dưới đây là future-only contract, không được emit trong MVP hiện tại:

```yaml
x-joktec-query-serialization:
  version: 1
  media: query
  encoding: bracket-path
  versionMarkerName: joktecQueryVersion
  versionMarkerValue: "1"
  characterEncoding: utf-8
  percentEncoding: rfc3986-uppercase
  spaceEncoding: percent-20
  objectKeyOrder: utf16-lexicographic
  arrayIndices: zero-based-contiguous
  leafValueEncoding: json-scalar
  duplicatePaths: reject
  emptyContainers: reject-use-post-search
  prototypeMetaKeys: reject
  intermediateStructure: map-trie
  objectMaterialization: null-prototype
  maxEncodedBytes: 8192
  maxDecodedBytes: 16384
  maxPairs: 128
  maxDepth: 8
  maxPathSegmentBytes: 128
  maxTotalNodes: 512
  maxArrayIndex: 127
```

Canonicalization v1 bắt đầu bằng exact ASCII pair `joktecQueryVersion=1`; marker là
protocol control, không qua `leafValueEncoding`. Sau marker, traverse object keys theo
thứ tự UTF-16 lexicographic; array giữ thứ tự và thêm index liên tục; mỗi leaf tạo một
`path=value`; bracket, `$` và mọi byte ngoài RFC 3986 unreserved được percent-encode
bằng UTF-8 với hex viết hoa; space luôn `%20`, không dùng `+`. String giữ nguyên code
point (không Unicode-normalize). Mỗi leaf trước percent-encoding là JSON scalar do
`JSON.stringify` tạo: string giữ dấu quote, boolean là `true|false`, `null` là `null`,
finite number dùng lexical JSON (`-0` thành `0`); parser `JSON.parse` từng leaf nên
`"10"`, `10`, `"true"`, `true` không nhập nhằng. `undefined`, non-finite number,
sparse array, duplicate decoded path, empty container, object key chứa `[`/`]` hoặc
key khớp canonical array index (`0|[1-9][0-9]*`) bị reject; caller phải dùng
`POST /search` cho các case đó. Toàn bộ query string sau encoding không được vượt
`maxEncodedBytes`.

Các giá trị trên là hard ceiling của future v1 initial support; mọi limit là field bắt
buộc của extension và nằm trong wire fingerprint. Producer có thể chọn thấp hơn theo
operation, còn giá trị cao hơn bị parser/codegen reject; không được dùng default ẩn.
`maxDepth` đếm bracket segment sau root; `maxTotalNodes` đếm mọi unique path prefix;
`maxArrayIndex` áp dụng trước khi cấp phát array.
Sau safe-flat global parse, route-aware parser v1 phải xử lý theo ba phase, không được
vừa đọc path vừa mutate object đích:

1. **Bounded lexical validation:** require matching trusted internal parser metadata
   và marker; so encoded bytes/pairs với operation limits, tokenize literal bracket
   keys từ frozen flat records; reject grammar sai, decoded-byte/segment/depth/index
   vượt limit, duplicate path và leaf không phải JSON scalar hữu hạn. Percent decode
   và canonical-wire validation đã xảy ra đúng một lần ở Gateway parser; không decode
   lại. Chỉ flat tuple/primitive counter được tạo ở phase này.
2. **Path security validation:** kiểm tra root allowlist và mọi decoded path segment,
   ở mọi depth, trước khi tạo semantic object graph. Policy v1 là reject chính xác,
   case-sensitive ba key `__proto__`, `prototype`, `constructor`; không escape/rename.
   Đồng thời tính unique-prefix node count và reject khi vượt `maxTotalNodes`.
3. **Safe construction:** chỉ sau khi *toàn bộ* records pass limits/security mới dựng
   intermediate trie bằng `Map`, rồi materialize object node bằng
   `Object.create(null)` và array node chỉ từ zero-based contiguous indices. Traversal
   chỉ dùng own entries; assignment dùng explicit data property/
   `Object.defineProperty`, không dùng `in`, inherited lookup, `Object.assign`, object
   spread, setter invocation hay bất kỳ recursive/deep-merge utility nào. Collision
   object-vs-array hoặc leaf-vs-container bị reject.

Generated SDK encoder cũng reject reserved segments để feedback sớm, nhưng không phải
security boundary. Future producer **phải** cài safe-flat function ở GatewayFactory
và route-aware validation trước recursive query materialization, nên raw `curl`/HTTP
không thể bypass. Cài route parser trong interceptor/controller trong khi vẫn dùng
global `extended` là invalid. Typed JSON `POST /search` vẫn phải qua server query
schema/allowlist và không được deep-merge raw body; nếu dùng chung query materializer
thì áp dụng cùng reserved-key policy.

Fixture conformance bắt buộc lưu semantic input, canonical UTF-8 bytes, decoded tree
và expected invalid reason. Hai golden vectors tối thiểu:

```text
input = {"condition":{"$and":[{"status":{"$eq":"published"}},{"score":{"$gte":10}}]},"sort":{"createdAt":"desc"}}
bytes = joktecQueryVersion=1&condition%5B%24and%5D%5B0%5D%5Bstatus%5D%5B%24eq%5D=%22published%22&condition%5B%24and%5D%5B1%5D%5Bscore%5D%5B%24gte%5D=10&sort%5BcreatedAt%5D=%22desc%22

input = {"keyword":"điện thoại","select":["id","title"]}
bytes = joktecQueryVersion=1&keyword=%22%C4%91i%E1%BB%87n%20tho%E1%BA%A1i%22&select%5B0%5D=%22id%22&select%5B1%5D=%22title%22
```

Invalid vectors bắt buộc phải fail trước semantic object construction:

```text
bytes = joktecQueryVersion=1&condition%5B__proto__%5D%5Bpolluted%5D=%22yes%22
error = JQRY_RESERVED_PATH_SEGMENT(segment=__proto__,depth=1,objectGraphCreated=false)

bytes = joktecQueryVersion=1&condition%5Bfilters%5D%5Bconstructor%5D%5Bprototype%5D%5Bpolluted%5D=true
error = JQRY_RESERVED_PATH_SEGMENT(segment=constructor,depth=2,objectGraphCreated=false)

bytes = joktecQueryVersion=1&constructor%5Bprototype%5D%5Bpolluted%5D=true
error = JQRY_RESERVED_PATH_SEGMENT(segment=constructor,depth=0,objectGraphCreated=false)

bytes = joktecQueryVersion=1&condition%5Ba%5D%5Bb%5D%5Bc%5D%5Bd%5D%5Be%5D%5Bf%5D%5Bg%5D%5Bh%5D%5Bi%5D=true
error = JQRY_MAX_DEPTH(limit=8,objectGraphCreated=false)

bytes = joktecQueryVersion=1&select%5B128%5D=%22id%22
error = JQRY_MAX_ARRAY_INDEX(limit=127,objectGraphCreated=false)
```

Future safe-flat + route-aware parsers và TypeScript serializer phải chạy cùng vectors
byte-for-byte và round-trip. Producer integration/security suite phải gửi các vector
trên bằng raw HTTP và xác nhận Gateway parser là constructor đầu tiên, response
validation, `Object.prototype` không đổi, không có own property `polluted` trên
output/global object và không có partial nested graph. Trong MVP/current dependency,
recursive GET không được advertise/generate ở cả Level 1 và Level 2; resource dùng
typed `/search`. Sau này capability v1 hợp lệ vẫn là release gate, không phải warning.

### Pagination: fixed mode per operation

MVP chọn một mode cố định cho từng operation thay vì response union/discriminator:

| Operation mode | Request hợp lệ và default | Response duy nhất | Bị reject |
| --- | --- | --- | --- |
| `page` | `page?: integer >= 1`, `limit?: integer`; omitted `page` = `1`, omitted `limit` = `20` | `PagePaginationDto<T>` | `offset`, `cursor`, `cursorKey` |
| `offset` | `offset?: integer >= 0`, `limit?: integer`; omitted `offset` = `0`, omitted `limit` = `20` | `OffsetPaginationDto<T>` | `page`, `cursor`, `cursorKey` |
| `cursor` | `cursor?`, `cursorKey?`, `limit?: integer`; omitted cursor means first cursor page, omitted `limit` = `20` | `CursorPaginationDto<T>` | `page`, `offset` |

`props.paginate.mode` phải điều khiển đồng thời DTO request, runtime resolver/service và
Swagger response. Runtime phải trả validation error cho cross-mode parameter, không
âm thầm đổi response shape theo request. OAS phải ghi `default` chứ không chỉ `example`.
Current endpoint behavior là legacy mismatch; việc siết mode cần versioned endpoint
hoặc approved breaking release, không thay đổi âm thầm.

Response `oneOf`/discriminator bị loại cho MVP vì response hiện không có discriminator
ổn định và generator support không đồng đều. Tách thành `/search/page`,
`/search/offset`, `/search/cursor` là phương án tương thích dài hạn nếu consumer cần
nhiều mode trên một resource. Phase 0 phải chọn/migrate mỗi operation và pass black-box
matrix: omitted, valid page, valid offset, valid cursor-first-page/cursor-next-page và
mọi cross-mode combination; codegen bị chặn trước đó.

### Auth fidelity hai chiều

Security metadata chỉ mô tả contract; `ApiUseBearer()`/`useBearer: true` hiện không cài
guard. Fidelity gate phải tạo route manifest từ Nest runtime metadata và so operation
theo cả hai hướng:

- runtime có guard/policy nhưng OAS thiếu security requirement: fail;
- OAS tuyên bố bearer/API key/scope/role nhưng runtime không có enforcement tương ứng:
  fail;
- auth scheme khớp nhưng role/scope/policy khác: fail;
- route public chỉ hợp lệ khi runtime thực sự public, OAS có `security: []`, và
  operationId nằm trong allowlist versioned có `{ reason, owner }`; thiếu một vế: fail.

Role/scope không biểu diễn đủ bằng scheme phải dùng extension versioned
`x-joktec-authz` được validate, ví dụ `{ version: 1, roles: [...], scopes: [...] }`, và
runtime policy metadata phải bằng contract sau canonicalization. Allowlist public là
exception có chủ đích, không suy ra từ việc thiếu decorator.

`AssetController` hiện là negative fixture bắt buộc: `useBearer: true` trong khi
`guards` bị comment phải làm gate fail. Black-box suite cho mỗi policy class gồm:
unauthenticated → `401`; authenticated nhưng thiếu role/scope → `403`; đủ quyền →
success schema; public allowlisted → unauthenticated success. Generator không phát
hành operation khi auth fidelity chưa pass.

### Retry policy của runtime MVP

`@joktec/sdk` **không tự retry theo mặc định**. Opt-in retry policy phải bị ràng buộc:

- chỉ retry `GET`/`HEAD`/`OPTIONS`/`PUT`/`DELETE` khi operation metadata cho phép;
  `POST`/`PATCH` hoặc mutation khác chỉ khi server công bố idempotency-key support,
  caller cung cấp key và mọi lần thử tái dùng đúng key;
- mặc định opt-in tối đa 2 retry, exponential backoff có full jitter, per-attempt
  timeout, max delay và total deadline; các con số là config có upper bound;
- honor `Retry-After` hợp lệ nhưng vẫn cap bởi total deadline/max delay; response
  không hợp lệ dùng bounded backoff;
- `AbortSignal` hủy cả request đang chạy lẫn timer backoff và cấm lần thử tiếp theo;
- body phải replayable/buffered trong size limit; stream/file/one-shot body không tự
  retry;
- không retry auth/permission/validation 4xx. Network failure trước khi đọc response
  và status allowlist như `408`, `429`, `502`, `503`, `504` chỉ được retry sau khi qua
  idempotency guard; operation có thể thu hẹp thêm;
- idempotency key là opaque secret-adjacent metadata: không sinh ngầm cho mutation,
  không log, và server phải công bố deduplication semantics/window.

Opt-in operation metadata dùng extension đã validate, ví dụ
`x-joktec-retry: { version: 1, idempotency: method }` hoặc
`{ version: 1, idempotency: key, keyHeader: Idempotency-Key }`; runtime config chỉ có
thể thu hẹp attempts/status/deadline, không mở rộng operation từ `none` thành safe.

Quy tắc fail-closed duy nhất cho extension thiếu/malformed/unknown version:

1. Codegen validate base OAS operation khi **bỏ qua** `x-joktec-retry`. Nếu request,
   response, auth hoặc base idempotency-key header không đầy đủ thì reject operation
   bằng lỗi fidelity gốc.
2. Nếu base operation hoàn chỉnh nhưng retry extension không được hỗ trợ, vẫn generate
   endpoint với descriptor `retry: none`; phát diagnostic deterministic
   `JSDK-CG-W_RETRY_EXTENSION_UNSUPPORTED` gồm `operationId`, observed version và
   `fallback=no-retry`, sort theo operationId. Runtime không được cho config bật retry
   lại trên descriptor này.
3. Reject generation bằng `JSDK-CG-E_RETRY_WIRE_CONTRACT_INCOMPLETE` khi extension
   được hiểu và yêu cầu wire/idempotency semantics mà base OAS không tự mô tả, ví dụ
   `idempotency: key` nhưng `keyHeader` không tồn tại như request header parameter.
   Extension retry không bao giờ là nguồn duy nhất cho request/response semantics.

Do đó unknown extension không làm mất endpoint hợp lệ nhưng cũng không thể bật retry;
chỉ sự phụ thuộc wire bị thiếu mới chặn generation. Golden fixture bắt buộc:

```text
fixture = valid GET base operation + x-joktec-retry.version=99
result = operation generated; retry=none
diagnostic = JSDK-CG-W_RETRY_EXTENSION_UNSUPPORTED(version=99,fallback=no-retry)

fixture = POST + x-joktec-retry.version=1,idempotency=key,keyHeader=Idempotency-Key
         + no Idempotency-Key parameter in base OAS
result = generation rejected; JSDK-CG-E_RETRY_WIRE_CONTRACT_INCOMPLETE
```

Policy này bám nguyên tắc idempotent retry của RFC 9110 nhưng bảo thủ hơn cho browser
SDK; không còn nhánh “best effort” hoặc hai cách diễn giải cho unknown version.

### Level 2: repository-style HTTP façade có giới hạn

Level 2 là optional/gated, không phải baseline. API gợi ý:

```ts
const articles = createArticleRepository(client);
const page = await articles.list({
  select: ['id', 'title'],
  condition: { status: { $eq: 'published' } },
  limit: 20,
});
```

Đoạn trên chỉ là UX façade cho HTTP operations đã có; nó không import/khởi tạo
`MongoRepo`, `MysqlRepo`, Mongoose, TypeORM hoặc `IBaseRepository`.

Điều kiện để sinh Level 2:

- OpenAPI có operationId và schema cho list/detail/create/update/delete thực sự được
  server cho phép; thiếu operation nào thì façade không có method đó;
- query DTO mô tả field/operator, không dùng `additionalProperties: true` như quyền
  truy cập tùy ý;
- MVP recursive query chỉ dùng typed JSON `POST /search`; future GET chỉ được sinh khi
  Gateway safe-flat capability/fingerprint, explicit marker, extension v1 và
  integration/conformance fixtures đều pass;
- extension JokTec nếu dùng phải có schema/version, ví dụ resource id, operation
  mapping, allowed fields/operators, max query depth, max logical nodes, max populate
  depth, max `limit` và allowed relations;
- generated type chỉ phản ánh subset OpenAPI; không suy từ database schema/private
  fields và không mở rộng hơn contract;
- runtime client áp dụng guardrail sớm để UX tốt, nhưng server phải lặp lại toàn bộ
  validation/authorization/tenant/rate-limit checks;
- populate/deep relation bị allowlist và giới hạn depth/count; sort/select/cursorKey
  chỉ nhận field được công bố; regex/text operator nguy hiểm phải server opt-in;
- query complexity/cost budget và per-user/service rate limit nằm ở server.

`IBaseRequest<T>` hiện tại là bằng chứng về grammar hữu ích, không phải contract có
thể tái xuất nguyên trạng sang browser. Index signature và recursion cần được thu hẹp
trước khi Level 2 được chấp nhận. Generic `deepObject` không được xem là lối tắt qua
gate này.

## Contract fidelity và drift gates

### Producer fidelity gate bắt buộc

Gate thất bại nếu có bất kỳ điều nào sau:

- runtime success/error envelope khác response schema;
- thiếu hoặc trùng `operationId`;
- request/response dùng schema rỗng, unresolved `$ref` hoặc model không được phát hiện;
- runtime guard/policy và OpenAPI security/authz không khớp theo **bất kỳ hướng nào**,
  hoặc public exception không có allowlist `{ operationId, reason, owner }`;
- `servers` thiếu/sai context path hoặc không có policy override rõ;
- thiếu success/error status, content type hoặc body schema thực tế;
- undocumented primitive/raw/stream/file/multipart behavior;
- endpoint được sinh nhưng hidden/disabled/runtime route không khớp;
- recursive GET được advertise/generate khi `GatewayFactory` vẫn dùng `extended`,
  capability absent/mismatch, version marker thiếu, hoặc snapshot/runtime parser
  fingerprint không khớp;
- safe-flat custom function không phải semantic constructor đầu tiên, diễn giải
  bracket/delegate `qs`, không trả null-prototype flat shape, làm hỏng flat-query
  compatibility, hoặc route parser chạy trước/không dùng trusted parser metadata;
- future recursive parser tạo nested graph trước khi pass operation limits, dùng
  inherited property/deep merge, không reject prototype meta-key ở mọi depth, hoặc raw
  HTTP negative fixture làm thay đổi `Object.prototype`;
- pagination request mode/default/validation hoặc response shape trong Swagger khác
  runtime fixed-mode contract;
- operation opt-in retry mutation nhưng thiếu idempotency/replay contract;
- unsupported retry extension không hạ descriptor về `retry: none`, diagnostic không
  deterministic, hoặc extension yêu cầu wire semantics mà base OAS không mô tả;
- rich text/example/extension/identifier tạo output chưa qua sink-specific
  validation/escaping hoặc làm malicious fixture thay đổi code/DOM/path;
- OpenAPI version nằm ngoài support matrix của generator đã chọn.

Gate nên gồm **năm** lớp:

1. schema validation theo OAS version;
2. semantic lint rules của JokTec;
3. snapshot/deterministic generation diff;
4. black-box contract tests trên app test instance, validate status, headers,
   content type, envelope, pagination matrix và auth `401/403/success/public` của các
   representative/critical operations;
5. Nest/Express integration chứng minh legacy extended parser bị bypass, safe-flat
   parser là constructor đầu tiên, flat compatibility + operation limits; cộng
   cross-language query round-trip/raw-HTTP prototype vectors, retry fallback và
   malicious-spec fixtures cho every generator/rendering sink.

### Version và fingerprint

Ba version độc lập:

- `@joktec/sdk` SemVer: runtime transport/API;
- `@joktec/sdk-codegen` SemVer: thuật toán generation;
- `<service>-contract` SemVer: API contract của một backend service.

Hai fingerprint đề xuất:

```text
contractFingerprint = sha256(
  canonical bundled OpenAPI
  + canonical runtime capability manifest
)

artifactFingerprint = sha256(
  contractFingerprint
  + generator id/version
  + normalized generator config
  + JokTec envelope/query/resource/authz/retry extension versions
)
```

Các thành phần được serialize theo một encoding canonical có phân cách rõ. Không đưa
timestamp, absolute path hay secret vào canonical input. Generated package phải xuất
`contractVersion`, `contractFingerprint` và
`artifactFingerprint`. Backend manifest/response header công bố
`contractFingerprint` của wire contract; CI dùng `artifactFingerprint` để kiểm tra
tính tái lập của generated output/toolchain. MVP manifest phải ghi explicit
`recursiveGet: disabled`; không được coi capability vắng mặt là enabled.

Hành vi drift:

- CI/generation: mismatch expected fingerprint, non-deterministic diff hoặc stale
  generated output luôn fail;
- runtime `strict`: server công bố fingerprint khác thì ném `ContractDriftError`
  trước operation tiếp theo;
- runtime `warn`: ghi telemetry đã redaction và tiếp tục; dùng cho rollout canary;
- runtime `off`: chỉ dành cho rollback khẩn cấp có thời hạn và owner rõ;
- server không công bố fingerprint: không được giả là match; ghi trạng thái
  `unverified`, và CI contract gate vẫn là nguồn bảo đảm chính.

Breaking change của service contract phải tăng major. Additive operation/optional
field có thể là minor; metadata/docs-only là patch, nhưng semantic-diff tool cần xác
nhận thay vì chỉ dựa trên text diff.

## Threat Model

### Trust boundaries và tài sản

Ranh giới: remote spec/refs/rich text → parser, generator và documentation renderer;
raw URL query → Gateway global Express parser → route-aware normalization; generated
package → app build; app auth provider → transport; response server → runtime parser;
retry scheduler → mutation endpoint; Level 2 query → backend.
Tài sản cần bảo vệ: credential, source/build cache, internal network, tenant data,
authorization rules, package integrity và availability của build/runtime.

| Threat | Abuse case | Kiểm soát bắt buộc |
| --- | --- | --- |
| SSRF | `openapiUrl` hoặc `$ref` trỏ vào metadata service/localhost/private network | HTTPS mặc định; host/port allowlist; chặn userinfo; resolve mọi IP; chặn private/loopback/link-local trừ local-dev explicit; egress policy/IP pinning ở môi trường rủi ro cao |
| Redirect | URL hợp lệ redirect sang host nội bộ hoặc host không tin cậy | Redirect off mặc định; nếu bật, validate từng hop, giới hạn hop và cấm đổi scheme/host ngoài allowlist |
| External refs | Spec kéo file/URL ngoài kiểm soát hoặc reference graph quá lớn | Block mặc định; allowlist scheme/host/root dir; max ref count/depth/bytes; cấm `file:` thoát workspace |
| Malicious spec | YAML alias bomb, deep/cyclic schema, path traversal, identifier/code injection | Giới hạn tổng bytes, object depth, node count, string length và cycles; parser safe mode; sanitize identifier/output path; không eval/template execution; sandbox codegen |
| Rich-text/code sink injection | Description/example/extension chứa HTML, Markdown link, `*/`, template interpolation hoặc Unicode bidi/control để tạo XSS hay sửa generated code | Mọi field là untrusted; sanitize Markdown/HTML bằng allowlist; sinh literal qua AST/printer; escape comment terminator/control; validate identifier + collision/reserved word; không execute/fetch example; malicious fixtures cho từng sink |
| Secret leakage | Auth header bị ghi vào source/cache/log/bundle hoặc error report | Secret chỉ từ env/secret store; redaction; không serialize config auth; cache key không chứa secret; temp file permission hẹp; scan generated output |
| Auth storage | SDK tự lưu token dài hạn trong browser storage không an toàn | `AuthProvider` app-owned; SDK không có storage mặc định; hỗ trợ cookie credential/callback; không log token |
| Docs exposure | OpenAPI/raw docs công khai làm tăng reconnaissance hoặc lộ private schema | Tách UI và raw contract policy; build lấy từ restricted endpoint/artifact registry; chỉ xuất public operations; có thể tắt production raw docs |
| Contract tampering | Spec hoặc generated package bị thay giữa fetch/build/publish | TLS, expected fingerprint/signature, lockfile, provenance, immutable artifact, CI diff và publish gate |
| Over-query/DoS | Level 2 gửi condition/populate sâu, limit lớn hoặc operator tốn tài nguyên | Field/operator allowlist, max depth/nodes/populates/limit, timeout/cost budget, rate limit, server-side validation/index policy |
| Query confusion | Client/server serialize recursive `deepObject` khác nhau, duplicate path hoặc percent-decoding khác | MVP chỉ typed JSON `POST /search`; future GET cần marker + capability fingerprint + canonical fixtures; không advertise/generate khi capability thiếu |
| Early parser/prototype pollution | Current global `extended`/`qs` dựng normal-prototype nested object khi `req.query` được đọc, trước interceptor checks; raw path có `__proto__`/`constructor`/`prototype` | GatewayFactory phải thay parser trước mọi access; safe-flat null-prototype first constructor không diễn giải bracket; route parser chỉ chạy sau trusted metadata, reject reserved segments và operation limits. Không tuyên bố reproduction hiện tại đã chứng minh global pollution |
| Pagination confusion | Một URL chọn page/offset/cursor khác response schema đã generate | Fixed mode per operation; reject cross-mode parameters; defaults trong schema; black-box omitted/page/offset/cursor matrix |
| Privilege escalation | Client thấy schema rồi gọi field/operation không được phép | Chỉ generate public contract; server authorization/tenant checks trên mọi request; OpenAPI không phải permission grant |
| Auth metadata spoof/drift | Spec nói protected nhưng runtime không có guard, hoặc guard có thật nhưng spec nói public | So route manifest runtime với OAS hai chiều; explicit public allowlist; 401/403/success tests; asset controller negative fixture |
| Retry duplicate mutation | Connection/status ambiguity làm SDK gửi lại mutation đã được áp dụng | No-retry default; idempotency/replay gate; same idempotency key; bounded attempts/deadline; AbortSignal cancels backoff; no stream replay |
| Response spoof/drift | HTTP 200 nhưng body/envelope sai hoặc content type bất ngờ | Status/content-type check, envelope validation tùy chọn, typed error, fingerprint/drift policy, raw escape hatch không bỏ qua security checks |

OpenAPI phải được coi là untrusted input ngay cả khi đến từ backend nội bộ. Không có
control client-side nào thay thế authorization của server.

Descriptions, examples, vendor extensions, CommonMark/HTML, generated comments,
identifiers và string literals đều là untrusted. Renderer không được đưa raw HTML vào
DOM; generator không nối chuỗi spec trực tiếp vào comment/literal/import/output path.
Comment phải neutralize `*/`, newline/control/bidi; literal đi qua AST printer hoặc
serializer chuẩn; identifier phải normalize theo policy, tránh reserved word và phát
hiện collision. Examples chỉ là data, không được execute, import hay tự fetch URL.
Fixture tối thiểu gồm `<script>`, Markdown `javascript:` link, `*/`, backtick,
`${...}`, Unicode bidi/control, path traversal, oversized text và extension sai schema.

## Decision

Đề xuất **hybrid architecture**:

1. **Level 1 endpoint + model là MVP/public baseline.** OpenAPI là contract input;
   generic runtime `@joktec/sdk` tách khỏi generated contract theo service.
2. **Level 2 chỉ là optional gated repository-style HTTP façade.** Nó chỉ ánh xạ
   server-authorized endpoints/query grammar, không import database package và không
   vượt OpenAPI/server authorization.
3. **Generation chuẩn diễn ra ở build/CI.** Browser không tải spec để sinh/eval code.
4. **Explicit OpenAPI URL đứng đầu.** Discovery chỉ theo manifest/well-known/path cố
   định đã bật; không scan và fail closed khi mơ hồ/sai policy.
5. **Contract fidelity gate là điều kiện phát hành.** Trước MVP cần sửa hoặc mô tả
   chính xác mismatch envelope/Swagger hiện tại và ổn định operationId.
6. **Legacy Axios được duy trì để coexist/rollback.** Có thể áp dụng generated types
   trước, transport SDK sau, từng endpoint một.
7. **Runtime app-neutral và nhỏ.** Per-service generated contract có version/fingerprint
   riêng; không có Nest/Mongoose/TypeORM/generator dependency trong browser runtime.
8. **Recursive query MVP chỉ dùng JSON `/search`.** Current global `extended` parser
   làm recursive GET disabled và không được advertise/generate. Future GET cần
   Gateway safe-flat first constructor, marker/capability fingerprint, route-aware
   `Map`/null-prototype materialization và integration/security conformance.
9. **Pagination/auth phải có runtime-spec fidelity.** MVP cố định pagination mode theo
   operation; security metadata và runtime guard/policy khớp hai chiều, public route
   phải allowlist.
10. **Retry bảo thủ và spec untrusted.** No-retry default, mutation cần idempotency
    proof; unsupported retry extension giữ base endpoint ở no-retry với diagnostic,
    còn incomplete wire contract bị reject; mọi generated sink phải validate/escape.

Lựa chọn generator cụ thể chưa được quyết định trong research này. PoC cần đánh giá
ít nhất một stack nhẹ (`openapi-typescript` + `openapi-fetch`) và một stack plugin
generator (Orval/Kubb/Hey API), dùng cùng fixture JokTec để so fidelity, bundle,
extension cost và deterministic output.

## Consequences

### Lợi ích

- FE có autocomplete và compile-time types cho cả success/error, không chỉ DTO model.
- Drift được phát hiện ở backend/CI trước khi tới browser.
- Transport/auth/envelope/telemetry thống nhất nhưng contract từng service vẫn độc lập.
- Migration từng endpoint, không khóa app vào một data-fetching library.
- OpenAPI producer quality tăng; contract có fingerprint/provenance/version rõ.
- Security boundary vẫn ở server; Level 2 không làm lộ database abstraction.
- Query wire bytes, pagination shape và auth policy trở thành contract có thể kiểm
  chứng thay vì phụ thuộc serializer/decorator convention.
- No-retry default tránh duplicate mutation; opt-in vẫn hỗ trợ transient failure khi
  server có idempotency contract.
- Future Gateway parser sẽ bảo vệ cả raw HTTP caller thay vì chỉ generated SDK;
  current implementation chưa đạt điều này. Unknown retry policy không làm mất
  endpoint có base OAS hợp lệ.
- Recursive GET không xuất hiện trong MVP contract khi runtime chưa chứng minh parser
  capability; ordinary flat query vẫn có migration target rõ.

### Chi phí và rủi ro

- Backend phải đầu tư operationId, response/error schema, auth metadata và fidelity
  tests; Swagger “đủ để xem UI” không còn đủ.
- Thêm generator package, pinning, fixtures, CI diff và release coordination.
- Generated diff có thể lớn khi đổi generator; cần tách generator upgrade khỏi API
  change.
- Envelope validation/runtime schemas làm tăng bundle nếu bật đại trà; nên opt-in theo
  risk tier.
- Fingerprint strict có thể gây outage nếu rollout backend/contract sai thứ tự; cần
  canary/warn phase và rollback rõ.
- Level 2 có nguy cơ biến thành query language công khai khó thay đổi; chỉ mở sau khi
  policy và server enforcement hoàn chỉnh.
- Producer phải duy trì parser/serializer conformance fixtures nếu chọn recursive GET;
  JSON `/search` giảm coupling nhưng thay đổi cache/observability semantics so với GET.
- Fixed pagination mode có thể cần versioned endpoint vì runtime hiện cho request chọn
  mode; auth gate sẽ cố ý làm fail các route metadata-only như asset controller.
- Retry/idempotency support cần server deduplication storage/window; sanitizer và AST
  generation tăng test matrix cho codegen/docs tooling.
- `Map`/null-prototype materialization tăng parser complexity; downstream không được
  gọi trực tiếp `obj.hasOwnProperty` hoặc giả định object có prototype. Fallback
  no-retry cho unknown extension làm mất resilience feature có chủ đích và diagnostic
  phải đủ visible để producer nâng version support.
- Thay global query parser là framework-wide compatibility change: flat scalar/repeated
  keys phải giữ, còn legacy nested bracket behavior bị cố ý loại và phải migrate sang
  `POST /search`. Capability/fingerprint làm tăng bootstrap/contract-test governance;
  giữ current `extended` đồng nghĩa recursive GET tiếp tục unavailable cho SDK.

### Những giả định bị bác bỏ

- “TypeScript type là runtime validation” — sai; response/spec đều là untrusted data.
- “Biết schema đồng nghĩa có quyền query field đó” — sai; quyền do server quyết định.
- “Có baseUrl thì có thể tự dò Swagger” — sai; network scan không deterministic và
  tạo SSRF/ops risk.
- “Có thể tái xuất `IBaseRequest`/repository backend vào FE” — sai; shape quá rộng và
  kéo coupling/storage semantics qua ranh giới.
- “Swagger UI hiển thị đúng thì generated client đúng” — sai; envelope, error,
  content type, operationId và auth vẫn có thể mismatch.
- “Một version cho runtime và mọi service contract” — sai; release cadence khác nhau.
- “`deepObject` mô tả được query lồng nhau” — sai; nested array/object không được OAS
  định nghĩa nếu không có JokTec wire extension riêng.
- “`useBearer: true` bảo vệ runtime route” — sai; local decorator chỉ gắn Swagger
  metadata, guard phải được cài và được fidelity gate chứng minh.
- “Retry GET/mutation luôn vô hại” — sai; idempotency, replayability, deadline và
  AbortSignal đều phải được xét; mutation mặc định không retry.
- “Generated SDK reject key nguy hiểm là đủ” — sai; raw HTTP caller bypass client, nên
  server parser phải reject prototype meta-key trước construction.
- “Interceptor có thể sanitize sau `req.query`” — sai trong current stack; getter đã
  gọi global `extended` parser. Ownership phải ở GatewayFactory trước first access.

### Rollout đề xuất

#### Phase 0 — Producer readiness

- ổn định `operationIdFactory`/operationId;
- mô tả envelope thành công/lỗi đúng runtime, kể cả primitive/raw/stream;
- chốt fixed pagination mode cho từng operation; đồng bộ request/default/runtime/
  response schema và version route nếu cần;
- chọn typed JSON `POST /search` cho mọi recursive query MVP; đánh dấu current
  Gateway `extended` parser là `recursiveGet: disabled`, bỏ recursive GET extension
  khỏi snapshot/codegen;
- future-only gate: GatewayFactory thay `extended` bằng custom safe-flat function
  trước mọi middleware/access; manifest + fingerprint match; marker, route-aware
  `Map`/null-prototype parser và raw-HTTP fixtures pass;
- sinh route security manifest, sửa mọi mismatch guard ↔ OAS; tạo public allowlist có
  owner/reason và đưa asset controller vào negative fixture;
- xuất OpenAPI snapshot deterministic;
- thêm lint rules cho server/security/content types/schema/query/retry extensions và
  untrusted output sinks; diagnostic unsupported retry phải deterministic;
- thêm fingerprint/manifest contract.

MVP exit: fidelity gate pass trên example gateway và một app/service thật; black-box
omitted/page/offset/cursor, `401/403/success/public` và malicious-spec fixtures pass;
snapshot/generated output không có recursive GET, consumer dùng typed `POST /search`,
và negative capability fixture chứng minh current `extended` không đủ để enable GET.
Điều này **không** tuyên bố current global parser đã an toàn. Future GET exit riêng mới
yêu cầu safe-parser integration, raw reserved-key không tạo partial graph và global
prototype không đổi. Trước Phase 0 không publish Level 1 codegen và không sinh Level 2.

#### Phase 1 — Level 1 PoC

- chọn 5–10 operation đại diện: CRUD, custom endpoint, pagination, auth, validation
  error, upload/stream nếu có;
- benchmark hai generator stack;
- xây runtime transport/envelope/error/raw escape hatch tối thiểu;
- chứng minh no-retry default; opt-in retry pass bounded backoff, `Retry-After`, abort,
  replayability và idempotency-key tests;
- pass retry extension fixtures: unknown version → generated no-retry + stable warning;
  supported key semantics thiếu OAS header → reject;
- generated contract riêng cho một service, không publish rộng.

Exit: typecheck, contract tests, deterministic regeneration và security fixtures pass.

#### Phase 2 — Incremental FE migration

1. dùng generated DTO/types trong Axios code hiện tại;
2. chuyển một read-only endpoint sang SDK;
3. chuyển mutation có auth/error handling;
4. mở rộng theo module; giữ adapter/feature flag để quay lại Axios;
5. đo lỗi contract, bundle, latency, adoption và drift incidents.

Không xóa Axios service trước khi endpoint SDK tương ứng có production soak và rollback
đã thử.

#### Phase 3 — Level 2 gated pilot

- chỉ chọn resource CRUD chuẩn;
- backend công bố query policy machine-readable và enforce limits; recursive query
  dùng POST, trừ khi future Gateway capability gate đã pass độc lập;
- security/performance review riêng;
- không bật mặc định cho mọi service.

#### Phase 4 — General availability

- publish compatibility/support matrix;
- provenance/signing và release automation;
- deprecation policy cho operationId/model/query extension;
- runbook drift, rollback và security incident.

### Rollback/failure behavior

- Generation/fidelity fail: giữ package contract phiên bản cuối đã biết tốt; không
  publish output mới.
- Query extension unknown/conformance fail, pagination/auth mismatch hoặc malicious
  sink fixture fail: không generate operation liên quan; không fallback serializer,
  response union, public auth hay unsafe text output.
- Prototype-pollution/security fixture fail: tắt recursive GET và chỉ giữ typed
  `POST /search`; không dựa vào SDK-side key filter để tiếp tục expose GET.
- Capability absent/mismatch hoặc app quay lại `extended`: producer không emit
  recursive GET extension, generator từ chối operation, contract fingerprint đổi và
  consumer giữ typed `POST /search`.
- Backend rollout mismatch: dừng canary hoặc rollback backend; có thể chuyển
  `strict -> warn` tạm thời bằng config ngoài bundle, có owner/hết hạn.
- FE endpoint lỗi: feature flag quay lại Axios implementation dùng cùng auth provider;
  không đổi business behavior trong cùng migration PR.
- Generator regression: pin phiên bản cũ và regenerate từ snapshot/fingerprint cũ;
  không hand-edit generated files.
- Spec endpoint unavailable: build dùng immutable snapshot/artifact đã xác minh;
  không discovery sang host khác.
- Retry rollout gây duplicate/latency: tắt opt-in retry về default zero-attempt-retry;
  không thay idempotency key giữa attempts và không tiếp tục sau abort/deadline.
- Retry extension unsupported nhưng base operation hợp lệ: giữ endpoint no-retry và
  publish diagnostic; chỉ giữ package version cuối đã biết tốt nếu wire contract thiếu.

## Testing và evaluation criteria

QA cần sở hữu test files ở giai đoạn triển khai; research này chỉ nêu coverage cần có:

- **Generator golden tests**: OAS 3.x fixtures, nested schemas, unions, enums,
  multipart, empty bodies, multiple status/content types, refs/cycles, naming và
  supported/unknown JokTec extension versions; retry v99 phải sinh descriptor
  no-retry + diagnostic stable, retry key thiếu declared header phải fail.
- **Type tests**: path/query/body bắt buộc, success/error narrowing, raw response,
  invalid fields/operators và Level 2 depth không compile.
- **Query conformance tests**: producer parser và SDK serializer dùng cùng
  `x-joktec-query-serialization/v1` fixtures; exact canonical UTF-8 bytes, Unicode,
  array order, round-trip; reject duplicate path, sparse array, empty container,
  invalid percent encoding, non-finite scalar, oversize và unknown version; recursive
  `deepObject` không extension phải làm codegen fail. Producer raw-HTTP tests phải
  reject `__proto__`, `prototype`, `constructor` ở root/middle/deep positions, depth/
  pairs/nodes/index quá limit trước semantic construction; assert null-prototype
  output, own-property-only traversal, no partial graph và `Object.prototype` nguyên.
- **Nest/Express query-parser integration**: bootstrap app thật qua `GatewayFactory`;
  assert `query parser fn` là custom safe-flat function chứ không phải `extended`;
  parser invocation probe xác nhận legacy extended/`qs` path không được delegate;
  capture first parser output trước `ExpressInterceptor.backupQuery()` và xác nhận
  null-prototype/flat bracket key; `page=2&limit=20&select=id&select=title` giữ scalar
  + ordered repeated-key array; raw `constructor`/`prototype`/`__proto__` fail;
  operation-specific lower bytes/pairs/depth/nodes/index limits fail server-side.
  Khi custom capability tắt, OpenAPI snapshot không có recursive GET extension và
  codegen fixture phải fail closed sang typed `POST /search` only. Control fixture
  boot với current `extended` phải quan sát normal-prototype nested construction và
  capability gate fail, nhưng không được ghi nhận như proof global pollution.
- **Runtime unit tests**: URL serialization, AbortSignal/timeout, auth callback,
  envelope unwrap, primitive/raw, typed HTTP/network/drift errors, redaction;
  no-retry default; opt-in max attempts/backoff/jitter/`Retry-After`/deadline; abort
  trong request và backoff; non-replayable body; mutation thiếu/same idempotency key.
- **Backend contract tests**: OpenAPI snapshot so với Nest routes và black-box runtime
  response; fixed-mode pagination matrix gồm omitted/page/offset/cursor/cross-mode;
  guard/security/authz metadata hai chiều; unauthenticated `401`, insufficient
  role/scope `403`, authorized success và allowlisted public success. Asset controller
  metadata-only phải là negative fixture.
- **Security tests**: SSRF private/loopback/DNS rebinding model, redirect chain,
  external refs, YAML alias/depth/size bomb, path traversal, code/identifier injection,
  secret absence trong output/log/cache; HTML/Markdown XSS, comment `*/`, backtick/
  interpolation, Unicode bidi/control, malicious extension, identifier collision và
  oversized description/example; raw recursive query prototype-pollution vectors.
  Generated code phải parse/typecheck; rendered docs không có executable sink.
- **Determinism tests**: cùng snapshot + version/config cho byte-identical output;
  `generate && git diff --exit-code` trong CI.
- **Compatibility tests**: supported Node/browser/TS/module formats và transport adapter.
- **Migration/E2E**: Axios và SDK cho cùng endpoint trả semantic result tương đương;
  feature-flag rollback; telemetry không chứa credential/PII.
- **Performance budget**: runtime bundle, generated package size, generation time,
  request overhead và editor/typecheck latency trên contract lớn.

Tiêu chí chấp nhận PoC phải đo được, không chỉ dựa vào DX cảm tính: 100% selected
operations có typed success/error; zero undocumented envelope mismatch; deterministic
output; zero auth/pagination/query-serialization mismatch; no-retry default; unknown
retry fallback deterministic; MVP có zero advertised/generated recursive GET khi
capability disabled; malicious-spec fixtures bị chặn. Future GET chỉ đạt acceptance
khi prototype/integration fixtures pass; bundle/runtime overhead nằm trong budget.

## Open Questions

Các câu hỏi sau cố ý để mở và cần Product Owner/Engineer/Reviewer quyết định sau PoC:

1. Support target OpenAPI chính thức: 3.0/3.1 trước hay yêu cầu 3.2; NestJS version
   hiện tại thực tế xuất dialect nào?
2. Browser matrix, Node LTS, TypeScript tối thiểu, ESM-only hay ESM+CJS, React Native
   có nằm trong public support không?
3. Baseline transport chỉ Fetch hay publish Axios adapter chính thức?
4. Generator nào thắng PoC; có fork/custom plugin hay chỉ post-process chuẩn hóa?
5. Generated contract được commit trong app, publish package riêng, hay cả hai? Ai sở
   hữu version bump và release approval?
6. Runtime validation mặc định ở tier nào; dùng validator nào và bundle budget bao nhiêu?
7. Chính sách cho multipart, file download/upload, SSE, streaming, webhook/callback,
   cookie auth và OAuth2 flows?
8. Có công bố raw Swagger/OpenAPI ở production hay chỉ artifact registry/private
   endpoint? Auth/rotation/audit cho build fetch là gì?
9. Fingerprint truyền bằng well-known manifest, response header hay cả hai; rollout
   compatibility window dài bao lâu?
10. Level 2 **resource-policy** extension schema/version cụ thể, max
    field/operator/depth/populate/limit, query cost model và owner security review là
    gì? Query wire extension v1 không còn là câu hỏi mở.
11. Error code taxonomy JokTec có được chuẩn hóa trước MVP không, đặc biệt mismatch
    `code`/`errorCode` hiện tại?
12. Có hỗ trợ nhiều service/server trong một generated package hay bắt buộc một package
    cho mỗi service/version?
13. Upper bound retry attempts/delay/deadline và idempotency deduplication window theo
    từng service là bao nhiêu? No-retry default và mutation safeguards không còn mở.

## Sources

### Nguồn local

- `packages/common/core/src/infras/gateway/gateway.factory.ts` — Swagger setup và
  global `app.set('query parser', 'extended')`; ownership seam trước middleware.
- `packages/common/core/src/decorators/swagger/swagger.config.ts` — Swagger config,
  auth và security schemes.
- `packages/common/core/src/interceptors/express.interceptor.ts` — query normalization
  và success envelope; `backupQuery()` là first core `req.query` access.
- `node_modules/express/lib/request.js`, `node_modules/express/lib/utils.js` và
  `node_modules/qs/lib/parse.js` — installed Express 5 getter/global parser path,
  extended `qs.parse` với `allowPrototypes: true`, cùng qs defaults/source behavior.
- `packages/common/core/src/exceptions/filters/gateway-exception.filter.ts` — error
  envelope/status behavior.
- `packages/common/core/src/models/base.dto.ts` — `IResponseDto`.
- `packages/common/core/src/abstractions/base/base.controller.ts` — generated REST
  endpoints/DTO/Swagger responses.
- `packages/common/core/src/decorators/swagger/swagger.decorator.ts` — deepObject query
  parameters, pagination examples và metadata-only auth decorators.
- `packages/common/core/src/models/paginations/cursor-pagination.ts` — runtime cursor
  selection/default behavior.
- `packages/common/core/src/abstractions/sub/sub.controller.ts` — nested resource
  controller contract.
- `packages/common/core/src/models/base.request.ts` — query grammar.
- `packages/common/core/src/abstractions/base/base.service.ts` — pagination/service to
  repository boundary.
- `apps/example-gateway/src/modules/assets/asset.controller.ts` — `useBearer: true`
  với runtime guards bị comment, auth fidelity negative evidence.
- `apps/example-gateway/src/common/guards/auth.guard.ts`, `role.guard.ts` và
  `packages/common/core/src/infras/gateway/gateway.module.ts` — runtime 401/403
  enforcement và bằng chứng JWT module không tự cài global guard.
- `packages/databases/mongo/src/mongo.repo.ts` và
  `packages/databases/mongo/src/helpers/mongo.helper.ts` — Mongo query execution.
- `packages/databases/mysql/src/mysql.repo.ts` và
  `packages/databases/mysql/src/helpers/mysql.helper.ts` — TypeORM query execution và
  field validation.
- `packages/common/core/package.json`, `packages/common/core/src/index.ts`, root
  `package.json` — package/runtime/build/public exports.
- `packages/common/core/src/abstractions/__tests__`, `packages/databases/*/src/__tests__`,
  `test/consumer/` — test organization.

### Nguồn chính thức bên ngoài

- OpenAPI Initiative, [OpenAPI Specification 3.2.0](https://spec.openapis.org/oas/v3.2.0.html)
  — operation, server, response/content, security, refs và security considerations.
- OpenAPI Initiative, [OAS 3.0.4 Parameter Style Values](https://spec.openapis.org/oas/v3.0.4.html#style-values)
  — `deepObject` chỉ định scalar properties; nested array/object representation không
  được định nghĩa.
- OpenAPI Initiative, [OAS 3.2 Security Considerations](https://spec.openapis.org/oas/v3.2.0.html#security-considerations)
  và [Markdown/HTML Sanitization](https://spec.openapis.org/oas/v3.2.0.html#markdown-and-html-sanitization)
  — spec/tooling attack surface và yêu cầu sanitize rich text theo rendering context.
- MITRE, [CWE-1321 Prototype Pollution](https://cwe.mitre.org/data/definitions/1321.html)
  — `__proto__`/`constructor`/`prototype` abuse cases, denylist control và
  null-prototype object mitigation.
- Express, [Request `req.query`](https://expressjs.com/en/5x/api/request/#req.query)
  và [Application `query parser`](https://expressjs.com/en/5x/api/application/#query-parser)
  — query là untrusted output của parser configured toàn app; custom function nhận
  complete raw query string.
- Express, [Migrating to Express 5](https://expressjs.com/en/guide/migrating-5/#req.query)
  — `req.query` đổi thành getter và default parser đổi sang simple; JokTec hiện override
  default này thành extended.
- OpenAPI Initiative, [danh mục version/schema chính thức](https://spec.openapis.org/oas/)
  — các version và schema validation artifacts.
- NestJS, [OpenAPI introduction](https://docs.nestjs.com/openapi/introduction) —
  `createDocument`, raw JSON/YAML, `operationIdFactory` và UI/raw exposure options.
- NestJS, [Types and parameters](https://docs.nestjs.com/openapi/types-and-parameters)
  — giới hạn reflection, explicit DTO/schema metadata.
- NestJS, [Swagger CLI plugin](https://docs.nestjs.com/openapi/cli-plugin) — build-time
  metadata generation và yêu cầu giữ runtime validators.
- Directus, [Directus SDK](https://directus.io/docs/guides/connect/sdk) — composable
  client, REST/custom endpoint pattern, schema typing, auth/custom storage và cookie
  modes.
- OpenAPI TypeScript, [introduction](https://openapi-ts.dev/introduction) và
  [CLI](https://openapi-ts.dev/cli) — type generation, local/remote input, validation,
  check mode và multi-schema config.
- OpenAPI TypeScript, [openapi-fetch](https://openapi-ts.dev/openapi-fetch/) — typed
  request client dựa trên generated `paths`.
- OpenAPI TypeScript, [advanced guidance](https://openapi-ts.dev/advanced) — semantic
  lint rules cho unique operationId/parameters và schema quality.
- Orval, [overview](https://orval.dev/docs/) và
  [configuration basics](https://orval.dev/docs/guides/basics/) — generated models,
  HTTP clients, mocks và file/URL input.
- Kubb, [introduction](https://kubb.dev/docs/5.x/getting-started/introduction) — plugin
  pipeline, deterministic output, typed clients/validators/mocks.
- Hey API, [OpenAPI TypeScript platform](https://heyapi.dev/) — composable codegen
  plugins, local/remote input và deterministic output.
- OpenAPI Generator, [TypeScript Fetch generator](https://openapi-generator.tech/docs/generators/typescript-fetch/)
  — generator options và feature support matrix cần được kiểm tra theo target.
- IETF, [RFC 9110 §9.2.2 Idempotent Methods](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2)
  và [§10.2.3 Retry-After](https://www.rfc-editor.org/rfc/rfc9110.html#section-10.2.3)
  — giới hạn retry method non-idempotent và semantics thời gian chờ.

## Revision History

| Revision | Updated | Author | Thay đổi |
| --- | --- | --- | --- |
| `r05` | `2026-07-17 12:32:11 +07:00` | `engineer` | Metadata-only; independent reviewer approved r04; `SDK-RVW-001..009` closed; `AC-SDK-001..016` 16/16 PASS; artifact remains `proposed`. |
| `r04` | `2026-07-17 12:25:41 +07:00` | `engineer` | Đóng `SDK-RVW-009`: GatewayFactory query-parser ownership, recursive GET disabled trong MVP, safe-flat coexistence/capability gate và Nest/Express integration fixtures; reviewer pending. |
| `r03` | `2026-07-17 12:09:47 +07:00` | `engineer` | Đóng `SDK-RVW-006..008`: prototype-safe recursive GET parser/server fixtures, retry unknown-version no-retry diagnostic rule và fidelity gate đúng năm lớp; reviewer pending. |
| `r02` | `2026-07-17 11:57:30 +07:00` | `engineer` | Đóng `SDK-RVW-001..005`: query wire v1/typed search, fixed pagination, auth fidelity hai chiều, no-retry default/idempotency guard và untrusted-spec sink controls; reviewer pending. |
| `r01` | `2026-07-17 11:39:32 +07:00` | `engineer` | Nghiên cứu ban đầu; đề xuất Level 1 baseline, Level 2 gated và hybrid runtime/generated-contract architecture. |
