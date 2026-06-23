import 'reflect-metadata';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { createMock } from '@golevelup/ts-jest';
import { ConfigService, LogService, ModuleRef } from '@joktec/core';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CrontabConfig, CrontabScheduler, ICrontabHistoryRepo, ICrontabRepo } from '../crontabs';
import { CrontabStatus, CrontabType, ICrontabHistoryModel, ICrontabModel } from '../crontabs/models';

jest.mock('uuid', () => ({ v4: () => '00000000-0000-4000-8000-000000000001' }));

jest.mock('slug', () => ({
  __esModule: true,
  default: (value: string, opts?: { lower?: boolean }) => {
    const slugified = String(value)
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return opts?.lower ? slugified.toLowerCase() : slugified;
  },
}));

class TestCrontabScheduler extends CrontabScheduler {
  constructor(
    cronRepo: ICrontabRepo<ICrontabModel, string>,
    historyRepo: ICrontabHistoryRepo<ICrontabHistoryModel, string>,
  ) {
    super(cronRepo, historyRepo);
  }

  resolveExpression(expression: string): string {
    return this.getAndValidExpression(expression);
  }
}

const createCron = (status: CrontabStatus): ICrontabModel => ({
  id: 'cron-1',
  code: 'TestService.refresh',
  serviceName: 'TestService',
  methodName: 'refresh',
  type: CrontabType.CRON,
  expression: '*/5 * * * * *',
  timezone: 'UTC',
  status,
  snapshot: () => ({ code: 'TestService.refresh' }),
});

const createScheduler = () => {
  const cronRepo = createMock<ICrontabRepo<ICrontabModel, string>>();
  const historyRepo = createMock<ICrontabHistoryRepo<ICrontabHistoryModel, string>>();
  const scheduler = new TestCrontabScheduler(cronRepo, historyRepo);

  Object.assign(scheduler as unknown as Record<string, unknown>, {
    config: new CrontabConfig({ prefix: 'test:cron', timezone: 'UTC' }),
    configService: createMock<ConfigService>({
      get: jest.fn(),
    }),
    logService: createMock<LogService>(),
    moduleRef: createMock<ModuleRef>(),
    schedulerRegistry: createMock<SchedulerRegistry>(),
  });

  return { scheduler, cronRepo, historyRepo };
};

describe('CrontabScheduler', () => {
  beforeEach(() => {
    delete process.env.TEST_CRON_EXPRESSION;
  });

  it('should resolve direct, config path, and env cron expressions', () => {
    const { scheduler } = createScheduler();
    const configService = (scheduler as unknown as { configService: jest.Mocked<ConfigService> }).configService;
    configService.get.mockReturnValue('*/10 * * * * *');
    process.env.TEST_CRON_EXPRESSION = '*/15 * * * * *';

    expect(scheduler.resolveExpression('*/5 * * * * *')).toBe('*/5 * * * * *');
    expect(scheduler.resolveExpression('cron.refresh')).toBe('*/10 * * * * *');
    expect(scheduler.resolveExpression('TEST_CRON_EXPRESSION')).toBe('*/15 * * * * *');
  });

  it('should reject invalid cron expressions', () => {
    const { scheduler } = createScheduler();

    expect(() => scheduler.resolveExpression('not-a-cron')).toThrow("Cron expression 'not-a-cron' is invalid.");
  });

  it('should refresh activated and disabled cron records through the expected path', async () => {
    const { scheduler } = createScheduler();
    const startSpy = jest.spyOn(scheduler, 'startCron').mockResolvedValue(undefined);
    const stopSpy = jest.spyOn(scheduler, 'stopCron').mockResolvedValue(undefined);

    await expect(scheduler.refreshOne(createCron(CrontabStatus.ACTIVATED))).resolves.toEqual({ success: true });
    await expect(scheduler.refreshOne(createCron(CrontabStatus.DISABLED))).resolves.toEqual({ success: true });

    expect(startSpy).toHaveBeenCalledWith(expect.objectContaining({ status: CrontabStatus.ACTIVATED }), true);
    expect(stopSpy).toHaveBeenCalledWith(expect.objectContaining({ status: CrontabStatus.DISABLED }));
  });
});
