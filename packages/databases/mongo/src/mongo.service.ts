import { createRequire } from 'module';
import { AbstractClientService, Clazz, DEFAULT_CON_ID, Inject, Injectable, Retry } from '@joktec/core';
import { getModelForClass } from '@typegoose/typegoose';
import mongoose, { Connection as Mongoose } from 'mongoose';
import { mongoDebug, QueryHelper } from './helpers';
import { MongoSchema } from './models';
import {
  MongoChangeStream,
  MongoClient,
  MongoClientSession,
  MongoCoverage,
  MongoCoverageFeature,
  MongoCoverageOptions,
  MongoModelRegistry,
  MongoSessionOptions,
  MongoStreamOptions,
  MongoStreamPipeline,
  MongoType,
} from './mongo.client';
import { MongoConfig } from './mongo.config';
import { MODEL_REGISTRY_KEY } from './mongo.constant';
import { MongoException } from './mongo.exception';

const RETRY_OPTS = 'mongo.retry';
const requireFromMongo = createRequire(__filename);

/**
 * Owns MongoDB connection lifecycle and connection-scoped Typegoose model registration.
 */
@Injectable()
export class MongoService extends AbstractClientService<MongoConfig, Mongoose> implements MongoClient {
  private readonly coverageCache = new Map<string, MongoCoverage>();

  constructor(@Inject(MODEL_REGISTRY_KEY) private modelRegistry: MongoModelRegistry) {
    super('mongo', MongoConfig);
  }

  @Retry(RETRY_OPTS)
  protected async init(config: MongoConfig): Promise<Mongoose> {
    const uri = this.buildUri(config);
    const paramsOptions = this.parseParams(config.params);

    const connectOptions: mongoose.ConnectOptions = {
      user: config.username,
      pass: config.password,
      dbName: config.database,
      autoIndex: false,
      ...config.options,
      ...paramsOptions,
    };

    mongoose.set('strictQuery', config.strictQuery);

    if (config.debug) {
      mongoose.set('debug', (collectionName: string, methodName: string, ...methodArgs: any[]) => {
        const mongoShell = mongoDebug(collectionName, methodName, ...methodArgs);
        this.logService.info(`MongoDB Shell: %s`, mongoShell);
      });
    }

    const maskedUri = uri.replace(/:([^:@]+)@/, ':****@');
    const client = mongoose.createConnection(uri, connectOptions);

    client.on('error', err => {
      this.logService.error(err, '`%s` MongoDB connection error', config.conId);
    });
    client.on('disconnected', () => {
      this.logService.error('`%s` MongoDB connection disconnected', config.conId);
    });

    const connectedClient = await client.asPromise();
    this.logService.info('`%s` Connection to MongoDB established %s', config.conId, maskedUri);
    return connectedClient;
  }

  /**
   * Builds the final MongoDB URI from either a raw URI or host/port/srv config.
   */
  private buildUri(config: MongoConfig): string {
    if (config.uri) return config.uri;
    if (config.srvMode) return `mongodb+srv://${config.host}/${config.database}`;
    return `mongodb://${config.host}:${config.port}/${config.database}`;
  }

  private parseParams(params?: string): mongoose.ConnectOptions {
    if (!params) return {};
    return Array.from(new URLSearchParams(params).entries()).reduce<Record<string, string>>((opts, [key, value]) => {
      opts[key] = value;
      return opts;
    }, {}) as mongoose.ConnectOptions;
  }

  /**
   * Runs post-connect checks and registers every schema configured for the connection id.
   */
  async start(client: Mongoose, conId: string = DEFAULT_CON_ID): Promise<void> {
    if (client.readyState !== 1) return;

    const version = await this.getVersion(conId);
    this.logService.info('`%s` Connected to MongoDB (%s) successfully', conId, version);
    const numericVersion = version.split('.').map((v: string) => parseInt(v));
    if (numericVersion[0] < 5) {
      this.logService.warn(
        `Warning: MongoDB version %s is less than 5.0. Some features may not work correctly. Please consider upgrading MongoDB to version 5.0 or higher`,
        version,
      );
    }

    if (this.modelRegistry[conId]) {
      for (const schemaClass of Object.values(this.modelRegistry[conId])) {
        await this.registerModel(schemaClass, conId);
      }
      this.logService.info('`%s` Register models for Mongoose successfully', conId);
    }
  }

  public async getVersion(conId: string = DEFAULT_CON_ID): Promise<string> {
    const serverInfo = await this.getClient(conId).db.admin().serverInfo();
    return serverInfo.version;
  }

  public async getCoverage(conId: string = DEFAULT_CON_ID, options: MongoCoverageOptions = {}): Promise<MongoCoverage> {
    if (!options.refresh && this.coverageCache.has(conId)) {
      return this.coverageCache.get(conId);
    }

    const client = this.getClient(conId);
    const [serverInfo, hello] = await Promise.all([client.db.admin().serverInfo(), this.getServerHello(client)]);
    const mongoVersion = String(serverInfo.version || 'unknown');
    const versionParts = this.parseVersion(mongoVersion);
    const topology = this.resolveTopology(hello);
    const isReplicaSet = topology === 'replica-set';
    const isSharded = topology === 'sharded';
    const isStandalone = topology === 'standalone';
    const clusterCapable = isReplicaSet || isSharded;
    const canUseSession = clusterCapable;
    const canUseTransaction = clusterCapable && versionParts.major >= 4;
    const canUseStream =
      clusterCapable && (versionParts.major > 3 || (versionParts.major === 3 && versionParts.minor >= 6));
    const reasons: string[] = [];

    if (!clusterCapable) reasons.push('MongoDB connection is not running as a replica set or sharded cluster');
    if (!canUseTransaction)
      reasons.push('MongoDB transactions require a replica set or sharded cluster on MongoDB 4.0+');
    if (!canUseStream) reasons.push('MongoDB change streams require a replica set or sharded cluster on MongoDB 3.6+');

    const coverage: MongoCoverage = {
      conId,
      mongoVersion,
      mongooseVersion: mongoose.version,
      typegooseVersion: this.readPackageVersion('@typegoose/typegoose'),
      topology,
      setName: hello.setName,
      hosts: hello.hosts,
      isStandalone,
      isReplicaSet,
      isSharded,
      canUseSession,
      canUseTransaction,
      canUseStream,
      reasons,
    };

    this.coverageCache.set(conId, coverage);
    return coverage;
  }

  private async getServerHello(client: Mongoose): Promise<Record<string, any>> {
    try {
      return await client.db.admin().command({ hello: 1 });
    } catch {
      return await client.db.admin().command({ isMaster: 1 });
    }
  }

  private resolveTopology(hello: Record<string, any>): MongoCoverage['topology'] {
    if (hello.msg === 'isdbgrid') return 'sharded';
    if (hello.setName || hello.isreplicaset || hello.hosts?.length) return 'replica-set';
    if (hello.isWritablePrimary || hello.ismaster || hello.secondary === false) return 'standalone';
    return 'unknown';
  }

  private parseVersion(version: string): { major: number; minor: number } {
    const [major = 0, minor = 0] = version.split('.').map(part => parseInt(part, 10) || 0);
    return { major, minor };
  }

  private readPackageVersion(pkgName: string): string {
    try {
      return requireFromMongo(`${pkgName}/package.json`).version || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  public async assertCoverage(feature: MongoCoverageFeature, conId: string = DEFAULT_CON_ID): Promise<MongoCoverage> {
    const coverage = await this.getCoverage(conId);
    const supported = feature === 'transaction' ? coverage.canUseTransaction : coverage.canUseStream;

    if (!supported) {
      throw new MongoException(`MONGO_${feature.toUpperCase()}_NOT_SUPPORTED`, coverage);
    }

    return coverage;
  }

  /**
   * Registers a Typegoose class against the current Mongoose connection.
   */
  public async registerModel(schemaClass: typeof MongoSchema, conId: string = DEFAULT_CON_ID) {
    const config = this.getConfig(conId);
    const opts = { existingConnection: this.getClient(conId) };

    const model = getModelForClass<typeof MongoSchema, QueryHelper<any>>(schemaClass, opts);
    if (config.debug) this.logService.info('`%s` Schema `%s` registered', conId, schemaClass.name);

    if (config.autoIndex) {
      try {
        const diffIndexes = await model.diffIndexes();
        if (diffIndexes.toCreate.length || diffIndexes.toDrop.length) {
          await model.syncIndexes({ continueOnError: true });
          if (config.debug) this.logService.info('`%s` Schema `%s` sync indexes', conId, model.modelName);
        }
      } catch (indexError) {
        this.logService.error(indexError, '`%s` Schema `%s` sync failed', conId, schemaClass.name);
      }
    }
  }

  async stop(client: Mongoose, conId: string = DEFAULT_CON_ID): Promise<void> {
    await client.close(true);
    this.logService.error('`%s` MongoDB connection has been terminated', conId);
  }

  public isConnected(conId: string = DEFAULT_CON_ID): boolean {
    if (!this.getClient(conId)) return false;
    return this.getClient(conId).readyState === 1;
  }

  /**
   * Starts an optional transaction session on the requested Mongo connection.
   */
  public async startTransaction(
    options: MongoSessionOptions = {},
    conId: string = DEFAULT_CON_ID,
  ): Promise<MongoClientSession> {
    await this.assertCoverage('transaction', conId);
    const session = await this.getClient(conId).startSession(options);
    if (options.autoStart) session.startTransaction();
    return session;
  }

  public async watch<TResult extends Record<string, any> = Record<string, any>>(
    pipeline: MongoStreamPipeline = [],
    options: MongoStreamOptions = {},
    conId: string = DEFAULT_CON_ID,
  ): Promise<MongoChangeStream<TResult>> {
    await this.assertCoverage('stream', conId);
    return this.getClient(conId).watch<TResult>(pipeline, options);
  }

  /**
   * Resolves a registered model from the same connection id used by the repository.
   */
  public getModel<T extends MongoSchema>(schemaClass: Clazz, conId: string = DEFAULT_CON_ID): MongoType<T> {
    return this.getModelByName<T>(schemaClass.name, conId);
  }

  public getModelByName<T extends MongoSchema>(modelName: string, conId: string = DEFAULT_CON_ID): MongoType<T> {
    return this.getClient(conId).model(modelName) as MongoType<T>;
  }
}
