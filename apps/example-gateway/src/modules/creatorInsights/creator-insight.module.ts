import { Module } from '@joktec/core';
import { CreatorInsightController } from './creator-insight.controller';
import { CreatorInsightService } from './creator-insight.service';

@Module({
  controllers: [CreatorInsightController],
  providers: [CreatorInsightService],
  exports: [CreatorInsightService],
})
export class CreatorInsightModule {}
