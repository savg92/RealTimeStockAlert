import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useAppStore } from '../store/appStore';

interface SettingItemProps {
  label: string;
  description?: string;
  value?: boolean;
  onToggle?: (value: boolean) => void;
  isSwitch?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({
  label,
  description,
  value,
  onToggle,
  isSwitch,
}) => (
  <View className="flex-row justify-between items-center bg-background-secondary rounded-lg px-4 py-3 mb-2 border border-border">
    <View className="flex-1">
      <Text className="font-semibold text-text">{label}</Text>
      {description && (
        <Text className="text-xs text-text-secondary mt-1">
          {description}
        </Text>
      )}
    </View>
    {isSwitch && (
      <Switch
        value={value || false}
        onValueChange={onToggle || (() => {})}
        trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
        thumbColor={value ? '#0066FF' : '#9CA3AF'}
      />
    )}
  </View>
);

export default function SettingsScreen() {
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);

  const setNotifications = React.useCallback(
    (value: boolean) => {
      updateSettings({ notifications: value });
    },
    [updateSettings],
  );

  const setDarkMode = React.useCallback(
    (value: boolean) => {
      updateSettings({ darkMode: value });
    },
    [updateSettings],
  );

  const setAutoRefresh = React.useCallback(
    (value: boolean) => {
      updateSettings({ autoRefresh: value });
    },
    [updateSettings],
  );

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 24 }}>
      {/* Notifications Section */}
      <View className="mb-6">
        <Text className="text-lg font-bold text-text mb-3 px-2">
          Notifications
        </Text>
        <SettingItem
          label="Push Notifications"
          description="Receive price alerts and updates"
          value={settings.notifications}
          onToggle={setNotifications}
          isSwitch
        />
        <SettingItem
          label="Sound"
          description="Play sound on alerts"
          value={settings.notifications}
          isSwitch
        />
        <SettingItem
          label="Vibration"
          description="Vibrate on alerts"
          value={settings.notifications}
          isSwitch
        />
      </View>

      {/* Display Section */}
      <View className="mb-6">
        <Text className="text-lg font-bold text-text mb-3 px-2">
          Display
        </Text>
        <SettingItem
          label="Dark Mode"
          description="Use dark theme"
          value={settings.darkMode}
          onToggle={setDarkMode}
          isSwitch
        />
        <SettingItem
          label="Currency"
          description="USD"
        />
        <SettingItem
          label="Time Format"
          description="12-hour"
        />
      </View>

      {/* Data Section */}
      <View className="mb-6">
        <Text className="text-lg font-bold text-text mb-3 px-2">
          Data
        </Text>
        <SettingItem
          label="Auto-Refresh"
          description="Refresh data every 30 seconds"
          value={settings.autoRefresh}
          onToggle={setAutoRefresh}
          isSwitch
        />
        <SettingItem
          label="Wi-Fi Only"
          description="Update only on Wi-Fi"
          value={false}
          isSwitch
        />
      </View>

      <View style={{ height: 1, backgroundColor: '#D1D5DB', marginVertical: 16 }} />

      {/* About Section */}
      <View className="mb-6">
        <Text className="text-lg font-bold text-text mb-3 px-2">
          About
        </Text>
        <SettingItem
          label="Version"
          description="1.0.0"
        />
        <SettingItem
          label="Privacy Policy"
        />
        <SettingItem
          label="Terms of Service"
        />
      </View>

      {/* Action Buttons */}
      <TouchableOpacity className="w-full rounded-lg py-3 items-center justify-center mt-4 bg-primary">
        <Text className="text-white font-semibold">
          Save Settings
        </Text>
      </TouchableOpacity>

      <TouchableOpacity className="w-full rounded-lg py-3 items-center justify-center mt-4 bg-danger">
        <Text className="text-white font-semibold">
          Logout
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
