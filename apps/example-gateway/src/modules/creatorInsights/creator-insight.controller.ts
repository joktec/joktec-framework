import { BaseController, Controller, IControllerProps } from '@joktec/core';
import { CreatorInsight } from '../../models/entities';
import { CreatorInsightService } from './creator-insight.service';

const props: IControllerProps<CreatorInsight> = {
  dto: CreatorInsight,
};

@Controller('creator-insights')
export class CreatorInsightController extends BaseController<CreatorInsight, string>(props) {
  constructor(protected creatorInsightService: CreatorInsightService) {
    super(creatorInsightService);
  }
}
