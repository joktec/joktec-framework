# Glossary

Baseline: current stable implementation.

- Adapter: Package wrapping an external capability such as cache, mail, notifier, or storage.
- Broker: Package wrapping a messaging system such as Kafka, RabbitMQ, Redcast, or SQS.
- Client: External-system connection managed by a service implementing `Client<Config, NativeClient>`.
- `conId`: Connection identifier used to manage multiple configured clients of the same service type.
- Core: `@joktec/core`, the shared framework package.
- Gateway: HTTP-facing Nest application mode.
- Micro: Nest microservice mode with configurable transports.
- Transporter: Config object that maps config data to Nest microservice transport options.
- Repository: Persistence abstraction implementing common CRUD/query methods.
- Schema: Mongo/Typegoose model class used by Mongo repositories.
- Entity: TypeORM model class used by MySQL repositories.
- Crontab: Decorated scheduled method persisted and controlled by the cron scheduler.
- JobWorker: Repository-backed batch worker abstraction.
- Bull Board: Queue dashboard mounted by `GatewayFactory` when `bull.board.enable` is configured.
- BaseController: Factory that creates standard REST CRUD endpoints.
- ClientController: Factory that creates standard microservice CRUD message handlers.
- BaseService: Generic service implementing CRUD methods over a repository.
- AbstractClientService: Lifecycle base for external clients.
- Technical Debt: Known incomplete, experimental, or future-review work not implemented in the stable code.
