import {
  BullModule as NestBullModule,
  BullRootModuleOptions,
  RegisterFlowProducerOptions,
  RegisterQueueAsyncOptions,
  RegisterQueueOptions,
} from '@nestjs/bullmq';
import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '../config';
import { BullBoardBootstrap } from './bull-board.bootstrap';
import { BULL_FINAL_CONFIG, BullModuleOptions, createBullFinalConfig, setBullModuleOptions } from './bull.provider';

@Module({})
export class BullModule {
  static forRoot(bullOpts?: BullModuleOptions): DynamicModule {
    setBullModuleOptions(bullOpts);

    const bullRootFactory = (configService: ConfigService): BullRootModuleOptions => {
      const { board: _board, ...bullRootOptions } = createBullFinalConfig(configService, bullOpts);
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
            createBullFinalConfig(configService, bullOpts),
        },
      ],
      exports: [NestBullModule, BULL_FINAL_CONFIG],
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
