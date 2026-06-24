import { AbstractClientService, Clazz, DEFAULT_CON_ID, Inject, Injectable, Retry } from '@joktec/core';
import { getModelForClass } from '@typegoose/typegoose';
import mongoose, { Connection as Mongoose } from 'mongoose';
import { mongoDebug, QueryHelper } from './helpers';
import { MongoSchema } from './models';
import { MongoClient, MongoClientSession, MongoModelRegistry, MongoSessionOptions, MongoType } from './mongo.client';
import { MongoConfig } from './mongo.config';
import { MODEL_REGISTRY_KEY } from './mongo.constant';

const RETRY_OPTS = 'mongo.retry';

/**
 * Owns MongoDB connection lifecycle and connection-scoped Typegoose model registration.
 */
@Injectable()
export class MongoService extends AbstractClientService<MongoConfig, Mongoose> implements MongoClient {
  constructor(@Inject(MODEL_REGISTRY_KEY) private modelRegistry: MongoModelRegistry) {
    super('mongo', MongoConfig);
  }

  @Retry(RETRY_OPTS)
  protected async init(config: MongoConfig): Promise<Mongoose> {
    let uri = this.buildUri(config);

    if (config.params) {
      const separator = uri.includes('?') ? '&' : '?';
      uri += `${separator}${config.params}`;
    }

    const connectOptions: mongoose.ConnectOptions = {
      user: config.username,
      pass: config.password,
      dbName: config.database,
      autoIndex: false,
      ...config.options,
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

  /**
   * Registers a Typegoose class against the current Mongoose connection.
   */
  public async registerModel(schemaClass: typeof MongoSchema, conId: string = DEFAULT_CON_ID) {
    const config = this.getConfig(conId);
    const opts = { existingConnection: this.getClient(conId) };

    const model = getModelForClass<typeof MongoSchema, QueryHelper<any>>(schemaClass, opts);
    if (config.debug) this.logService.info('`%s` Schema `%s` registered', conId, schemaClass.name);

    if (config.autoIndex) {
      const diffIndexes = await model.diffIndexes();
      if (diffIndexes.toCreate.length || diffIndexes.toDrop.length) {
        await model.syncIndexes({ continueOnError: true });
        if (config.debug) this.logService.info('`%s` Schema `%s` sync indexes', conId, model.modelName);
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
    const session = await this.getClient(conId).startSession(options);
    if (options.autoStart) session.startTransaction();
    return session;
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
