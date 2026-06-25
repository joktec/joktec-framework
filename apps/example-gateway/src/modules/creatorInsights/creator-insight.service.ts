import { BaseService, Injectable } from '@joktec/core';
import { CreatorInsight } from '../../models/entities';
import { CreatorInsightRepo } from '../../repositories';

@Injectable()
export class CreatorInsightService extends BaseService<CreatorInsight, string> {
  constructor(protected creatorInsightRepo: CreatorInsightRepo) {
    super(creatorInsightRepo);
  }
}
