import React from 'react';
import { render } from '@testing-library/react-native';
import StockChart, { buildStockChartModel } from '../StockChart';

jest.mock('react-native-svg', () => {
  const ReactLocal = require('react');
  const { View: ReactNativeView } = require('react-native');

  const createMockSvgComponent = (name: string) => {
    return ({ children, ...props }: any) =>
      ReactLocal.createElement(ReactNativeView, { ...props, testID: name }, children);
  };

  return {
    __esModule: true,
    default: createMockSvgComponent('Svg'),
    Defs: createMockSvgComponent('Defs'),
    Line: createMockSvgComponent('Line'),
    LinearGradient: createMockSvgComponent('LinearGradient'),
    Path: createMockSvgComponent('Path'),
    Rect: createMockSvgComponent('Rect'),
    Stop: createMockSvgComponent('Stop'),
  };
});

describe('StockChart', () => {
  const data = [
    { timestamp: '2026-05-16T00:00:00.000Z', price: 100 },
    { timestamp: '2026-05-16T00:05:00.000Z', price: 110 },
  ];

  it('renders loading, error, and empty states', () => {
    expect(
      render(<StockChart symbol="AAPL" data={[]} isLoading />).getByText('Loading chart for AAPL…'),
    ).toBeTruthy();
    expect(
      render(<StockChart symbol="AAPL" data={[]} error="Oops" />).getByText(
        'Unable to load chart: Oops',
      ),
    ).toBeTruthy();
    expect(
      render(<StockChart symbol="AAPL" data={[]} />).getByText('No chart data available yet.'),
    ).toBeTruthy();
  });

  it('builds a tight price model and renders the summary for positive movement', () => {
    const model = buildStockChartModel(data, '1D', 360, 180);

    expect(model).toBeTruthy();
    expect(model?.chartData).toHaveLength(2);
    expect(model?.candles).toHaveLength(2);
    expect(model?.yMax).toBeGreaterThan(110);
    expect(model?.yMin).toBeLessThan(100);
    expect(model?.linePath).toContain('M');
    expect(model?.linePath).toMatch(/[LC]/);
    expect(model?.areaPath).toContain('Z');
    expect(model?.xLabels.map((label) => label.label)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^\d{2}:\d{2}$/),
        expect.stringMatching(/^\d{2}:\d{2}$/),
      ]),
    );
    expect(model?.yLabels.map((label) => label.label)).toEqual(
      expect.arrayContaining([expect.stringMatching(/^\$\d+\.\d{2}$/)]),
    );

    const { getByText } = render(<StockChart symbol="AAPL" data={data} baselinePrice={100} />);

    expect(getByText('AAPL • 1D')).toBeTruthy();
    expect(getByText('$110.00')).toBeTruthy();
    expect(getByText('+10.00%')).toBeTruthy();
  });

  it('drops invalid timestamps and still renders the remaining chart data', () => {
    const model = buildStockChartModel(
      [
        { timestamp: 'invalid-date', price: 100 },
        { timestamp: '2026-05-16T00:05:00.000Z', price: 90 },
      ],
      '1D',
      360,
      180,
    );

    expect(model).toBeTruthy();
    expect(model?.chartData).toHaveLength(1);
    expect(model?.xLabels).toHaveLength(1);
    expect(model?.chartData[0].value).toBe(90);

    const renderResult = render(
      <StockChart
        symbol="MSFT"
        data={[
          { timestamp: 'invalid-date', price: 100 },
          { timestamp: '2026-05-16T00:05:00.000Z', price: 90 },
        ]}
        baselinePrice={100}
      />,
    );

    expect(renderResult.getAllByText('$90.00').length).toBeGreaterThanOrEqual(1);
    expect(renderResult.getByText('-10.00%')).toBeTruthy();
  });

  it('downsamples large history and keeps labels sparse for readability', () => {
    const startTime = Date.UTC(2025, 0, 1);
    const longData = Array.from({ length: 240 }, (_, index) => ({
      timestamp: new Date(startTime + index * 24 * 60 * 60 * 1000).toISOString(),
      price: 100 + Math.sin(index / 12) * 4 + index * 0.01,
    }));

    const model = buildStockChartModel(longData, '1Y', 360, 180);

    expect(model).toBeTruthy();
    expect(model?.chartData.length).toBeLessThan(longData.length);
    expect(model?.xLabels.length).toBeLessThanOrEqual(4);
    expect(model?.yLabels).toHaveLength(3);
    expect(model?.candles.length).toBe(model?.chartData.length);
    expect(model?.linePath.startsWith('M ')).toBe(true);
    expect(model?.linePath).toContain('C');
  });

  it('uses a curved path when there are enough points to smooth', () => {
    const model = buildStockChartModel(
      [
        { timestamp: '2026-05-16T00:00:00.000Z', price: 100 },
        { timestamp: '2026-05-16T00:05:00.000Z', price: 112 },
        { timestamp: '2026-05-16T00:10:00.000Z', price: 106 },
      ],
      '1D',
      360,
      180,
    );

    expect(model).toBeTruthy();
    expect(model?.linePath).toContain('C');
    expect(model?.areaPath).toContain('C');
    expect(model?.candles).toHaveLength(3);
    expect(model?.candles[0].bodyWidth).toBeLessThanOrEqual(8);
    expect(model?.yLabels[0].label).toMatch(/^\$\d+\.\d{2}$/);
  });
});
