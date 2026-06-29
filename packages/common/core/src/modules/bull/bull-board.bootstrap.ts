import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { joinUrl, toArray } from '@joktec/utils';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Queue } from 'bullmq';
import basicAuth from 'express-basic-auth';
import { ConfigService } from '../config';
import { LogService } from '../logger';
import { BULL_FINAL_CONFIG, BullModuleOptions } from './bull.provider';

@Injectable()
export class BullBoardBootstrap implements OnModuleInit {
  private static readonly dashboardUrls = new Set<string>();

  private dashboardUrl?: string;

  constructor(
    @Inject(BULL_FINAL_CONFIG) private readonly finalConfig: BullModuleOptions,
    private readonly configService: ConfigService,
    private readonly logService: LogService,
    private readonly httpAdapterHost: HttpAdapterHost,
  ) {}

  onModuleInit() {
    const board = this.finalConfig?.board;
    if (!board?.enable) return;

    const httpAdapter = this.httpAdapterHost?.httpAdapter;
    const app = httpAdapter?.getInstance?.();
    if (!app?.use) {
      this.logService.warn('Bull dashboard is enabled but no compatible HTTP adapter was found');
      return;
    }

    const gatewayPort = this.configService.get<number>('gateway.port');
    const contextPath = this.configService.get<string>('gateway.contextPath', '');
    const boardPath = joinUrl('', { paths: [contextPath, board.path] }) || board.path;
    const connection = this.finalConfig.connection;
    const queues = toArray(board.queues?.length ? board.queues : this.finalConfig.queues);

    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath(boardPath);
    createBullBoard({
      queues: queues.map(queue => new BullMQAdapter(new Queue(queue, { connection }))),
      serverAdapter,
    });

    const middlewares = [serverAdapter.getRouter()];
    if (board.username && board.password) {
      middlewares.unshift(basicAuth({ challenge: true, users: { [board.username]: board.password } }));
    }
    app.use(boardPath, ...middlewares);

    const baseUrl = gatewayPort ? `http://localhost:${gatewayPort}` : '';
    this.dashboardUrl = joinUrl(baseUrl, { paths: [boardPath] });
    BullBoardBootstrap.dashboardUrls.add(this.dashboardUrl);
  }

  static logDashboardUrls(logService: LogService): void {
    for (const url of BullBoardBootstrap.dashboardUrls) {
      logService.info(`🎯 Access bull dashboard at %s. Make sure Redis is running by default`, url);
    }
  }
}
