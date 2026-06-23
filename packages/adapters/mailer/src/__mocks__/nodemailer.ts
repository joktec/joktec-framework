export const mockTransport = {
  use: jest.fn(),
  verify: jest.fn(),
  close: jest.fn(),
  sendMail: jest.fn(),
};

export const createTransport = jest.fn((_options?: unknown) => mockTransport);

export default { createTransport };
