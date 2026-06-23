import {
  consumerPrefix,
  gatewayRuntimeDependencies,
  ManagedApp,
  preflightDependencies,
  requestJson,
  startApp,
  stopApp,
  unwrapData,
} from './helpers';

describe('consumer database scenario', () => {
  let gateway: ManagedApp;
  let productId: string | undefined;

  beforeAll(async () => {
    await preflightDependencies(gatewayRuntimeDependencies);
    gateway = await startApp('gateway');
  });

  afterAll(async () => {
    if (productId) {
      await requestJson(gateway.baseUrl, `/products/${productId}`, { method: 'DELETE' }).catch(() => undefined);
    }
    await stopApp(gateway);
  });

  it('should create, read, update, list, and delete a MySQL-backed product through gateway', async () => {
    const name = consumerPrefix;
    const updatedName = `${consumerPrefix}-updated`;

    const createResponse = await requestJson(gateway.baseUrl, '/products', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    const created = unwrapData(createResponse);
    productId = created.id;

    expect(created).toEqual(expect.objectContaining({ id: expect.any(String), name }));

    const detailResponse = await requestJson(gateway.baseUrl, `/products/${productId}`);
    expect(unwrapData(detailResponse)).toEqual(expect.objectContaining({ id: productId, name }));

    const updateResponse = await requestJson(gateway.baseUrl, `/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify({ name: updatedName }),
    });
    expect(unwrapData(updateResponse)).toEqual(expect.objectContaining({ id: productId, name: updatedName }));

    const listResponse = await requestJson(
      gateway.baseUrl,
      `/products?limit=10&condition[name]=${encodeURIComponent(updatedName)}`,
    );
    const list = unwrapData(listResponse);
    expect(list.items).toEqual(expect.arrayContaining([expect.objectContaining({ id: productId })]));

    await requestJson(gateway.baseUrl, `/products/${productId}`, { method: 'DELETE' });
    productId = undefined;
  });
});
