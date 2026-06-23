import 'reflect-metadata';
import { describe, expect, it, jest } from '@jest/globals';
import { JobQueue } from '../jobs';

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

describe('JobQueue', () => {
  it('should process pushed data in configured batches', async () => {
    const consume = jest.fn<(items: number[]) => Promise<void>>().mockResolvedValue(undefined);
    const queue = new JobQueue<number>({ consume, concurrent: 1, batchSize: 2 });

    await queue.pushAndWaitForCompleted([1, 2, 3]);

    expect(consume).toHaveBeenCalledTimes(2);
    expect(consume).toHaveBeenNthCalledWith(1, [1, 2]);
    expect(consume).toHaveBeenNthCalledWith(2, [3]);
  });

  it('should collect batchProcess output in processing order', async () => {
    const queue = new JobQueue<number>({ consume: jest.fn(async (_items: number[]) => undefined) });

    const result = await queue.batchProcess([1, 2, 3], async items => items.map(item => item * 10), {
      concurrent: 1,
      batchSize: 2,
      retryTimeout: 1,
    });

    expect(result).toEqual([10, 20, 30]);
  });
});
