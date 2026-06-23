import {
  gatewayRuntimeDependencies,
  microRuntimeDependencies,
  preflightDependencies,
  requestJson,
  startApp,
  stopApp,
  swaggerAuthHeader,
  unwrapData,
  ManagedApp,
} from './helpers';

describe('consumer smoke scenario', () => {
  let micro: ManagedApp;
  let gateway: ManagedApp;

  beforeAll(async () => {
    await preflightDependencies([...microRuntimeDependencies, ...gatewayRuntimeDependencies]);
    micro = await startApp('micro');
    gateway = await startApp('gateway');
  });

  afterAll(async () => {
    await stopApp(gateway);
    await stopApp(micro);
  });

  it('should expose health checks for micro and gateway', async () => {
    const microHealth = await requestJson(micro.baseUrl, '/health');
    const gatewayHealth = await requestJson(gateway.baseUrl, '/health');

    expect(unwrapData(microHealth)).toEqual({ status: 'ok' });
    expect(unwrapData(gatewayHealth)).toEqual({ status: 'ok' });
  });

  it('should return a gateway pagination response shape', async () => {
    const response = await requestJson(gateway.baseUrl, '/products?limit=1');
    const data = unwrapData(response);

    expect(data).toEqual(
      expect.objectContaining({
        items: expect.any(Array),
        total: expect.any(Number),
      }),
    );
  });

  it('should serve swagger when enabled', async () => {
    const response = await fetch(`${gateway.baseUrl}/swagger`, {
      headers: { authorization: swaggerAuthHeader() },
    });

    expect(response.status).toBeLessThan(500);
  });
});
