import 'reflect-metadata';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { Crontab } from '../crontabs';
import { CrontabType } from '../crontabs/models';

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

describe('Crontab decorator', () => {
  beforeEach(() => {
    global.AllCronMetadata = {};
  });

  it('should register cron metadata for string expressions', () => {
    class TestCronService {
      @Crontab('*/5 * * * * *', {
        title: 'Refresh feed',
        timezone: 'Asia/Bangkok',
        trace: 'error',
        verbose: true,
        execLog: false,
      })
      refresh() {
        return undefined;
      }
    }

    expect(TestCronService).toBeDefined();
    expect(global.AllCronMetadata['TestCronService.refresh']).toMatchObject({
      cron: {
        code: 'TestCronService.refresh',
        serviceName: 'TestCronService',
        methodName: 'refresh',
        type: CrontabType.CRON,
        expression: '*/5 * * * * *',
        title: 'Refresh feed',
        timezone: 'Asia/Bangkok',
      },
      service: TestCronService,
      trace: 'error',
      verbose: true,
      execLog: false,
    });
  });

  it('should register cron metadata for date expressions', () => {
    const runAt = new Date('2026-01-01T00:00:00.000Z');

    class TestCronService {
      @Crontab(runAt)
      runOnce() {
        return undefined;
      }
    }

    expect(TestCronService).toBeDefined();
    expect(global.AllCronMetadata['TestCronService.runOnce'].cron).toMatchObject({
      code: 'TestCronService.runOnce',
      cronDate: runAt,
    });
  });

  it('should stop process registration when a duplicate cron code is detected', () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    class TestCronService {
      @Crontab('*/5 * * * * *')
      refresh() {
        return undefined;
      }
    }

    Crontab('*/10 * * * * *')(
      TestCronService.prototype,
      'refresh',
      Object.getOwnPropertyDescriptor(TestCronService.prototype, 'refresh'),
    );

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalled();

    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
