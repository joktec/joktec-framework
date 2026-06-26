import { BullRootModuleOptions } from '@nestjs/bullmq';
import { merge } from 'lodash';
import { ConfigService } from '../config';
import { BullBoardConfig, BullConfig } from './bull.config';

export const BULL_FINAL_CONFIG = 'BULL_FINAL_CONFIG';

export interface BullModuleOptions extends Partial<BullRootModuleOptions> {
  board?: Partial<BullBoardConfig>;
}

let rootOptions: BullModuleOptions = {};

export function setBullModuleOptions(options: BullModuleOptions = {}): void {
  rootOptions = options;
}

export function createBullFinalConfig(
  configService: ConfigService,
  bullOpts: BullModuleOptions = rootOptions,
): BullModuleOptions {
  configService.parseOrThrow(BullConfig, 'bull');

  const defaultCfg = new BullConfig({} as BullConfig);
  const configCfg = configService.get<Partial<BullConfig>>('bull') || {};
  const { board: defaultBoard, ...defaultConnection } = defaultCfg;
  const { board: moduleBoard, connection: moduleConnection, ...moduleRootOpts } = bullOpts;
  const { board: configBoard, ...configConnection } = configCfg;

  const connection = merge({}, defaultConnection, moduleConnection, configConnection);
  const finalConfig = merge({}, moduleRootOpts, { connection }) as BullModuleOptions;
  const boardSource = moduleBoard || configBoard ? merge({}, moduleBoard, configBoard) : defaultBoard;

  if (boardSource) finalConfig.board = new BullBoardConfig(boardSource);
  return finalConfig;
}
