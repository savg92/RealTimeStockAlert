import React from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AndroidBootstrapScreen from './src/screens/AndroidBootstrapScreen';

void SplashScreen.preventAutoHideAsync();

export default function App() {
  React.useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <SafeAreaProvider>
      <AndroidBootstrapScreen />
      <StatusBar />
    </SafeAreaProvider>
  );
}
