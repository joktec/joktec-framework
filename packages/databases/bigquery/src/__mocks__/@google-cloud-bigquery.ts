import { jest } from '@jest/globals';

export const mockBigQueryInstances: BigQuery[] = [];
export const mockDatasets: Dataset[] = [];
export const mockTables: Table[] = [];

export class Table {
  id: string;
  exists = jest.fn(async () => [false]);
  insert = jest.fn(async (_rows: unknown[], _options?: unknown) => [{ inserted: true }]);
  load = jest.fn(async (_source: unknown) => [{ loaded: true }]);
  delete = jest.fn(async (_options?: unknown) => [{}]);

  constructor(id: string) {
    this.id = id;
    mockTables.push(this);
  }
}

export class Dataset {
  id: string;
  table = jest.fn((tableId: string) => new Table(tableId));
  createTable = jest.fn(async (tableId: string, options: unknown) => [new Table(tableId), options]);

  constructor(id: string) {
    this.id = id;
    mockDatasets.push(this);
  }
}

export class BigQuery {
  options: unknown;
  dataset = jest.fn((datasetId: string) => new Dataset(datasetId));
  query = jest.fn(async (_query: unknown) => [[{ id: 1 }]]);

  constructor(options: unknown) {
    this.options = options;
    mockBigQueryInstances.push(this);
  }
}
