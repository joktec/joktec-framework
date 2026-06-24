import { BaseService, Injectable, NotFoundException } from '@joktec/core';
import { IMongoUpdate } from '@joktec/mongo';
import { ProfileBadge } from '../../models/entities';
import { User } from '../../models/schemas';
import { ProfileBadgeRepo, UserRepo } from '../../repositories';

@Injectable()
export class ProfileBadgeService extends BaseService<ProfileBadge, string> {
  constructor(
    protected profileBadgeRepo: ProfileBadgeRepo,
    private userRepo: UserRepo,
  ) {
    super(profileBadgeRepo);
  }

  async assignToUser(id: string, userId: string): Promise<User> {
    const [badge, user] = await Promise.all([this.profileBadgeRepo.findOne(id), this.userRepo.findOne(userId)]);
    if (!badge) throw new NotFoundException('PROFILE_BADGE_NOT_FOUND');
    if (!user) throw new NotFoundException('USER_NOT_FOUND');

    const badgeId = badge.id;
    if (!badgeId) throw new NotFoundException('PROFILE_BADGE_NOT_FOUND');

    const update: IMongoUpdate<User> = { $addToSet: { profileBadgeIds: badgeId } };
    return this.userRepo.update(userId, update);
  }
}
