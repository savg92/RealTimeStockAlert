import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#495057',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  settingContent: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: '#6c757d',
  },
  divider: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginVertical: 20,
  },
  buttonContainer: {
    gap: 10,
    marginTop: 8,
    marginBottom: 24,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#007bff',
  },
  dangerButton: {
    backgroundColor: '#dc3545',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  infoCard: {
    backgroundColor: '#e7f3ff',
    borderLeftWidth: 4,
    borderLeftColor: '#0066ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 12,
    color: '#004085',
    lineHeight: 16,
  },
});

interface SettingItemProps {
  label: string;
  description?: string;
  value?: boolean;
  onToggle?: (value: boolean) => void;
  isSwitch?: boolean;
  icon?: string;
}

const SettingItem: React.FC<SettingItemProps> = ({
  label,
  description,
  value,
  onToggle,
  isSwitch,
  icon,
}) => (
  <View style={styles.settingItem}>
    <View style={styles.settingContent}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {icon && <Ionicons name={icon as any} size={18} color="#007bff" />}
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      {description && <Text style={styles.settingDescription}>{description}</Text>}
    </View>
    {isSwitch && (
      <Switch
        value={value || false}
        onValueChange={onToggle || (() => {})}
        trackColor={{ false: '#d1d5db', true: '#a8d5ff' }}
        thumbColor={value ? '#0066ff' : '#9ca3af'}
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

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', onPress: () => {}, style: 'cancel' },
      {
        text: 'Logout',
        onPress: () => {
          // TODO: Implement logout logic
        },
        style: 'destructive',
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            ℹ️ Customize your experience and notification preferences
          </Text>
        </View>

        {/* Notifications Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>🔔 Notifications</Text>
          <SettingItem
            label="Push Notifications"
            description="Receive price alerts and updates"
            value={settings.notifications}
            onToggle={setNotifications}
            isSwitch
            icon="notifications-outline"
          />
          <SettingItem
            label="Sound"
            description="Play sound on alerts"
            value={settings.notifications}
            isSwitch
            icon="volume-high-outline"
          />
          <SettingItem
            label="Vibration"
            description="Vibrate on alerts"
            value={settings.notifications}
            isSwitch
            icon="phone-portrait-outline"
          />
        </View>

        {/* Display Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>🎨 Display</Text>
          <SettingItem
            label="Dark Mode"
            description="Use dark theme"
            value={settings.darkMode}
            onToggle={setDarkMode}
            isSwitch
            icon="moon-outline"
          />
          <SettingItem
            label="Currency"
            description="USD"
            icon="cash-outline"
          />
          <SettingItem
            label="Time Format"
            description="12-hour"
            icon="time-outline"
          />
        </View>

        {/* Data Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>📊 Data</Text>
          <SettingItem
            label="Auto-Refresh"
            description="Refresh data every 30 seconds"
            value={settings.autoRefresh}
            onToggle={setAutoRefresh}
            isSwitch
            icon="refresh-outline"
          />
          <SettingItem
            label="Wi-Fi Only"
            description="Update only on Wi-Fi"
            value={false}
            isSwitch
            icon="wifi-outline"
          />
        </View>

        <View style={styles.divider} />

        {/* About Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>ℹ️ About</Text>
          <SettingItem
            label="Version"
            description="1.0.0"
            icon="information-circle-outline"
          />
          <SettingItem label="Privacy Policy" icon="shield-checkmark-outline" />
          <SettingItem label="Terms of Service" icon="document-text-outline" />
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.button, styles.primaryButton]}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
            <Text style={styles.buttonText}>Save Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.dangerButton]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={18} color="#fff" />
            <Text style={styles.buttonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
