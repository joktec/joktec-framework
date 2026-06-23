export const pushNotificationInstances: Array<{ config: unknown; send: jest.Mock }> = [];

export default jest.fn().mockImplementation(function PushNotifications(config: unknown) {
  const instance = {
    config,
    send: jest.fn(),
  };
  pushNotificationInstances.push(instance);
  return instance;
});
