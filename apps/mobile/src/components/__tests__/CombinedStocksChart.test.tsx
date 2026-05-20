import React from 'react';
import { render } from '@testing-library/react-native';
import CombinedStocksChart, { buildCombinedStocksChartModel } from '../CombinedStocksChart';

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
    Circle: createMockSvgComponent('Circle'),
    Defs: createMockSvgComponent('Defs'),
    Line: createMockSvgComponent('Line'),
    LinearGradient: createMockSvgComponent('LinearGradient'),
    Path: createMockSvgComponent('Path'),
    Stop: createMockSvgComponent('Stop'),
  };
});

describe('CombinedStocksChart', () => {
  const series = [
    {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      points: [
        { timestamp: '2026-05-16T09:30:00.000Z', price: 100 },
        { timestamp: '2026-05-16T10:30:00.000Z', price: 108 },
        { timestamp: '2026-05-16T11:30:00.000Z', price: 112 },
      ],
    },
    {
      symbol: 'MSFT',
      name: 'Microsoft Corp.',
      points: [
        { timestamp: '2026-05-16T09:30:00.000Z', price: 200 },
        { timestamp: '2026-05-16T10:30:00.000Z', price: 198 },
        { timestamp: '2026-05-16T11:30:00.000Z', price: 206 },
      ],
    },
  ];

  it('builds a normalized combined chart model', () => {
    const model = buildCombinedStocksChartModel(series, '1D', 360, 220);

    expect(model).toBeTruthy();
    expect(model?.series).toHaveLength(2);
    expect(model?.series[0].linePath).toContain('M ');
    expect(model?.series[0].linePath).toContain('L ');
    expect(model?.xLabels.length).toBeGreaterThanOrEqual(2);
    expect(model?.yLabels).toHaveLength(3);
    expect(model?.series[0].latestPercent).toBeCloseTo(12, 1);
    expect(model?.series[1].latestPercent).toBeCloseTo(3, 1);
  });

  it('renders the combined graph and legend items', () => {
    const { getByText } = render(<CombinedStocksChart series={series} rangeLabel="1D" />);

    expect(getByText('All stocks • 1D')).toBeTruthy();
    expect(getByText('Relative performance')).toBeTruthy();
    expect(getByText('AAPL')).toBeTruthy();
    expect(getByText('MSFT')).toBeTruthy();
    expect(getByText('+12.00%')).toBeTruthy();
  });
});