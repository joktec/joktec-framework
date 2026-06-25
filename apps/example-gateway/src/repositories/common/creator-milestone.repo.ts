import { Injectable } from '@joktec/core';
import { MysqlRepo, MysqlService } from '@joktec/mysql';
import { CreatorMilestone } from '../../models/entities';

@Injectable()
export class CreatorMilestoneRepo extends MysqlRepo<CreatorMilestone, string> {
  constructor(protected mysqlService: MysqlService) {
    super(mysqlService, CreatorMilestone);
  }
}
