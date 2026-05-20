import React from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

// Import shared contracts
import { version as sharedVersion } from '@stock-alert/shared';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import WatchlistScreen from './src/screens/WatchlistScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import StockDetailScreen from './src/screens/StockDetailScreen';
import AlertsListScreen from './src/screens/AlertsListScreen';
import AlertHistoryScreen from './src/screens/AlertHistoryScreen';
import { useAppStore } from './src/store/appStore';
import { createExpoPushNotificationManager } from './src/services/expoPushNotifications';
import { PushNotificationManager } from './src/services/pushNotifications';
import { NotificationRouter } from './src/services/notificationRouting';

export type RootStackParamList = {
  HomeTabs: undefined;
  StockDetail: {
    symbol: string;
    name?: string;
  };
  AlertHistory: undefined;
};

export type TabParamList = {
  Home: undefined;
  Watchlist: undefined;
  Alerts: {
    symbol?: string;
  };
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

SplashScreen.preventAutoHideAsync();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Watchlist') {
            iconName = focused ? 'bookmark' : 'bookmark-outline';
          } else if (route.name === 'Alerts') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Home' }}
      />
      <Tab.Screen
        name="Watchlist"
        component={WatchlistScreen}
        options={{ title: 'My Watchlist' }}
      />
      <Tab.Screen
        name="Alerts"
        component={AlertsListScreen}
        options={{ title: 'Price Alerts' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const notificationsEnabled = useAppStore((state) => state.settings.notifications);
  const setError = useAppStore((state) => state.setError);
  const notificationManagerRef = React.useRef<PushNotificationManager | null>(null);
  const navigationRef = React.useMemo(() => createNavigationContainerRef<RootStackParamList>(), []);
  const notificationRouterRef = React.useRef(new NotificationRouter(navigationRef));
  const notificationsFeatureEnabled = process.env.EXPO_PUBLIC_ENABLE_NOTIFICATIONS !== 'false';

  React.useEffect(() => {
    // Initialize app and ensure splash screen is hidden
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
      } catch (error) {
        console.error('Failed to initialize app:', error);
      } finally {
        // Always attempt to hide the splash screen so app remains interactive
        try {
          await SplashScreen.hideAsync();
        } catch (hideError) {
          console.warn('Failed to hide splash screen:', hideError);
        }
      }
    };

    void initializeApp();
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer
          ref={navigationRef}
          onReady={() => {
            notificationRouterRef.current.handleReady();
          }}
        >
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen
              name="HomeTabs"
              component={TabNavigator}
            />
            <Stack.Screen
              name="StockDetail"
              component={StockDetailScreen as React.ComponentType<NativeStackScreenProps<RootStackParamList, 'StockDetail'>>}
              options={({ route }) => ({ title: route.params.symbol, headerShown: true })}
            />
            <Stack.Screen
              name="AlertHistory"
              component={AlertHistoryScreen}
              options={{ title: 'Alert History', headerShown: true }}
            />
          </Stack.Navigator>
        </NavigationContainer>
        <StatusBar />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

