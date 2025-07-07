import { BaseMethodDecorator, CallbackMethodOptions, DEFAULT_CON_ID } from '@joktec/core';
import { CacheService } from '../cache.service';
import { generateCacheKey } from '../cache.utils';
import { CacheEvictOption } from '../models';

export const CacheEvict = (namespace: string, cacheEvictOption?: CacheEvictOption): MethodDecorator => {
  return BaseMethodDecorator(
    async (options: CallbackMethodOptions): Promise<any> => {
      const { method, args, services, params } = options;
      const { key, allEntries = false, conId = DEFAULT_CON_ID } = cacheEvictOption || {};
      const cacheService: CacheService = services.cacheService;

      const className = options.target?.constructor?.name ?? 'Unknown';
      const methodName = method.name;

      const cacheKey = allEntries ? '*' : generateCacheKey({ method: methodName, key, params, className });
      const res = await method(...args);
      await cacheService.del(cacheKey, { namespace }, conId);

      return res;
    },
    [CacheService],
  );
};
