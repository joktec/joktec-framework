import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { joinUrl, toArray } from '@joktec/utils';
import {
  BullModule as NestBullModule,
  RegisterFlowProducerOptions,
  RegisterQueueAsyncOptions,
  RegisterQueueOptions,
} from '@nestjs/bullmq';
import { DynamicModule, Inject, Module, OnApplicationBootstrap } from '@nestjs/common';
import basicAuth from 'express-basic-auth';
import { merge } from 'lodash';
import { ConfigService } from '../config';
import { LogService } from '../logger';
import { BullConfig } from './bull.config';
import { BullModuleOptions } from './bull.provider';

const BULL_FINAL_CONFIG = 'BULL_FINAL_CONFIG';

@Module({})
export class BullModule implements OnApplicationBootstrap {
  constructor(
    @Inject(BULL_FINAL_CONFIG) private readonly finalConfig: any,
    private readonly configService: ConfigService,
    private readonly logService: LogService,
  ) {}

  onApplicationBootstrap() {
    const board = this.finalConfig?.board;
    if (board?.enable) {
      const baseUrl = this.configService.get('app.baseUrl');
      const contextPath = this.configService.get('app.contextPath');
      const bullUrl = joinUrl(baseUrl, { paths: [contextPath, board.path] });
      this.logService.info(`🎯 Access bull dashboard at %s. Make sure Redis is running by default`, bullUrl);
    }
  }

  static forRoot(bullOpts?: BullModuleOptions): DynamicModule {
    const cfgService = new ConfigService();
    const bullCfg = cfgService.parseOrThrow(BullConfig, 'bull');
    const merged = merge({}, bullOpts, { connection: { ...bullCfg } });

    const imports = [NestBullModule.forRoot(merged)];
    if (merged.board?.enable) {
      const board = merged.board;
      const middleware =
        board?.username && board?.password
          ? basicAuth({ challenge: true, users: { [board.username]: board.password } })
          : undefined;
      imports.push(BullBoardModule.forRoot({ route: board?.path || '/bulls', adapter: ExpressAdapter, middleware }));

      const queues = toArray(board?.queues);
      if (queues.length) {
        queues.forEach(qName => imports.push(BullBoardModule.forFeature({ name: qName, adapter: BullMQAdapter })));
      }
    }

    return {
      global: true,
      module: BullModule,
      imports,
      providers: [{ provide: BULL_FINAL_CONFIG, useValue: merged }],
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
