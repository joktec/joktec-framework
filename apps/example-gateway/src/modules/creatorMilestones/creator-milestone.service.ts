import { BaseService, Injectable } from '@joktec/core';
import { CreatorMilestone } from '../../models/entities';
import { CreatorMilestoneRepo } from '../../repositories';

@Injectable()
export class CreatorMilestoneService extends BaseService<CreatorMilestone, string> {
  constructor(protected creatorMilestoneRepo: CreatorMilestoneRepo) {
    super(creatorMilestoneRepo);
  }
}
