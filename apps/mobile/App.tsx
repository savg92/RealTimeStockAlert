import React from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

// Import shared contracts
import { version as sharedVersion } from '@stock-alert/shared';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import WatchlistScreen from './src/screens/WatchlistScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import StockDetailScreen from './src/screens/StockDetailScreen';
import AlertsListScreen from './src/screens/AlertsListScreen';
import { useAppStore } from './src/store/appStore';
import { createExpoPushNotificationManager } from './src/services/expoPushNotifications';
import { PushNotificationManager } from './src/services/pushNotifications';
import { NotificationRouter } from './src/services/notificationRouting';

export type RootStackParamList = {
  Home: undefined;
  Watchlist: undefined;
  Alerts: undefined;
  Settings: undefined;
  StockDetail: {
    symbol: string;
    name?: string;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

SplashScreen.preventAutoHideAsync();

export default function App() {
  const notificationsEnabled = useAppStore((state) => state.settings.notifications);
  const setError = useAppStore((state) => state.setError);
  const notificationManagerRef = React.useRef<PushNotificationManager | null>(null);
  const navigationRef = React.useMemo(() => createNavigationContainerRef<RootStackParamList>(), []);
  const notificationRouterRef = React.useRef(new NotificationRouter(navigationRef));
  const notificationsFeatureEnabled = process.env.EXPO_PUBLIC_ENABLE_NOTIFICATIONS !== 'false';

  React.useEffect(() => {
    // Initialize app and hide splash screen
    const initializeApp = async () => {
      try {
        // Perform initialization tasks here
        void sharedVersion;
        notificationManagerRef.current = createExpoPushNotificationManager();
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        });
        await SplashScreen.hideAsync();
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initializeApp();
  }, []);

  React.useEffect(() => {
    const manager = notificationManagerRef.current;
    if (!manager) {
      return;
    }

    const syncNotifications = async () => {
      if (!notificationsFeatureEnabled || !notificationsEnabled) {
        await manager.disable();
        return;
      }

      const result = await manager.enable();
      if (!result.synced && result.reason) {
        setError(result.reason);
        return;
      }

      setError(null);
    };

    syncNotifications().catch((error) => {
      setError(error instanceof Error ? error.message : 'Failed to sync push notifications');
    });

    return () => {
      manager.disable().catch((error) => {
        console.error('Failed to disable notifications:', error);
      });
    };
  }, [notificationsEnabled, notificationsFeatureEnabled, setError]);

  React.useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      notificationRouterRef.current.handleResponse(response);
    });

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        notificationRouterRef.current.handleResponse(response);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer
        ref={navigationRef}
        onReady={() => {
          notificationRouterRef.current.handleReady();
        }}
      >
        <Stack.Navigator
          screenOptions={{
            headerShown: true,
          }}
        >
          <Stack.Screen
            name="Home"
            component={HomeScreen as React.ComponentType<NativeStackScreenProps<RootStackParamList, 'Home'>>}
            options={{ title: 'Real-Time Stock Alert' }}
          />
          <Stack.Screen
            name="Watchlist"
            component={WatchlistScreen as React.ComponentType<NativeStackScreenProps<RootStackParamList, 'Watchlist'>>}
            options={{ title: 'My Watchlist' }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen as React.ComponentType<NativeStackScreenProps<RootStackParamList, 'Settings'>>}
            options={{ title: 'Settings' }}
          />
          <Stack.Screen
            name="Alerts"
            component={AlertsListScreen as React.ComponentType<NativeStackScreenProps<RootStackParamList, 'Alerts'>>}
            options={{ title: 'Price Alerts' }}
          />
          <Stack.Screen
            name="StockDetail"
            component={StockDetailScreen as React.ComponentType<NativeStackScreenProps<RootStackParamList, 'StockDetail'>>}
            options={({ route }) => ({ title: route.params.symbol })}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar />
    </SafeAreaProvider>
  );
}
