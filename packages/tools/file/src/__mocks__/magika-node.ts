export const mockMagikaNode = {
  identifyStream: jest.fn(),
};

export const MagikaNode = {
  create: jest.fn(async () => mockMagikaNode),
};
