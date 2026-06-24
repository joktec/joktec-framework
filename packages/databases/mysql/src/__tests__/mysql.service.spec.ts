import { DEFAULT_CON_ID } from '@joktec/core';
import { DataSource } from 'typeorm';
import { Dialect, MysqlConfig } from '../mysql.config';
import { MysqlService } from '../mysql.service';

class TestMysqlService extends MysqlService {
  constructor() {
    super({ [DEFAULT_CON_ID]: [] }, { [DEFAULT_CON_ID]: [] });
    const logService = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      setContext: jest.fn(),
    };
    Object.assign(this as unknown as Record<string, unknown>, {
      PinoLogger: logService,
      logService,
    });
  }

  setConfig(config: Partial<MysqlConfig>) {
    (this as unknown as { configs: Record<string, MysqlConfig> }).configs = {
      [config.conId || DEFAULT_CON_ID]: new MysqlConfig({
        conId: DEFAULT_CON_ID,
        dialect: Dialect.MYSQL,
        username: 'root',
        password: 'root',
        database: 'joktec',
        ...config,
      } as MysqlConfig),
    };
  }

  startForTest(client: DataSource, conId: string = DEFAULT_CON_ID): Promise<void> {
    return this.start(client, conId);
  }

  stopForTest(client: DataSource, conId: string = DEFAULT_CON_ID): Promise<void> {
    return this.stop(client, conId);
  }
}

const createDataSource = (props: Partial<DataSource> = {}) =>
  ({
    isInitialized: false,
    initialize: jest.fn().mockResolvedValue(undefined),
    synchronize: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
    ...props,
  }) as unknown as DataSource;

describe('MysqlService lifecycle', () => {
  it('should throw when datasource initialization fails', async () => {
    const service = new TestMysqlService();
    service.setConfig({});
    const error = new Error('connect failed');
    const client = createDataSource({ initialize: jest.fn().mockRejectedValue(error) });

    await expect(service.startForTest(client)).rejects.toThrow('connect failed');
  });

  it('should synchronize only when sync is explicitly enabled', async () => {
    const service = new TestMysqlService();
    service.setConfig({ sync: true });
    const client = createDataSource();

    await service.startForTest(client);

    expect(client.initialize).toHaveBeenCalled();
    expect(client.synchronize).toHaveBeenCalledWith(false);
  });

  it('should not destroy an uninitialized datasource', async () => {
    const service = new TestMysqlService();
    const client = createDataSource({ isInitialized: false });

    await service.stopForTest(client);

    expect(client.destroy).not.toHaveBeenCalled();
  });
});
