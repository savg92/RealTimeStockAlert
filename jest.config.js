export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/apps', '<rootDir>/packages'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.base.json' }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/packages/shared/src/$1',
    '^@backend/(.*)$': '<rootDir>/apps/backend/src/$1',
    '^@mobile/(.*)$': '<rootDir>/apps/mobile/src/$1',
  },
  collectCoverageFrom: [
    '**/*.ts',
    '**/*.tsx',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
  ],
};
