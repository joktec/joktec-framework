import {
  consumerPrefix,
  gatewayRuntimeDependencies,
  ManagedApp,
  microRuntimeDependencies,
  preflightDependencies,
  requestJson,
  startApp,
  stopApp,
  unwrapData,
} from './helpers';

describe('consumer database scenario', () => {
  let micro: ManagedApp;
  let gateway: ManagedApp;
  let profileBadgeId: string | undefined;

  beforeAll(async () => {
    await preflightDependencies([...microRuntimeDependencies, ...gatewayRuntimeDependencies]);
    micro = await startApp('micro');
    gateway = await startApp('gateway');
  });

  afterAll(async () => {
    if (profileBadgeId) {
      await requestJson(gateway.baseUrl, `/profile-badges/${profileBadgeId}`, { method: 'DELETE' }).catch(
        () => undefined,
      );
    }
    await stopApp(gateway);
    await stopApp(micro);
  });

  it('should create, read, update, list, and delete a MySQL-backed profile badge through gateway', async () => {
    const code = `consumer-${consumerPrefix}`;
    const name = `Creator ${consumerPrefix}`;
    const updatedName = `${consumerPrefix}-updated`;

    const createResponse = await requestJson(gateway.baseUrl, '/profile-badges', {
      method: 'POST',
      body: JSON.stringify({
        code,
        name,
        icon: 'spark',
        color: '#33AAFF',
        minFollowers: 10,
        minPosts: 3,
        sortOrder: 1,
        active: true,
      }),
    });
    const created = unwrapData(createResponse);
    profileBadgeId = created.id;

    expect(created).toEqual(expect.objectContaining({ id: expect.any(String), code, name }));

    const detailResponse = await requestJson(gateway.baseUrl, `/profile-badges/${profileBadgeId}`);
    expect(unwrapData(detailResponse)).toEqual(expect.objectContaining({ id: profileBadgeId, code, name }));

    const updateResponse = await requestJson(gateway.baseUrl, `/profile-badges/${profileBadgeId}`, {
      method: 'PUT',
      body: JSON.stringify({
        id: profileBadgeId,
        code,
        name: updatedName,
        icon: 'spark',
        color: '#33AAFF',
        minFollowers: 10,
        minPosts: 3,
        sortOrder: 1,
        active: true,
      }),
    });
    expect(unwrapData(updateResponse)).toEqual(expect.objectContaining({ id: profileBadgeId, name: updatedName }));

    const listResponse = await requestJson(
      gateway.baseUrl,
      `/profile-badges?limit=10&condition[code]=${encodeURIComponent(code)}`,
    );
    const list = unwrapData(listResponse);
    expect(list.items).toEqual(expect.arrayContaining([expect.objectContaining({ id: profileBadgeId })]));

    await requestJson(gateway.baseUrl, `/profile-badges/${profileBadgeId}`, { method: 'DELETE' });
    profileBadgeId = undefined;
  });
});
