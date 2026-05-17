import React from 'react';
import { render } from '@testing-library/react-native';
import SettingsScreen from '../SettingsScreen';

describe('SettingsScreen', () => {
  it('renders the major settings sections and actions', () => {
    const { getByText } = render(<SettingsScreen />);

    expect(getByText('Notifications')).toBeTruthy();
    expect(getByText('Display')).toBeTruthy();
    expect(getByText('Data')).toBeTruthy();
    expect(getByText('About')).toBeTruthy();
    expect(getByText('Save Settings')).toBeTruthy();
    expect(getByText('Logout')).toBeTruthy();
  });
});
