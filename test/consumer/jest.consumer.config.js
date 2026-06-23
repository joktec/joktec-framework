const path = require('path');

module.exports = {
  displayName: 'consumer',
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: path.resolve(__dirname, '../..'),
  testMatch: ['<rootDir>/test/consumer/**/*.scenario.ts'],
  setupFilesAfterEnv: ['<rootDir>/test/consumer/setup.ts'],
  transform: {
    '^.+\\.(t|s)s$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  modulePathIgnorePatterns: ['<rootDir>/.*/dist/'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  maxWorkers: 1,
  testTimeout: 180000,
  passWithNoTests: true,
};
