jest.mock('ioredis', () => {
  const actual = jest.requireActual('ioredis');
  return actual.default || actual;
});

import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { ManagedApp, microRuntimeDependencies, preflightDependencies, startApp, stopApp } from './helpers';

describe('consumer micro transport scenario', () => {
  let micro: ManagedApp;
  let client: ClientProxy;

  beforeAll(async () => {
    await preflightDependencies(microRuntimeDependencies);
    micro = await startApp('micro');
    client = ClientProxyFactory.create({
      transport: Transport.REDIS,
      options: {
        host: 'localhost',
        port: 6379,
        password: 'root',
        db: 0,
      },
    });
    await client.connect();
  });

  afterAll(async () => {
    await client?.close();
    await stopApp(micro);
  });

  it('should call Cron.refresh over Redis transport', async () => {
    const response = await firstValueFrom(client.send({ cmd: 'Cron.refresh' }, {}).pipe(timeout(20000)));

    expect(response).toEqual(expect.objectContaining({ success: true }));
  });
});
