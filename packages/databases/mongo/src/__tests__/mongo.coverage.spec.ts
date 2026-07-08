import { describe, expect, it, jest } from '@jest/globals';
import { DEFAULT_CON_ID } from '@joktec/core';
import { MongoService } from '../mongo.service';

class CoverageMongoService extends MongoService {
  constructor() {
    super({});
  }

  setClient(client: any, conId: string = DEFAULT_CON_ID) {
    (this as any).clients = { ...(this as any).clients, [conId]: client };
  }
}

const createClient = (hello: Record<string, any>, version = '7.0.2') => {
  const admin = {
    serverInfo: jest.fn<any>().mockResolvedValue({ version }),
    command: jest.fn<any>().mockResolvedValue(hello),
  };

  return {
    admin,
    client: {
      db: { admin: () => admin },
      startSession: jest.fn<any>().mockResolvedValue({ startTransaction: jest.fn() }),
      watch: jest.fn<any>().mockReturnValue({ close: jest.fn() }),
    },
  };
};

describe('MongoService coverage', () => {
  it('should expose cluster feature coverage and cache it per connection', async () => {
    const { admin, client } = createClient({ setName: 'rs0', hosts: ['localhost:27017'] });
    const service = new CoverageMongoService();
    service.setClient(client);

    const coverage = await service.getCoverage();
    const cachedCoverage = await service.getCoverage();

    expect(coverage).toMatchObject({
      conId: DEFAULT_CON_ID,
      mongoVersion: '7.0.2',
      mongooseVersion: expect.any(String),
      typegooseVersion: expect.any(String),
      topology: 'replica-set',
      setName: 'rs0',
      hosts: ['localhost:27017'],
      isReplicaSet: true,
      isSharded: false,
      isStandalone: false,
      canUseSession: true,
      canUseTransaction: true,
      canUseStream: true,
    });
    expect(cachedCoverage).toBe(coverage);
    expect(admin.serverInfo).toHaveBeenCalledTimes(1);
    expect(admin.command).toHaveBeenCalledTimes(1);
  });

  it('should reject transactions before opening a session when topology cannot support them', async () => {
    const { client } = createClient({ isWritablePrimary: true });
    const service = new CoverageMongoService();
    service.setClient(client);

    await expect(service.startTransaction()).rejects.toMatchObject({
      message: 'MONGO_TRANSACTION_NOT_SUPPORTED',
    });
    expect(client.startSession).not.toHaveBeenCalled();
  });

  it('should open database change streams only when coverage supports streams', async () => {
    const { client } = createClient({ setName: 'rs0', hosts: ['localhost:27017'] });
    const service = new CoverageMongoService();
    service.setClient(client);

    const stream = await service.watch([{ $match: { operationType: 'insert' } }]);

    expect(stream).toEqual({ close: expect.any(Function) });
    expect(client.watch).toHaveBeenCalledWith([{ $match: { operationType: 'insert' } }], {});
  });
});
