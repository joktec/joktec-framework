import {
  BullModule as NestBullModule,
  BullRootModuleOptions,
  RegisterFlowProducerOptions,
  RegisterQueueAsyncOptions,
  RegisterQueueOptions,
} from '@nestjs/bullmq';
import { DynamicModule, Module } from '@nestjs/common';
import { merge, omit } from 'lodash';
import { ConfigModule, ConfigService } from '../config';
import { BullBoardBootstrap } from './bull-board.bootstrap';
import { BullBoardConfig, BullConfig } from './bull.config';
import { BULL_FINAL_CONFIG, BullModuleOptions } from './bull.provider';

@Module({})
export class BullModule {
  private static createFinalConfig(configService: ConfigService, bullOpts: BullModuleOptions = {}): BullModuleOptions {
    const bullCfg = configService.parseOrThrow(BullConfig, 'bull');
    const connection = omit(bullCfg, ['board']);
    const { board: boardOpts, ...rootOpts } = bullOpts;

    const boardSource = boardOpts === undefined ? bullCfg.board : merge({}, bullCfg.board, boardOpts);
    const finalConfig = merge({}, { connection }, rootOpts) as BullModuleOptions;
    if (boardSource) finalConfig.board = new BullBoardConfig(boardSource);
    return finalConfig;
  }

  static forRoot(bullOpts?: BullModuleOptions): DynamicModule {
    const bullRootFactory = (configService: ConfigService): BullRootModuleOptions => {
      const { board: _board, ...bullRootOptions } = BullModule.createFinalConfig(configService, bullOpts);
      return bullRootOptions as BullRootModuleOptions;
    };

    return {
      global: true,
      module: BullModule,
      imports: [
        ConfigModule,
        NestBullModule.forRootAsync({ imports: [ConfigModule], inject: [ConfigService], useFactory: bullRootFactory }),
      ],
      providers: [
        BullBoardBootstrap,
        {
          provide: BULL_FINAL_CONFIG,
          inject: [ConfigService],
          useFactory: (configService: ConfigService): BullModuleOptions =>
            BullModule.createFinalConfig(configService, bullOpts),
        },
      ],
      exports: [NestBullModule],
    };
  }

  static registerQueue(...options: RegisterQueueOptions[]): DynamicModule {
    return NestBullModule.registerQueue(...options);
  }

  static registerQueueAsync(...options: RegisterQueueAsyncOptions[]): DynamicModule {
    return NestBullModule.registerQueueAsync(...options);
  }

  static registerFlowProducer(...options: RegisterFlowProducerOptions[]): DynamicModule {
    return NestBullModule.registerFlowProducer(...options);
  }
}
