import { Module } from '@joktec/core';
import { ProfileBadgeController } from './profile-badge.controller';
import { ProfileBadgeService } from './profile-badge.service';

@Module({
  controllers: [ProfileBadgeController],
  providers: [ProfileBadgeService],
  exports: [ProfileBadgeService],
})
export class ProfileBadgeModule {}
