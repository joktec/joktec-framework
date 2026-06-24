import { Injectable } from '@joktec/core';
import { MysqlRepo, MysqlService } from '@joktec/mysql';
import { ProfileBadge } from '../../models/entities';

@Injectable()
export class ProfileBadgeRepo extends MysqlRepo<ProfileBadge, string> {
  constructor(protected mysqlService: MysqlService) {
    super(mysqlService, ProfileBadge);
  }
}
