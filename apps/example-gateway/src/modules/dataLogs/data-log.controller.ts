import { BaseController, Controller, IControllerProps } from '@joktec/core';
import { AuthGuard, RoleGuard } from '../../common';
import { DataLog } from '../../models/schemas';
import { DataLogService } from './data-log.service';

const props: IControllerProps<DataLog> = {
  dto: DataLog,
  paginate: { mode: 'cursor' },
  guards: [AuthGuard, RoleGuard],
  useBearer: true,
  create: { disable: true },
  update: { disable: true },
  delete: { disable: true },
};

@Controller('data-logs')
export class DataLogController extends BaseController<DataLog, string>(props) {
  constructor(protected dataLogService: DataLogService) {
    super(dataLogService);
  }
}
