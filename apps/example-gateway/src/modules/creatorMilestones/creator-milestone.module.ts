import { Module } from '@joktec/core';
import { CreatorMilestoneController } from './creator-milestone.controller';
import { CreatorMilestoneService } from './creator-milestone.service';

@Module({
  controllers: [CreatorMilestoneController],
  providers: [CreatorMilestoneService],
  exports: [CreatorMilestoneService],
})
export class CreatorMilestoneModule {}
