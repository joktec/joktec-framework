import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createMock } from '@golevelup/ts-jest';
import { ConfigService, LogService } from '@joktec/core';
import { mockBigQueryInstances, mockDatasets, mockTables } from '../__mocks__/@google-cloud-bigquery';
import { BigQueryConfig } from '../bigquery.config';
import { BigQueryService } from '../bigquery.service';
import { BigQuerySchema, SortOrder } from '../models';

class TestBigQueryService extends BigQueryService {
  boot(config: BigQueryConfig) {
    return this.clientInit(config);
  }
}

const schema: BigQuerySchema[] = [
  { name: 'id', type: 'STRING' },
  { name: 'title', type: 'STRING' },
];

const attachServices = (service: BigQueryService): BigQueryService => {
  Object.assign(service as unknown as Record<string, unknown>, {
    PinoLogger: createMock<LogService>(),
    ConfigService: createMock<ConfigService>({ get: jest.fn().mockReturnValue({ retries: 0 }) }),
    logService: createMock<LogService>(),
    configService: createMock<ConfigService>(),
  });
  return service;
};

describe('BigQueryService', () => {
  let service: TestBigQueryService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockBigQueryInstances.length = 0;
    mockDatasets.length = 0;
    mockTables.length = 0;

    service = attachServices(new TestBigQueryService()) as TestBigQueryService;
    await service.boot(
      new BigQueryConfig({
        conId: 'default',
        keyFilename: '/tmp/key.json',
        projectId: 'joktec',
        datasetId: 'analytics',
        location: 'asia-southeast1',
      } as BigQueryConfig),
    );
  });

  it('should initialize BigQuery client and create tables when missing', async () => {
    await service.createTable('events', schema);

    expect(mockBigQueryInstances[0].options).toEqual(
      expect.objectContaining({
        keyFilename: '/tmp/key.json',
        projectId: 'joktec',
        location: 'asia-southeast1',
        autoRetry: true,
        maxRetries: 5,
      }),
    );
    expect(mockBigQueryInstances[0].dataset).toHaveBeenCalledWith('analytics');
    expect(mockDatasets[1].createTable).toHaveBeenCalledWith('events', { schema, location: 'asia-southeast1' });
  });

  it('should insert rows using table insert API when raw mode is disabled', async () => {
    await expect(service.insert('events', [{ id: '1', title: 'One' }], schema)).resolves.toEqual({ inserted: true });

    expect(mockTables[0].insert).toHaveBeenCalledWith([{ id: '1', title: 'One' }], { raw: false, schema });
  });

  it('should insert rows using raw query mode when requested', async () => {
    await service.insert('events', [{ id: '1', title: 'One' }], schema, { raw: true });

    expect(mockBigQueryInstances[0].query).toHaveBeenCalledWith({
      query: 'INSERT INTO `joktec.analytics.events` (id, title) VALUES (?, ?);',
      params: ['1', 'One'],
    });
  });

  it('should build select and raw queries against configured table names', async () => {
    await service.query('events', {
      fields: ['id', 'title'],
      where: ['id = "1"'],
      sort: { id: SortOrder.DESC },
      limit: 10,
      offset: 5,
    });
    await service.rawQuery('SELECT * FROM {{table}} WHERE id = "1"', 'events');

    expect(mockBigQueryInstances[0].query).toHaveBeenCalledWith(
      'SELECT id, title FROM joktec.analytics.events WHERE id = "1" ORDER BY id desc LIMIT 10 OFFSET 5',
    );
    expect(mockBigQueryInstances[0].query).toHaveBeenCalledWith('SELECT * FROM joktec.analytics.events WHERE id = "1"');
  });
});
