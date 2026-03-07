import { BullRootModuleOptions } from '@nestjs/bullmq';
import { BullBoardConfig } from './bull.config';

export interface BullModuleOptions extends Partial<BullRootModuleOptions> {
  board?: Partial<BullBoardConfig>;
}
