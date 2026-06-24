import { QueryFailedError } from 'typeorm';
import { MysqlCatch } from '../mysql.exception';

class QueryFailureHarness {
  PinoLogger = {
    setContext: jest.fn(),
  };

  @MysqlCatch
  async run(error: Error): Promise<void> {
    throw error;
  }
}

describe('Mysql exception mapping', () => {
  it('should normalize duplicate key driver errors', async () => {
    const harness = new QueryFailureHarness();
    const error = new QueryFailedError('insert', [], { code: 'ER_DUP_ENTRY' } as Error & { code: string });

    await expect(harness.run(error)).rejects.toThrow('MYSQL_DUPLICATE_KEY');
  });

  it('should normalize postgres deadlock driver errors', async () => {
    const harness = new QueryFailureHarness();
    const error = new QueryFailedError('update', [], { code: '40P01' } as Error & { code: string });

    await expect(harness.run(error)).rejects.toThrow('MYSQL_DEADLOCK');
  });
});
