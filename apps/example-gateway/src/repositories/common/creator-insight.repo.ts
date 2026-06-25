import { Injectable } from '@joktec/core';
import { MysqlRepo, MysqlService } from '@joktec/mysql';
import { CreatorInsight } from '../../models/entities';

@Injectable()
export class CreatorInsightRepo extends MysqlRepo<CreatorInsight, string> {
  constructor(protected mysqlService: MysqlService) {
    super(mysqlService, CreatorInsight);
  }
}
