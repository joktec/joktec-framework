import { EntityManager, FindManyOptions, FindOneOptions, QueryRunner, RemoveOptions, SaveOptions } from 'typeorm';

export interface IMysqlTransactionOption {
  manager?: EntityManager;
  queryRunner?: QueryRunner;
}

export interface IMysqlReadOption<T = any> extends FindManyOptions<T>, FindOneOptions<T>, IMysqlTransactionOption {}

export interface IMysqlWriteOption extends SaveOptions, RemoveOptions, IMysqlTransactionOption {
  force?: boolean;
  chunkSize?: number;
}

export type IMysqlOption<T = any> = IMysqlReadOption<T> & IMysqlWriteOption;
