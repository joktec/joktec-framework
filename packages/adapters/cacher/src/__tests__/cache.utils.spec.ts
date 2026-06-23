import { describe, expect, it } from '@jest/globals';
import { generateCacheKey, wildcardToRegExp } from '../cache.utils';

describe('cache utils', () => {
  it('should generate stable keys from class, method, and params', () => {
    const first = generateCacheKey({
      className: 'ArticleService',
      method: 'find',
      params: { tags: ['nestjs', 'joktec'], page: 1 },
    });
    const second = generateCacheKey({
      className: 'ArticleService',
      method: 'find',
      params: { page: 1, tags: ['joktec', 'nestjs'] },
    });

    expect(first).toBe(second);
    expect(first).toMatch(/^ArticleService:find:/);
  });

  it('should hash only the selected cache key parameter when configured', () => {
    const fullKey = generateCacheKey({
      className: 'ArticleService',
      method: 'findOne',
      params: { id: 'article-1', locale: 'en' },
    });
    const selectedKey = generateCacheKey({
      className: 'ArticleService',
      method: 'findOne',
      params: { id: 'article-1', locale: 'en' },
      key: 'id',
    });

    expect(selectedKey).not.toBe(fullKey);
    expect(selectedKey).toMatch(/^ArticleService:findOne:/);
  });

  it('should convert wildcard patterns into anchored regular expressions', () => {
    const regex = wildcardToRegExp('users:*:profile');

    expect(regex.test('users:123:profile')).toBe(true);
    expect(regex.test('prefix:users:123:profile')).toBe(false);
    expect(regex.test('users:123:profile:suffix')).toBe(false);
  });
});
