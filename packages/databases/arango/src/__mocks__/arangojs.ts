import { jest } from '@jest/globals';

export const mockDatabaseInstances: Database[] = [];
export const mockCollections: MockCollection[] = [];

export class MockCollection {
  name: string;
  import = jest.fn(async (_docs: unknown[], _options?: unknown) => ({ created: 1, errors: 0 }));

  constructor(name: string) {
    this.name = name;
    mockCollections.push(this);
  }
}

export class Database {
  config: unknown;
  collection = jest.fn((name: string) => new MockCollection(name));
  query = jest.fn(async (_query: unknown, _options?: unknown) => ({ all: jest.fn(async () => []) }));
  close = jest.fn();
  shutdown = jest.fn(async () => undefined);

  constructor(config: unknown) {
    this.config = config;
    mockDatabaseInstances.push(this);
  }
}
