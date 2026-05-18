import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

export interface StockChartPoint {
  timestamp: string;
  price: number;
}

interface StockChartProps {
  symbol: string;
  data: StockChartPoint[];
  baselinePrice?: number;
  isLoading?: boolean;
  error?: string | null;
  rangeLabel?: string;
}

const formatTimeLabel = (timestamp: string): string => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

export default function StockChart({
  symbol,
  data,
  baselinePrice,
  isLoading = false,
  error = null,
  rangeLabel = '1D',
}: StockChartProps) {
  if (isLoading) {
    return (
      <View className="rounded-lg border border-border bg-background-secondary p-4">
        <Text className="text-sm text-text-secondary">Loading chart for {symbol}…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="rounded-lg border border-border bg-background-secondary p-4">
        <Text className="text-sm text-danger">Unable to load chart: {error}</Text>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View className="rounded-lg border border-border bg-background-secondary p-4">
        <Text className="text-sm text-text-secondary">No chart data available yet.</Text>
      </View>
    );
  }

  const resolvedBaseline = baselinePrice ?? data[0].price;
  const latestPrice = data[data.length - 1].price;
  const deltaPercent = resolvedBaseline === 0
    ? 0
    : ((latestPrice - resolvedBaseline) / resolvedBaseline) * 100;
  const positiveChange = deltaPercent >= 0;

  const chartData = data.map((point, index) => ({
    value: point.price,
    label: index === 0 || index === data.length - 1 ? formatTimeLabel(point.timestamp) : '',
  }));

  const chartWidth = Math.max(Dimensions.get('window').width - 78, 220);

  return (
    <View className="rounded-lg border border-border bg-background-secondary p-3">
      <View className="mb-2 flex-row items-end justify-between">
        <View>
          <Text className="text-xs text-text-secondary">{symbol} • {rangeLabel}</Text>
          <Text className="text-2xl font-bold text-text">${latestPrice.toFixed(2)}</Text>
        </View>
        <Text style={{ color: positiveChange ? '#10B981' : '#EF4444' }}>
          {positiveChange ? '+' : ''}
          {deltaPercent.toFixed(2)}%
        </Text>
      </View>
      <Text className="mb-2 text-xs text-text-secondary">
        Device time ({new Date().toLocaleTimeString()})
      </Text>

      <LineChart
        areaChart
        data={chartData}
        width={chartWidth}
        height={160}
        spacing={Math.max(16, Math.floor(chartWidth / (data.length + 1)))}
        color={positiveChange ? '#10B981' : '#EF4444'}
        startFillColor={positiveChange ? '#10B981' : '#EF4444'}
        endFillColor="#FFFFFF"
        startOpacity={0.25}
        endOpacity={0}
        noOfSections={4}
        thickness={2}
        hideDataPoints={false}
        dataPointsColor={positiveChange ? '#10B981' : '#EF4444'}
        yAxisTextStyle={{ color: '#6B7280', fontSize: 10 }}
        xAxisLabelTextStyle={{ color: '#6B7280', fontSize: 10 }}
        hideRules={false}
        rulesColor="#E5E7EB"
      />
    </View>
  );
}
