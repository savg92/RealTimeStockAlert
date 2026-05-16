import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

export default function HomeScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Home'>) {
  return (
    <ScrollView className="flex-1 bg-white">
      <View className="px-4 py-6">
        {/* Header */}
        <View className="mb-8">
          <Text className="text-3xl font-bold text-text mb-2">
            Welcome Back
          </Text>
          <Text className="text-lg text-text-secondary">
            Track real-time stock alerts
          </Text>
        </View>

        {/* Market Overview */}
        <View className="mb-6">
          <Text className="text-xl font-bold text-text mb-3">
            Market Overview
          </Text>

          <View className="flex-row gap-3">
            <View className="flex-1 bg-background-secondary rounded-lg p-4 border border-border">
              <Text className="text-sm text-text-secondary mb-2">
                Portfolio
              </Text>
              <Text className="text-xl font-bold text-text">
                $24,580
              </Text>
            </View>
            <View className="flex-1 bg-background-secondary rounded-lg p-4 border border-border">
              <Text className="text-sm text-text-secondary mb-2">
                Change Today
              </Text>
              <Text className="text-xl font-bold" style={{ color: '#10B981' }}>
                +2.45%
              </Text>
            </View>
          </View>
        </View>

        {/* Top Gainers */}
        <View className="mb-6">
          <Text className="text-xl font-bold text-text mb-3">
            Top Gainers
          </Text>

          <View className="bg-background-secondary rounded-lg p-4 mb-3 border border-border">
            <Text className="font-semibold text-text mb-1">
              AAPL
            </Text>
            <Text className="text-2xl font-bold text-primary">
              $189.50
            </Text>
            <Text className="text-sm mt-1" style={{ color: '#10B981' }}>
              +2.5%
            </Text>
          </View>

          <View className="bg-background-secondary rounded-lg p-4 mb-3 border border-border">
            <Text className="font-semibold text-text mb-1">
              MSFT
            </Text>
            <Text className="text-2xl font-bold text-primary">
              $412.30
            </Text>
            <Text className="text-sm mt-1" style={{ color: '#10B981' }}>
              +1.8%
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="mb-6">
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 rounded-lg py-3 items-center justify-center bg-primary"
              onPress={() => navigation.navigate('Watchlist')}
            >
              <Text className="text-white font-semibold">
                View Watchlist
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 rounded-lg py-3 items-center justify-center bg-secondary"
              onPress={() => navigation.navigate('Alerts')}
            >
              <Text className="text-white font-semibold">
                Price Alerts
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            className="mt-3 rounded-lg py-3 items-center justify-center bg-secondary"
            onPress={() => navigation.navigate('Settings')}
          >
            <Text className="text-white font-semibold">
              Settings
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
