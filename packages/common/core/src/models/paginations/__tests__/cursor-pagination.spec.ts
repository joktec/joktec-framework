import { describe, expect, it } from '@jest/globals';
import { CursorPagination } from '../cursor-pagination';

interface CursorEntity {
  _id: string;
  id: string;
  createdAt: Date;
  profile?: {
    score?: number;
  };
  active?: boolean;
}

describe('CursorPagination class', () => {
  describe('isCursorRequest method', () => {
    it('should return true when cursor is present', () => {
      expect(CursorPagination.isCursorRequest<CursorEntity>({ cursor: 'opaque' })).toBe(true);
    });

    it('should return true when cursorKey is present', () => {
      expect(CursorPagination.isCursorRequest<CursorEntity>({ cursorKey: 'createdAt' })).toBe(true);
    });

    it('should return false when cursor and cursorKey are not present', () => {
      expect(CursorPagination.isCursorRequest<CursorEntity>({ page: 1, limit: 10 })).toBe(false);
    });
  });

  describe('getLimit method', () => {
    it('should return a positive integer limit', () => {
      expect(CursorPagination.getLimit(10.8)).toBe(10);
    });

    it('should return fallback for invalid limits', () => {
      expect(CursorPagination.getLimit(0, 25)).toBe(25);
      expect(CursorPagination.getLimit(-1, 25)).toBe(25);
      expect(CursorPagination.getLimit(Number.NaN, 25)).toBe(25);
    });
  });

  describe('resolve method', () => {
    it('should resolve default keys and directions when cursor is not provided', () => {
      const cursor = CursorPagination.resolve<CursorEntity>({
        defaultKeys: ['createdAt'],
        tieBreakerKeys: ['id'],
        sort: { createdAt: 'asc', id: 'desc' },
      });

      expect(cursor).toEqual({
        keys: ['createdAt', 'id'],
        directions: ['asc', 'desc'],
      });
    });

    it('should resolve comma-separated cursor keys and nested sort directions', () => {
      const cursor = CursorPagination.resolve<CursorEntity>({
        cursorKey: 'profile.score, createdAt' as keyof CursorEntity,
        defaultKeys: ['_id'],
        sort: { profile: { score: 'asc' }, createdAt: 'desc' },
      });

      expect(cursor).toEqual({
        keys: ['profile.score', 'createdAt'],
        directions: ['asc', 'desc'],
      });
    });

    it('should reject unsafe cursor keys', () => {
      expect(() =>
        CursorPagination.resolve<CursorEntity>({
          cursorKey: 'createdAt;drop' as keyof CursorEntity,
          defaultKeys: ['_id'],
        }),
      ).toThrow('Invalid cursor key');
    });
  });

  describe('slice method', () => {
    it('should return items without next cursor when result does not exceed limit', () => {
      const items: CursorEntity[] = [
        { _id: '1', id: 'a', createdAt: new Date('2026-01-01T00:00:00.000Z') },
        { _id: '2', id: 'b', createdAt: new Date('2026-01-02T00:00:00.000Z') },
      ];

      const result = CursorPagination.slice(items, 2, ['createdAt', 'id'], ['desc', 'desc']);

      expect(result).toEqual({ items, hasNextPage: false, nextCursor: null });
    });

    it('should trim the extra item and create a cursor from the last visible item', () => {
      const items: CursorEntity[] = [
        { _id: '1', id: 'a', createdAt: new Date('2026-01-01T00:00:00.000Z'), active: true },
        { _id: '2', id: 'b', createdAt: new Date('2026-01-02T00:00:00.000Z'), active: false },
        { _id: '3', id: 'c', createdAt: new Date('2026-01-03T00:00:00.000Z'), active: true },
      ];

      const firstPage = CursorPagination.slice(items, 2, ['createdAt', 'id', 'active'], ['desc', 'desc', 'asc']);
      const nextCursor = CursorPagination.resolve<CursorEntity>({
        cursor: firstPage.nextCursor,
        defaultKeys: ['_id'],
      });

      expect(firstPage.items).toEqual(items.slice(0, 2));
      expect(firstPage.hasNextPage).toBe(true);
      expect(firstPage.nextCursor).toEqual(expect.any(String));
      expect(nextCursor.keys).toEqual(['createdAt', 'id', 'active']);
      expect(nextCursor.directions).toEqual(['desc', 'desc', 'asc']);
      expect(nextCursor.values).toEqual([new Date('2026-01-02T00:00:00.000Z'), 'b', false]);
    });
  });

  describe('toSort method', () => {
    it('should convert cursor keys and directions to sort object', () => {
      const sort = CursorPagination.toSort<CursorEntity>(['createdAt', 'id'], ['desc', 'asc']);

      expect(sort).toEqual({ createdAt: 'desc', id: 'asc' });
    });
  });
});
