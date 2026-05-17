import 'react-native';
import React from 'react';
import renderer from 'react-test-renderer';

// This is a minimal test to confirm the test environment itself is working
it('renders correctly', () => {
  const tree = renderer.create(<React.Fragment />).toJSON();
  expect(tree).toBeNull();
});
