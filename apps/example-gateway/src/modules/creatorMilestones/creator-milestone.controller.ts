import { BaseController, Controller, IControllerProps } from '@joktec/core';
import { CreatorMilestone } from '../../models/entities';
import { CreatorMilestoneService } from './creator-milestone.service';

const props: IControllerProps<CreatorMilestone> = {
  dto: CreatorMilestone,
};

@Controller('creator-milestones')
export class CreatorMilestoneController extends BaseController<CreatorMilestone, string>(props) {
  constructor(protected creatorMilestoneService: CreatorMilestoneService) {
    super(creatorMilestoneService);
  }
}
