import React from 'react';
import { render } from '@testing-library/react-native';
import StockChart from '../StockChart';

jest.mock('react-native-gifted-charts', () => ({
  LineChart: 'LineChart',
}));

describe('StockChart', () => {
  const data = [
    { timestamp: '2026-05-16T00:00:00.000Z', price: 100 },
    { timestamp: '2026-05-16T00:05:00.000Z', price: 110 },
  ];

  it('renders loading, error, and empty states', () => {
    expect(render(<StockChart symbol="AAPL" data={[]} isLoading />).getByText('Loading chart for AAPL…')).toBeTruthy();
    expect(render(<StockChart symbol="AAPL" data={[]} error="Oops" />).getByText('Unable to load chart: Oops')).toBeTruthy();
    expect(render(<StockChart symbol="AAPL" data={[]} />).getByText('No chart data available yet.')).toBeTruthy();
  });

  it('renders chart data and delta for positive movement', () => {
    const { getByText } = render(
      <StockChart symbol="AAPL" data={data} baselinePrice={100} />,
    );

    expect(getByText('AAPL • 1D')).toBeTruthy();
    expect(getByText('$110.00')).toBeTruthy();
    expect(getByText('+10.00%')).toBeTruthy();
  });

  it('renders chart data and delta for negative movement with invalid timestamp fallback', () => {
    const { getByText } = render(
      <StockChart
        symbol="MSFT"
        data={[
          { timestamp: 'invalid-date', price: 100 },
          { timestamp: '2026-05-16T00:05:00.000Z', price: 90 },
        ]}
        baselinePrice={100}
      />,
    );

    expect(getByText('$90.00')).toBeTruthy();
    expect(getByText('-10.00%')).toBeTruthy();
  });
});
