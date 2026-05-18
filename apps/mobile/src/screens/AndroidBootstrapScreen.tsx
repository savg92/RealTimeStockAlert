import React from 'react';
import { ScrollView, Text, View } from 'react-native';

export default function AndroidBootstrapScreen() {
  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ flexGrow: 1, padding: 24 }}>
      <View className="flex-1 items-start justify-center">
        <Text className="mb-3 text-3xl font-bold text-text">Android bootstrap mode</Text>
        <Text className="mb-3 text-base text-text-secondary">
          The mobile app is temporarily reduced to a safe shell so the Android deployment path can be
          validated first.
        </Text>
        <Text className="mb-2 text-sm text-text-secondary">
          Next steps are to reconnect watchlist, alerts, notifications, and live data progressively.
        </Text>
        <Text className="text-sm text-text-secondary">
          If this screen appears on Android, the dev client is loading correctly.
        </Text>
      </View>
    </ScrollView>
  );
}
