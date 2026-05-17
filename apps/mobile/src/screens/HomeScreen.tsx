import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

function HomeScreen({ navigation }: any) {
  return (
    <View testID="home-container">
      <Text>Home Screen</Text>
      <TouchableOpacity testID="go-to-watchlist" onPress={() => navigation.navigate('Watchlist')}>
        <Text>Go to Watchlist</Text>
      </TouchableOpacity>
    </View>
  );
}

export default HomeScreen;
