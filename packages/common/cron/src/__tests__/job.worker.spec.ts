import 'reflect-metadata';
import { describe, expect, it, jest } from '@jest/globals';
import { createMock } from '@golevelup/ts-jest';
import { ConfigService, LogService } from '@joktec/core';
import { IJobModel, IJobRepo, JobStatus, JobWorker, JobWorkerConfig } from '../jobs';

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

class TestJobConfig extends JobWorkerConfig {}

type TestJobData = Record<string, unknown>;
type TestJobModel = IJobModel<TestJobData>;

class TestJobWorker extends JobWorker<TestJobModel, TestJobData, TestJobConfig> {
  constructor(jobRepo: IJobRepo<TestJobModel, string>) {
    super(jobRepo, TestJobConfig, 'testJob');
  }

  exposeCreateNewJobs(date: string): Promise<TestJobModel[]> {
    return this.createNewJobs(date);
  }

  exposeCanProcess(job: TestJobModel): Promise<boolean> {
    return this.canProcess(job);
  }

  async process(job: TestJobModel): Promise<TestJobModel> {
    return { ...job, status: JobStatus.DONE };
  }
}

const createWorker = (config: TestJobConfig) => {
  const jobRepo = createMock<IJobRepo<TestJobModel, string>>();
  const worker = new TestJobWorker(jobRepo);

  Object.assign(worker as unknown as Record<string, unknown>, {
    config,
    configService: createMock<ConfigService>(),
    logService: createMock<LogService>(),
  });

  return { worker, jobRepo };
};

describe('JobWorker', () => {
  it('should create default jobs from configured worker type and date', async () => {
    const { worker } = createWorker(new TestJobConfig({ type: 'daily-feed' }));

    await expect(worker.exposeCreateNewJobs('2026-01-01')).resolves.toEqual([
      expect.objectContaining({
        code: 'DAILY_FEED-2026-01-01',
        type: 'DAILY_FEED',
        date: '2026-01-01',
        status: JobStatus.TODO,
        data: {},
      }),
    ]);
  });

  it('should block processing while dependent jobs are not done', async () => {
    const { worker, jobRepo } = createWorker(new TestJobConfig({ type: 'daily-feed', dependsOn: ['PROFILE_SYNC'] }));
    jobRepo.count.mockResolvedValue(1);

    const result = await worker.exposeCanProcess({
      code: 'DAILY_FEED-2026-01-01',
      type: 'DAILY_FEED',
      date: '2026-01-01',
      startedAt: new Date(),
      finishedAt: new Date(),
      status: JobStatus.TODO,
    });

    expect(result).toBe(false);
    expect(jobRepo.count).toHaveBeenCalledWith({
      condition: {
        date: '2026-01-01',
        type: { $in: ['PROFILE_SYNC'] },
        status: { $ne: JobStatus.DONE },
      },
    });
  });
});
