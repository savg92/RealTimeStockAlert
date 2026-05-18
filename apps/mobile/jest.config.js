module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '/.expo/'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: ['src/**/*.{js,jsx,ts,tsx}', '!src/**/*.d.ts', '!src/**/index.ts'],
  testMatch: ['**/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)', '**/*.(test|spec).(js|jsx|ts|tsx)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@react-native/js-polyfills|.*)',
  ],
};
