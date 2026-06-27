import { toArray } from '@joktec/utils';
import { BullRootModuleOptions } from '@nestjs/bullmq';
import { isArray, mergeWith } from 'lodash';
import { ConfigService } from '../config';
import { BullBoardConfig, BullConfig } from './bull.config';

export const BULL_FINAL_CONFIG = 'BULL_FINAL_CONFIG';

export interface BullModuleOptions extends Partial<BullRootModuleOptions> {
  board?: Partial<BullBoardConfig>;
  queues?: string[] | string;
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
  const { board: defaultBoard, queues: defaultQueues, ...defaultConnection } = defaultCfg;
  const { board: moduleBoard, connection: moduleConnection, queues: moduleQueues, ...moduleRootOpts } = bullOpts;
  const { board: configBoard, queues: configQueues, ...configConnection } = configCfg;

  const connection = mergeBullOptions({}, defaultConnection, moduleConnection, configConnection);
  const finalConfig = mergeBullOptions({}, moduleRootOpts, { connection }) as BullModuleOptions;
  const boardSource: Partial<BullBoardConfig> =
    moduleBoard || configBoard ? mergeBullOptions({}, moduleBoard, configBoard) : defaultBoard;
  const queues = resolveQueues(defaultQueues, moduleQueues, moduleBoard?.queues, configQueues, configBoard?.queues);

  finalConfig.queues = queues;
  if (boardSource) finalConfig.board = new BullBoardConfig({ ...boardSource, queues: boardSource.queues ?? queues });
  return finalConfig;
}

function mergeBullOptions<T extends object>(target: T, ...sources: any[]): T {
  return mergeWith(target, ...sources, (_target, source) => (isArray(source) ? source : undefined)) as T;
}

function resolveQueues(...sources: Array<string | string[] | undefined>): string[] {
  for (let i = sources.length - 1; i >= 0; i--) {
    const queues = toArray<string>(sources[i], { split: ',' }).filter(Boolean);
    if (queues.length) return queues;
  }
  return [];
}
