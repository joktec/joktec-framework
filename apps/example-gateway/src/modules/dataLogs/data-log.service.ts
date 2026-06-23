import { BaseService, Injectable, IPaginationResponse } from '@joktec/core';
import { IMongoRequest } from '@joktec/mongo';
import { DataLog } from '../../models/schemas';
import { DataLogRepo } from '../../repositories';

@Injectable()
export class DataLogService extends BaseService<DataLog, string, IMongoRequest<DataLog>> {
  constructor(protected dataLogRepo: DataLogRepo) {
    super(dataLogRepo);
  }

  async paginate(query: IMongoRequest<DataLog>): Promise<IPaginationResponse<DataLog>> {
    return super.paginate({
      ...query,
      cursorKey: query.cursorKey || 'time',
      sort: query.sort || { time: 'desc' },
    });
  }
}
