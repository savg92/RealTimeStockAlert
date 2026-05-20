import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import HomeScreen from '../HomeScreen';

jest.mock('../../components/CombinedStocksChart', () => {
  return function MockCombinedStocksChart() {
    const { Text } = require('react-native');
    return <Text>Mock CombinedStocksChart</Text>;
  };
});

describe('HomeScreen', () => {
  it('renders and navigates to the watchlist', () => {
    const navigate = jest.fn();
    const { getByText, getByTestId } = render(<HomeScreen navigation={{ navigate }} />);

    expect(getByText('Home Screen')).toBeTruthy();
    fireEvent.press(getByTestId('go-to-watchlist'));
    expect(navigate).toHaveBeenCalledWith('Watchlist');
  });
});
