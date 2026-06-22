import { BullRootModuleOptions } from '@nestjs/bullmq';
import { BullBoardConfig } from './bull.config';

export const BULL_FINAL_CONFIG = 'BULL_FINAL_CONFIG';

export interface BullModuleOptions extends Partial<BullRootModuleOptions> {
  board?: Partial<BullBoardConfig>;
}
