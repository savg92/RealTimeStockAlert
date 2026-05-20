import React, { useMemo, useState } from 'react';
import { Dimensions, Text, View } from 'react-native';
import Svg, { Defs, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

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

export interface StockChartModelPoint {
  value: number;
  timestampMs: number;
  label: string;
  x: number;
  y: number;
}

export interface StockChartModelCandle {
  x: number;
  wickTopY: number;
  wickBottomY: number;
  bodyY: number;
  bodyHeight: number;
  bodyWidth: number;
  bullish: boolean;
}

export interface StockChartModel {
  chartData: StockChartModelPoint[];
  candles: StockChartModelCandle[];
  xLabels: Array<{ label: string; x: number }>;
  yLabels: Array<{ label: string; y: number }>;
  linePath: string;
  areaPath: string;
  yMin: number;
  yMax: number;
  chartWidth: number;
  chartHeight: number;
  leftPadding: number;
  rightPadding: number;
  topPadding: number;
  bottomPadding: number;
}

const CHART_PADDING = {
  top: 10,
  right: 12,
  bottom: 14,
  left: 42,
};

const formatChartLabel = (timestampMs: number, rangeLabel: string): string => {
  const date = new Date(timestampMs);
  if (Number.isNaN(date.getTime())) return '';

  const timeLabel = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  const dayLabel = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const monthLabel = date.toLocaleDateString(undefined, { month: 'short' });
  const monthYearLabel = date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });

  switch (rangeLabel) {
    case '1H':
    case '5H':
    case '1D':
      return timeLabel;
    case '5D':
      return `${date.toLocaleDateString(undefined, { weekday: 'short' })} ${timeLabel}`;
    case '1M':
      return dayLabel;
    case '3M':
      return `${monthLabel} ${date.getDate()}`;
    case '1Y':
    case '5Y':
    case 'ALL':
      return monthYearLabel;
    default:
      return timeLabel;
  }
};

const parseTimestampMs = (timestamp: string | number): number => {
  let ms = NaN;
  if (typeof timestamp === 'number') {
    ms = timestamp;
  } else {
    const numeric = Number(timestamp);
    if (!Number.isNaN(numeric)) ms = numeric;
    else ms = Date.parse(String(timestamp));
  }

  if (!Number.isNaN(ms) && ms < 1e12) ms = ms * 1000;
  return ms;
};

const getMaxPoints = (rangeLabel: string, length: number): number => {
  const caps: Record<string, number> = {
    '1H': 60,
    '5H': 90,
    '1D': 120,
    '5D': 140,
    '1M': 160,
    '3M': 180,
    '1Y': 220,
    '5Y': 240,
    ALL: 220,
  };

  return Math.min(length, caps[rangeLabel] ?? 160);
};

const samplePoints = <T,>(points: T[], maxPoints: number): T[] => {
  if (points.length <= maxPoints) return points;
  if (maxPoints <= 1) return [points[points.length - 1]];

  const sampled: T[] = [];
  const step = (points.length - 1) / (maxPoints - 1);

  for (let i = 0; i < maxPoints; i += 1) {
    const index = Math.min(points.length - 1, Math.round(i * step));
    const point = points[index];
    if (sampled[sampled.length - 1] !== point) {
      sampled.push(point);
    }
  }

  return sampled;
};


const getPriceLabelPrecision = (rangeLabel: string, span: number, averagePrice: number): number => {
  if (rangeLabel === '1H' || rangeLabel === '5H' || rangeLabel === '1D' || rangeLabel === '5D') {
    return 2;
  }

  if (averagePrice < 20 || span < 2) {
    return 2;
  }

  if (span < 15) {
    return 1;
  }

  return 0;
};

const formatPriceLabel = (value: number, precision: number): string => {
  if (precision === 0) {
    return `$${Math.round(value).toLocaleString()}`;
  }

  return `$${value.toFixed(precision)}`;
};

const determineChartHeight = (rangeLabel: string, containerWidth: number) => {
  switch (rangeLabel) {
    case '1H':
      return Math.min(154, Math.max(112, Math.floor(containerWidth * 0.26)));
    case '5H':
      return Math.min(172, Math.max(124, Math.floor(containerWidth * 0.28)));
    case '1D':
      return Math.min(190, Math.max(132, Math.floor(containerWidth * 0.3)));
    case '5D':
      return Math.min(210, Math.max(140, Math.floor(containerWidth * 0.32)));
    case '1M':
      return Math.min(230, Math.max(152, Math.floor(containerWidth * 0.34)));
    case '3M':
      return Math.min(260, Math.max(164, Math.floor(containerWidth * 0.36)));
    case '1Y':
      return Math.min(300, Math.max(176, Math.floor(containerWidth * 0.38)));
    case '5Y':
      return Math.min(340, Math.max(188, Math.floor(containerWidth * 0.4)));
    default:
      return Math.min(210, Math.max(132, Math.floor(containerWidth * 0.3)));
  }
};

const buildLinePath = (points: Array<{ x: number; y: number }>) => {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  return [`M ${first.x} ${first.y}`, ...rest.map((point) => `L ${point.x} ${point.y}`)].join(' ');
};

const buildSmoothLinePath = (points: Array<{ x: number; y: number }>) => {
  if (points.length <= 2) {
    return buildLinePath(points);
  }

  const pathSegments = [`M ${points[0].x} ${points[0].y}`];

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const previous = points[index - 1] ?? current;
    const following = points[index + 2] ?? next;

    const controlPoint1 = {
      x: current.x + (next.x - previous.x) / 6,
      y: current.y + (next.y - previous.y) / 6,
    };

    const controlPoint2 = {
      x: next.x - (following.x - current.x) / 6,
      y: next.y - (following.y - current.y) / 6,
    };

    pathSegments.push(
      `C ${controlPoint1.x} ${controlPoint1.y}, ${controlPoint2.x} ${controlPoint2.y}, ${next.x} ${next.y}`,
    );
  }

  return pathSegments.join(' ');
};

const buildAreaPath = (points: Array<{ x: number; y: number }>, baselineY: number) => {
  if (points.length === 0) return '';
  const linePath = buildSmoothLinePath(points);
  const last = points[points.length - 1];
  const first = points[0];
  return `${linePath} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const chooseXAxisLabels = (points: StockChartModelPoint[]) => {
  if (points.length <= 2)
    return points
      .map((point) => (point.label ? { label: point.label, x: point.x } : null))
      .filter(Boolean) as Array<{ label: string; x: number }>;

  const indices =
    points.length <= 4
      ? [0, Math.floor(points.length / 2), points.length - 1]
      : [
          0,
          Math.floor((points.length - 1) / 3),
          Math.floor(((points.length - 1) * 2) / 3),
          points.length - 1,
        ];

  return Array.from(new Set(indices))
    .map((index) => points[index])
    .filter((point) => Boolean(point.label))
    .map((point) => ({ label: point.label, x: point.x }));
};

export const buildStockChartModel = (
  data: StockChartPoint[],
  rangeLabel: string,
  chartWidth: number,
  chartHeight: number,
): StockChartModel | null => {
  const normalized = [...data]
    .map((point, index) => ({
      ...point,
      originalIndex: index,
      timestampMs: parseTimestampMs(point.timestamp),
    }))
    .filter((point) => Number.isFinite(point.price) && Number.isFinite(point.timestampMs))
    .sort((a, b) => a.timestampMs - b.timestampMs);

  if (normalized.length === 0) return null;

  const maxPoints = getMaxPoints(rangeLabel, normalized.length);
  const sampled = samplePoints(normalized, maxPoints);

  const rawValues = sampled.map((point) => point.price);
  const rawMin = Math.min(...rawValues);
  const rawMax = Math.max(...rawValues);
  const rawSpan = rawMax - rawMin;
  const anchor = Math.max(Math.abs(rawMin), Math.abs(rawMax), 1);
  const padding = Math.max(rawSpan * 0.1, anchor * 0.006, 0.02);

  let yMin = rawMin - padding;
  let yMax = rawMax + padding;

  if (yMax <= yMin) {
    const fallbackPad = Math.max(anchor * 0.02, 1);
    yMin -= fallbackPad;
    yMax += fallbackPad;
  }

  const leftPadding = CHART_PADDING.left;
  const rightPadding = CHART_PADDING.right;
  const topPadding = CHART_PADDING.top;
  const bottomPadding = CHART_PADDING.bottom;
  const innerWidth = Math.max(1, chartWidth - leftPadding - rightPadding);
  const innerHeight = Math.max(1, chartHeight - topPadding - bottomPadding);
  const valueSpan = Math.max(yMax - yMin, 0.0001);

  const chartData = sampled.map((point, index) => {
    const x =
      sampled.length === 1
        ? leftPadding + innerWidth / 2
        : leftPadding + (index / (sampled.length - 1)) * innerWidth;
    const normalizedValue = (point.price - yMin) / valueSpan;
    const y = topPadding + (1 - normalizedValue) * innerHeight;

    return {
      value: point.price,
      timestampMs: point.timestampMs,
      label: formatChartLabel(point.timestampMs, rangeLabel),
      x,
      y,
    };
  });

  const linePoints = chartData.map((point) => ({ x: point.x, y: point.y }));
  const baselineY = topPadding + innerHeight;
  const linePath = buildSmoothLinePath(linePoints);
  const areaPath = buildAreaPath(linePoints, baselineY);
  const yMid = (yMin + yMax) / 2;
  const candleWidth = clamp(innerWidth / Math.max(sampled.length * 2.6, 1), 1.5, 6);
  const labelPrecision = getPriceLabelPrecision(rangeLabel, rawSpan, rawMax);

  const candles = chartData.map((point, index) => {
    const currentPrice = sampled[index].price;
    const previousPrice = sampled[index - 1]?.price ?? currentPrice;
    const nextPrice = sampled[index + 1]?.price ?? currentPrice;
    const volatility = Math.max(
      Math.abs(currentPrice - previousPrice),
      Math.abs(nextPrice - currentPrice),
      rawSpan * 0.08,
      anchor * 0.003,
    );

    const openPrice = previousPrice;
    const closePrice = currentPrice;
    const highPrice = Math.max(openPrice, closePrice) + volatility;
    const lowPrice = Math.min(openPrice, closePrice) - volatility;
    const openY = topPadding + (1 - (openPrice - yMin) / valueSpan) * innerHeight;
    const closeY = topPadding + (1 - (closePrice - yMin) / valueSpan) * innerHeight;
    const wickTopY = topPadding + (1 - (highPrice - yMin) / valueSpan) * innerHeight;
    const wickBottomY = topPadding + (1 - (lowPrice - yMin) / valueSpan) * innerHeight;
    const bodyY = Math.min(openY, closeY);
    const bodyHeight = Math.max(1.5, Math.abs(closeY - openY));

    return {
      x: point.x,
      wickTopY: clamp(wickTopY, topPadding, baselineY),
      wickBottomY: clamp(wickBottomY, topPadding, baselineY),
      bodyY: clamp(bodyY, topPadding, baselineY),
      bodyHeight: Math.max(1.2, Math.min(bodyHeight, baselineY - topPadding)),
      bodyWidth: Math.max(1.2, Math.min(candleWidth, 6)),
      bullish: closePrice >= openPrice,
    };
  });

  const yLabels = [
    { label: formatPriceLabel(yMax, labelPrecision), y: topPadding },
    { label: formatPriceLabel(yMid, labelPrecision), y: topPadding + innerHeight / 2 },
    { label: formatPriceLabel(yMin, labelPrecision), y: baselineY },
  ];

  return {
    chartData,
    candles,
    xLabels: chooseXAxisLabels(chartData),
    yLabels,
    linePath,
    areaPath,
    yMin,
    yMax,
    chartWidth,
    chartHeight,
    leftPadding,
    rightPadding,
    topPadding,
    bottomPadding,
  };
};

export default function StockChart({
  symbol,
  data,
  baselinePrice,
  isLoading = false,
  error = null,
  rangeLabel = '1D',
}: StockChartProps) {
  const [containerWidth, setContainerWidth] = useState(
    Math.max(Dimensions.get('window').width - 66, 220),
  );
  const axisLabelWidth = 44;
  const chartWidth = Math.max(160, containerWidth - axisLabelWidth);
  const chartHeight = determineChartHeight(rangeLabel, chartWidth);
  const model = useMemo(
    () => buildStockChartModel(data, rangeLabel, chartWidth, chartHeight),
    [data, rangeLabel, chartWidth, chartHeight],
  );

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

  if (!model || model.chartData.length === 0) {
    return (
      <View className="rounded-lg border border-border bg-background-secondary p-4">
        <Text className="text-sm text-text-secondary">No chart data available yet.</Text>
      </View>
    );
  }

  const latestPriceSafe = model.chartData[model.chartData.length - 1].value;
  const resolvedBaselineSafe = baselinePrice ?? (Number(data[0]?.price) || latestPriceSafe);
  const deltaPercentSafe =
    resolvedBaselineSafe === 0
      ? 0
      : ((latestPriceSafe - resolvedBaselineSafe) / resolvedBaselineSafe) * 100;
  const positiveChangeSafe = deltaPercentSafe >= 0;

  return (
    <View
      className="rounded-lg border border-border bg-background-secondary p-2"
      onLayout={(e) => {
        const w = Math.max(220, Math.floor(e.nativeEvent.layout.width - 20));
        if (w !== containerWidth) setContainerWidth(w);
      }}
    >
      <View className="mb-1 flex-row items-end justify-between">
        <View>
          <Text className="text-xs text-text-secondary">
            {symbol} • {rangeLabel}
          </Text>
          <Text className="text-2xl font-bold text-text">${latestPriceSafe.toFixed(2)}</Text>
        </View>
        <Text style={{ color: positiveChangeSafe ? '#10B981' : '#EF4444' }}>
          {positiveChangeSafe ? '+' : ''}
          {deltaPercentSafe.toFixed(2)}%
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
        <View style={{ width: axisLabelWidth, paddingRight: 6, justifyContent: 'space-between' }}>
          {model.yLabels.map((item) => (
            <Text
              key={`${item.label}-${item.y}`}
              style={{
                fontSize: 8,
                color: '#6B7280',
                textAlign: 'right',
                lineHeight: 9,
              }}
            >
              {item.label}
            </Text>
          ))}
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 2 }}>
            <Svg width={model.chartWidth} height={model.chartHeight}>
              <Defs>
                <LinearGradient id={`stock-chart-fill-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                  <Stop
                    offset="0%"
                    stopColor={positiveChangeSafe ? '#10B981' : '#EF4444'}
                    stopOpacity={0.28}
                  />
                  <Stop
                    offset="70%"
                    stopColor={positiveChangeSafe ? '#10B981' : '#EF4444'}
                    stopOpacity={0.12}
                  />
                  <Stop
                    offset="100%"
                    stopColor={positiveChangeSafe ? '#10B981' : '#EF4444'}
                    stopOpacity={0.02}
                  />
                </LinearGradient>
                <LinearGradient id={`stock-chart-candle-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                  <Stop
                    offset="0%"
                    stopColor={positiveChangeSafe ? '#10B981' : '#EF4444'}
                    stopOpacity={0.88}
                  />
                  <Stop
                    offset="100%"
                    stopColor={positiveChangeSafe ? '#10B981' : '#EF4444'}
                    stopOpacity={0.44}
                  />
                </LinearGradient>
              </Defs>

              {model.yLabels.map((item, index) => (
                <Line
                  key={`${item.label}-${item.y}`}
                  x1={model.leftPadding}
                  x2={model.chartWidth - model.rightPadding}
                  y1={item.y}
                  y2={item.y}
                  stroke={index === 0 ? '#E5E7EB' : '#F1F5F9'}
                  strokeWidth={1}
                />
              ))}

              {model.candles.map((candle, index) => (
                <React.Fragment key={`${candle.x}-${index}`}>
                  <Line
                    x1={candle.x}
                    x2={candle.x}
                    y1={candle.wickTopY}
                    y2={candle.wickBottomY}
                    stroke={`url(#stock-chart-candle-${symbol})`}
                    strokeOpacity={0.9}
                    strokeWidth={1.0}
                    strokeLinecap="round"
                  />
                  <Rect
                    x={candle.x - candle.bodyWidth / 2}
                    y={candle.bodyY}
                    width={candle.bodyWidth}
                    height={candle.bodyHeight}
                    rx={1}
                    ry={1}
                    fill={`url(#stock-chart-candle-${symbol})`}
                    fillOpacity={candle.bullish ? 0.92 : 0.9}
                  />
                </React.Fragment>
              ))}

              <Path d={model.areaPath} fill={`url(#stock-chart-fill-${symbol})`} />
              <Path
                d={model.linePath}
                stroke={positiveChangeSafe ? '#10B981' : '#EF4444'}
                strokeWidth={2.5}
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </Svg>
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: 2,
              paddingLeft: 1,
              paddingRight: 1,
            }}
          >
            {model.xLabels.map((item) => (
              <Text
                key={`${item.label}-${item.x}`}
                style={{ fontSize: 8, color: '#6B7280' }}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}
