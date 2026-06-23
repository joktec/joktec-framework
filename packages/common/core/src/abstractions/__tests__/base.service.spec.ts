import { describe, expect, it, jest } from '@jest/globals';
import { BaseService } from '../base.service';
import { IBaseRepository, IBaseRequest } from '../../models';

interface TestEntity {
  id: string;
  name: string;
}

class TestService extends BaseService<TestEntity, string, IBaseRequest<TestEntity>> {
  constructor(repository: IBaseRepository<TestEntity, string>) {
    super(repository);
  }
}

const createRepository = (): jest.Mocked<IBaseRepository<TestEntity, string>> =>
  ({
    paginate: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    restore: jest.fn(),
    upsert: jest.fn(),
    bulkUpsert: jest.fn(),
  }) as jest.Mocked<IBaseRepository<TestEntity, string>>;

describe('BaseService class', () => {
  describe('transformPaginate method', () => {
    it('should default to page pagination when no pagination fields are provided', () => {
      const repository = createRepository();
      const service = new TestService(repository);
      const query: IBaseRequest<TestEntity> = { limit: 10 };
      const items = [{ id: '1', name: 'First' }];

      const result = service.transformPaginate(items, 25, query);

      expect(result).toEqual({
        items,
        total: 25,
        prevPage: null,
        currPage: 1,
        nextPage: 2,
        lastPage: 3,
      });
      expect(query.page).toBe(1);
    });

    it('should return offset pagination metadata when offset is provided', () => {
      const repository = createRepository();
      const service = new TestService(repository);
      const items = [{ id: '1', name: 'First' }];

      const result = service.transformPaginate(items, 25, { offset: 10, limit: 10 });

      expect(result).toEqual({
        items,
        total: 25,
        prevOffset: 0,
        currOffset: 10,
        nextOffset: 20,
        lastOffset: 15,
      });
    });

    it('should return cursor metadata when cursor request fields are provided', () => {
      const repository = createRepository();
      const service = new TestService(repository);
      const items = [{ id: '1', name: 'First' }];

      const result = service.transformPaginate(items, 25, {
        cursorKey: 'id',
        limit: 10,
        hasNextPage: true,
        nextCursor: 'next-token',
      });

      expect(result).toEqual({
        items,
        total: 25,
        hasNextPage: true,
        nextCursor: 'next-token',
      });
    });
  });

  describe('paginate method', () => {
    it('should transform repository page response into page metadata', async () => {
      const repository = createRepository();
      const service = new TestService(repository);
      const items = [{ id: '1', name: 'First' }];
      repository.paginate.mockResolvedValue({ items, total: 1 });

      const result = await service.paginate({ page: 1, limit: 10 });

      expect(repository.paginate).toHaveBeenCalledWith({ page: 1, limit: 10 });
      expect(result).toEqual({
        items,
        total: 1,
        prevPage: null,
        currPage: 1,
        nextPage: null,
        lastPage: 1,
      });
    });

    it('should preserve repository cursor response metadata', async () => {
      const repository = createRepository();
      const service = new TestService(repository);
      const items = [{ id: '1', name: 'First' }];
      repository.paginate.mockResolvedValue({
        items,
        total: 3,
        hasNextPage: true,
        nextCursor: 'next-token',
      });

      const result = await service.paginate({ cursorKey: 'id', limit: 1 });

      expect(result).toEqual({
        items,
        total: 3,
        hasNextPage: true,
        nextCursor: 'next-token',
      });
    });

    it('should bubble repository errors', async () => {
      const repository = createRepository();
      const service = new TestService(repository);
      repository.paginate.mockRejectedValue(new Error('repository failed'));

      await expect(service.paginate({ page: 1, limit: 10 })).rejects.toThrow('repository failed');
    });
  });
});
