import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Benefit, BenefitDocument } from './schemas/benefit.schema';
import {
  BaseConditionInput,
  BasePaginationInput,
  BaseService,
  CacheTtlSeconds,
  generateRedisCacheKey,
  ICustomConditionQuery,
} from '@jobhopin/core';
import { RedisCacheKey } from '@app/app.constants';
import { Cacheable } from 'type-cacheable';
export class BenefitService extends BaseService<BenefitDocument> {
  constructor(
    @InjectModel(Benefit.name) private benefitModel: Model<BenefitDocument>,
  ) {
    super(benefitModel);
  }

  @Cacheable({
    cacheKey: (args: any[]) =>
      generateRedisCacheKey(RedisCacheKey.BENEFIT_QUERY, args),
    ttlSeconds: CacheTtlSeconds.ONE_HOUR,
  })
  async query(
    condition: BaseConditionInput,
    pagination: BasePaginationInput,
    customCondition?: ICustomConditionQuery,
  ): Promise<any> {
    return super.query(condition, pagination, customCondition);
  }
}
