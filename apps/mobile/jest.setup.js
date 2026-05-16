// Jest setup for React Native/Expo
jest.mock('expo-constants', () => ({
  manifest: {
    version: '0.1.0',
  },
}));

jest.mock('nativewind', () => ({
  NativeWindStyleSheet: {
    create: (styles) => styles,
  },
}));

// Mock React Native modules
jest.mock('react-native', () => ({
  StyleSheet: {
    create: (styles) => styles,
  },
  View: 'View',
  Text: 'Text',
  ScrollView: 'ScrollView',
  FlatList: 'FlatList',
}));
