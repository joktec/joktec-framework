import { EventEmitter } from 'events';
import { describe, expect, it, jest } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoConfig } from '../mongo.config';
import { MongoService } from '../mongo.service';

class TestMongoService extends MongoService {
  connect(config: MongoConfig) {
    return this.init(config);
  }
}

describe('MongoService lifecycle', () => {
  it('should await connection readiness and not recursively reconnect from connection events', async () => {
    const connection = new EventEmitter() as any;
    connection.asPromise = (jest.fn() as any).mockResolvedValue(connection);

    const createConnectionSpy = jest.spyOn(mongoose, 'createConnection').mockReturnValue(connection);
    const setSpy = jest.spyOn(mongoose, 'set').mockImplementation(() => mongoose);
    const service = new TestMongoService({});
    const clientInitSpy = jest.spyOn(service as any, 'clientInit');
    Object.assign(service as any, {
      logService: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
      PinoLogger: { setContext: jest.fn() },
      LogService: { error: jest.fn() },
      ConfigService: { get: jest.fn().mockReturnValue({}) },
    });

    const client = await service.connect({
      conId: 'analytics',
      host: 'localhost',
      port: 27017,
      database: 'analytics',
      strictQuery: true,
      options: {},
    } as MongoConfig);

    expect(client).toBe(connection);
    expect(connection.asPromise).toHaveBeenCalledTimes(1);
    expect(createConnectionSpy as any).toHaveBeenCalledWith('mongodb://localhost:27017/analytics', {
      user: undefined,
      pass: undefined,
      dbName: 'analytics',
      autoIndex: false,
    });

    connection.emit('disconnected');
    connection.emit('error', new Error('connection lost'));
    expect(clientInitSpy).not.toHaveBeenCalled();

    createConnectionSpy.mockRestore();
    setSpy.mockRestore();
  });

  it('should let params override duplicate connection options', async () => {
    const connection = new EventEmitter() as any;
    connection.asPromise = (jest.fn() as any).mockResolvedValue(connection);

    const createConnectionSpy = jest.spyOn(mongoose, 'createConnection').mockReturnValue(connection);
    const setSpy = jest.spyOn(mongoose, 'set').mockImplementation(() => mongoose);
    const service = new TestMongoService({});
    Object.assign(service as any, {
      logService: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
      PinoLogger: { setContext: jest.fn() },
      LogService: { error: jest.fn() },
      ConfigService: { get: jest.fn().mockReturnValue({}) },
    });

    await service.connect({
      conId: 'analytics',
      host: 'localhost',
      port: 27017,
      database: 'analytics',
      strictQuery: true,
      params: 'authSource=martech_db&replicaSet=rs0&directConnection=true&connectTimeoutMS=20000',
      options: {
        authSource: 'admin',
        replicaSet: 'rs1',
        directConnection: false,
        connectTimeoutMS: 30000,
        serverSelectionTimeoutMS: 5000,
      },
    } as unknown as MongoConfig);

    expect(createConnectionSpy as any).toHaveBeenCalledWith('mongodb://localhost:27017/analytics', {
      user: undefined,
      pass: undefined,
      dbName: 'analytics',
      autoIndex: false,
      authSource: 'martech_db',
      replicaSet: 'rs0',
      directConnection: 'true',
      connectTimeoutMS: '20000',
      serverSelectionTimeoutMS: 5000,
    });

    createConnectionSpy.mockRestore();
    setSpy.mockRestore();
  });
});
