import { Client, IBaseRepository, ICondition } from '@joktec/core';
import { ReturnModelType } from '@typegoose/typegoose';
import { ClientSession, ClientSessionOptions, Connection, mongo, RefType } from 'mongoose';
import { QueryHelper } from './helpers';
import { IMongoAggregateOptions, IMongoOptions, IMongoPipeline, IMongoUpdate, MongoSchema } from './models';
import { MongoConfig } from './mongo.config';

export interface MongoModuleOptions {
  models?: (typeof MongoSchema)[];
  conId?: string;
}

export interface MongoModelRegistry {
  [conId: string]: (typeof MongoSchema)[];
}

export type MongoType<T extends MongoSchema = MongoSchema> = ReturnModelType<typeof MongoSchema, QueryHelper<T>>;

export interface MongoSessionOptions extends ClientSessionOptions {
  autoStart?: boolean;
}

export type MongoClientSession = ClientSession;

export type MongoClusterTopology = 'standalone' | 'replica-set' | 'sharded' | 'unknown';

export interface MongoCoverage {
  conId: string;
  mongoVersion: string;
  mongooseVersion: string;
  typegooseVersion: string;
  topology: MongoClusterTopology;
  setName?: string;
  hosts?: string[];
  isStandalone: boolean;
  isReplicaSet: boolean;
  isSharded: boolean;
  canUseSession: boolean;
  canUseTransaction: boolean;
  canUseStream: boolean;
  reasons: string[];
}

export interface MongoCoverageOptions {
  refresh?: boolean;
}

export type MongoCoverageFeature = 'transaction' | 'stream';
export type MongoStreamPipeline = Record<string, unknown>[];
export type MongoStreamOptions = mongo.ChangeStreamOptions & { hydrate?: boolean };
export type MongoChangeStream<
  TResult extends mongo.Document = mongo.Document,
  TChange extends mongo.ChangeStreamDocument<TResult> = mongo.ChangeStreamDocument<TResult>,
> = mongo.ChangeStream<TResult, TChange>;

export interface MongoClient extends Client<MongoConfig, Connection> {
  isConnected(conId?: string): boolean;

  getCoverage(conId?: string, options?: MongoCoverageOptions): Promise<MongoCoverage>;

  assertCoverage(feature: MongoCoverageFeature, conId?: string): Promise<MongoCoverage>;

  getModel<T extends MongoSchema>(schemaClass: typeof MongoSchema, conId?: string): MongoType<T>;

  getModelByName<T extends MongoSchema>(modelName: string, conId?: string): MongoType<T>;

  startTransaction(options?: MongoSessionOptions, conId?: string): Promise<MongoClientSession>;

  watch<TResult extends mongo.Document = mongo.Document>(
    pipeline?: MongoStreamPipeline,
    options?: MongoStreamOptions,
    conId?: string,
  ): Promise<MongoChangeStream<TResult>>;
}

export interface IMongoRepository<T extends MongoSchema, ID extends RefType = string> extends IBaseRepository<T, ID> {
  updateMany(condition: ICondition<T>, body: IMongoUpdate<T>, options?: IMongoOptions<T>): Promise<T[]>;

  deleteMany(cond: ICondition<T>, options?: IMongoOptions<T>): Promise<T[]>;

  aggregate<U = T>(pipeline: IMongoPipeline[], opts?: IMongoAggregateOptions<U>): Promise<U[]>;

  watch<TResult extends mongo.Document = mongo.Document>(
    pipeline?: MongoStreamPipeline,
    options?: MongoStreamOptions,
  ): Promise<MongoChangeStream<TResult>>;
}
