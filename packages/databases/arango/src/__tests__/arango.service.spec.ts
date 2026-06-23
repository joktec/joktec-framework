import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createMock } from '@golevelup/ts-jest';
import { ConfigService, LogService } from '@joktec/core';
import { mockCollections, mockDatabaseInstances } from '../__mocks__/arangojs';
import { ArangoConfig } from '../arango.config';
import { ArangoService } from '../arango.service';

class TestArangoService extends ArangoService {
  boot(config: ArangoConfig) {
    return this.clientInit(config);
  }

  exposeStop(client: any, conId?: string) {
    return this.stop(client, conId);
  }
}

const attachServices = (service: ArangoService): ArangoService => {
  Object.assign(service as unknown as Record<string, unknown>, {
    logService: createMock<LogService>(),
    configService: createMock<ConfigService>(),
  });
  return service;
};

describe('ArangoService', () => {
  let service: TestArangoService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockDatabaseInstances.length = 0;
    mockCollections.length = 0;

    service = attachServices(new TestArangoService()) as TestArangoService;
    await service.boot(new ArangoConfig({ conId: 'default', url: 'http://localhost:8529' } as ArangoConfig));
  });

  it('should initialize Database client from config', () => {
    expect(mockDatabaseInstances[0].config).toEqual(expect.objectContaining({ url: 'http://localhost:8529' }));
  });

  it('should import bulk documents into a collection', async () => {
    const docs = [
      { code: 'article', locale: 'en', value: 1 },
      { code: 'comment', locale: 'en', value: 2 },
    ];

    await service.bulkUpsert('translations', { docs, upsertFields: ['code', 'locale'] });

    expect(mockDatabaseInstances[0].collection).toHaveBeenCalledWith('translations');
    expect(mockCollections[0].import).toHaveBeenCalledWith(docs, { onDuplicate: 'update' });
    expect((service as any).logService.debug).toHaveBeenCalled();
  });

  it('should run AQL queries and close client resources', async () => {
    const query = { query: 'FOR doc IN docs RETURN doc' } as any;

    await expect(service.query(query)).resolves.toEqual(expect.objectContaining({ all: expect.any(Function) }));
    await service.exposeStop(service.getClient(), 'default');

    expect(mockDatabaseInstances[0].query).toHaveBeenCalledWith(query, undefined);
    expect(mockDatabaseInstances[0].close).toHaveBeenCalled();
    expect(mockDatabaseInstances[0].shutdown).toHaveBeenCalled();
  });
});
