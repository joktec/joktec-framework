import { Module } from '@joktec/core';
import { DataLogController } from './data-log.controller';
import { DataLogService } from './data-log.service';

@Module({
  controllers: [DataLogController],
  providers: [DataLogService],
  exports: [DataLogService],
})
export class DataLogModule {}
