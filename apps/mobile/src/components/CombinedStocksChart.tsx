import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { API_CONFIG, API_ENDPOINTS } from '../utils/api';

export interface CombinedStockSeriesPoint {
  timestamp: string;
  price: number;
}

export interface CombinedStockSeries {
  symbol: string;
  name: string;
  points: CombinedStockSeriesPoint[];
  color?: string;
}

interface CombinedStocksChartProps {
  rangeLabel?: '1D' | '5D' | '1M' | '3M' | '1Y';
  series?: CombinedStockSeries[];
}

interface NormalizedPoint {
  timestampMs: number;
  x: number;
  y: number;
  percent: number;
}

interface CombinedSeriesModel {
  symbol: string;
  name: string;
  color: string;
  latestPrice: number;
  latestPercent: number;
  linePath: string;
  points: NormalizedPoint[];
}

export interface CombinedStocksChartModel {
  chartWidth: number;
  chartHeight: number;
  leftPadding: number;
  rightPadding: number;
  topPadding: number;
  bottomPadding: number;
  yMin: number;
  yMax: number;
  xLabels: Array<{ label: string; x: number }>;
  yLabels: Array<{ label: string; y: number }>;
  series: CombinedSeriesModel[];
}

const COLORS = ['#007AFF', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4'];

const PADDING = {
  top: 12,
  right: 12,
  bottom: 18,
  left: 46,
};

const formatLabel = (
  timestampMs: number,
  rangeLabel: NonNullable<CombinedStocksChartProps['rangeLabel']>,
): string => {
  const date = new Date(timestampMs);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const timeLabel = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  const dayLabel = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const monthLabel = date.toLocaleDateString(undefined, { month: 'short' });

  if (rangeLabel === '1D') {
    return timeLabel;
  }

  if (rangeLabel === '5D') {
    return `${date.toLocaleDateString(undefined, { weekday: 'short' })} ${timeLabel}`;
  }

  if (rangeLabel === '1M') {
    return dayLabel;
  }

  if (rangeLabel === '3M') {
    return `${monthLabel} ${date.getDate()}`;
  }

  return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
};

const buildLinePath = (points: Array<{ x: number; y: number }>) => {
  if (points.length === 0) {
    return '';
  }

  const [first, ...rest] = points;
  return [`M ${first.x} ${first.y}`, ...rest.map((point) => `L ${point.x} ${point.y}`)].join(' ');
};

export const buildCombinedStocksChartModel = (
  series: CombinedStockSeries[],
  rangeLabel: NonNullable<CombinedStocksChartProps['rangeLabel']>,
  chartWidth: number,
  chartHeight: number,
): CombinedStocksChartModel | null => {
  const normalizedSeries = series
    .map((item, index) => {
      const color = item.color ?? COLORS[index % COLORS.length];
      const points = [...item.points]
        .map((point) => ({
          timestampMs: Date.parse(point.timestamp),
          price: Number(point.price),
        }))
        .filter((point) => Number.isFinite(point.timestampMs) && Number.isFinite(point.price))
        .sort((a, b) => a.timestampMs - b.timestampMs);

      if (points.length === 0) {
        return null;
      }

      const basePrice = points[0].price;
      const latestPrice = points[points.length - 1].price;
      const latestPercent = basePrice === 0 ? 0 : ((latestPrice - basePrice) / basePrice) * 100;

      return {
        symbol: item.symbol,
        name: item.name,
        color,
        latestPrice,
        latestPercent,
        points,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (!normalizedSeries.length) {
    return null;
  }

  const allTimestamps = normalizedSeries.flatMap((item) => item.points.map((point) => point.timestampMs));
  const allPercents = normalizedSeries.flatMap((item) => {
    const basePrice = item.points[0].price;
    return item.points.map((point) => (basePrice === 0 ? 0 : ((point.price - basePrice) / basePrice) * 100));
  });

  const xMin = Math.min(...allTimestamps);
  const xMax = Math.max(...allTimestamps);
  const yMinRaw = Math.min(...allPercents);
  const yMaxRaw = Math.max(...allPercents);
  const ySpan = yMaxRaw - yMinRaw;
  const yAnchor = Math.max(Math.abs(yMinRaw), Math.abs(yMaxRaw), 1);
  const yPadding = Math.max(ySpan * 0.12, yAnchor * 0.08, 0.5);

  let yMin = yMinRaw - yPadding;
  let yMax = yMaxRaw + yPadding;

  if (yMax <= yMin) {
    yMin -= 1;
    yMax += 1;
  }

  const leftPadding = PADDING.left;
  const rightPadding = PADDING.right;
  const topPadding = PADDING.top;
  const bottomPadding = PADDING.bottom;
  const innerWidth = Math.max(1, chartWidth - leftPadding - rightPadding);
  const innerHeight = Math.max(1, chartHeight - topPadding - bottomPadding);
  const valueSpan = Math.max(yMax - yMin, 0.0001);
  const timeSpan = Math.max(xMax - xMin, 1);

  const seriesModel = normalizedSeries.map((item) => {
    const normalizedPoints = item.points.map((point) => {
      const x = xMin === xMax
        ? leftPadding + innerWidth / 2
        : leftPadding + ((point.timestampMs - xMin) / timeSpan) * innerWidth;
      const percent = item.points[0].price === 0 ? 0 : ((point.price - item.points[0].price) / item.points[0].price) * 100;
      const y = topPadding + (1 - (percent - yMin) / valueSpan) * innerHeight;

      return {
        timestampMs: point.timestampMs,
        x,
        y,
        percent,
      };
    });

    return {
      symbol: item.symbol,
      name: item.name,
      color: item.color,
      latestPrice: item.latestPrice,
      latestPercent: item.latestPercent,
      linePath: buildLinePath(normalizedPoints),
      points: normalizedPoints,
    };
  });

  const xLabels = [
    { label: formatLabel(xMin, rangeLabel), x: leftPadding },
    { label: formatLabel(xMin + timeSpan / 2, rangeLabel), x: leftPadding + innerWidth / 2 },
    { label: formatLabel(xMax, rangeLabel), x: leftPadding + innerWidth },
  ].filter((item, index, all) => item.label && all.findIndex((candidate) => candidate.label === item.label) === index);

  const yLabels = [
    { label: `${yMax.toFixed(1)}%`, y: topPadding },
    { label: `${((yMin + yMax) / 2).toFixed(1)}%`, y: topPadding + innerHeight / 2 },
    { label: `${yMin.toFixed(1)}%`, y: topPadding + innerHeight },
  ];

  return {
    chartWidth,
    chartHeight,
    leftPadding,
    rightPadding,
    topPadding,
    bottomPadding,
    yMin,
    yMax,
    xLabels,
    yLabels,
    series: seriesModel,
  };
};

export default function CombinedStocksChart({ rangeLabel = '1D', series }: CombinedStocksChartProps) {
  const [containerWidth, setContainerWidth] = useState(320);
  const [remoteSeries, setRemoteSeries] = useState<CombinedStockSeries[] | null>(null);
  const [isLoading, setIsLoading] = useState(!series);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (series) {
      setRemoteSeries(series);
      setIsLoading(false);
      setError(null);
      return;
    }

    if (typeof fetch !== 'function' || process.env.JEST_WORKER_ID) {
      setIsLoading(false);
      setRemoteSeries(null);
      setError(null);
      return;
    }

    let cancelled = false;

    const loadSeries = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const pricesResponse = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.STOCK_PRICES}`);
        if (!pricesResponse.ok) {
          throw new Error('Unable to load combined stock data.');
        }

        const snapshots = (await pricesResponse.json()) as Array<{
          symbol?: string;
          name?: string;
          lastUpdated?: string;
          price?: number;
        }>;

        const symbols = snapshots
          .map((item) => (typeof item.symbol === 'string' ? item.symbol.toUpperCase() : null))
          .filter((symbol): symbol is string => Boolean(symbol));

        const historyResults = await Promise.allSettled(
          symbols.map(async (symbol) => {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.STOCK_HISTORY(symbol, rangeLabel)}`);
            if (!response.ok) {
              throw new Error(`Failed to load history for ${symbol}`);
            }

            const points = (await response.json()) as CombinedStockSeriesPoint[];
            const snapshot = snapshots.find((item) => item.symbol?.toUpperCase() === symbol);
            return {
              symbol,
              name: snapshot?.name ?? symbol,
              points: Array.isArray(points) && points.length > 0
                ? points
                : snapshot?.price && snapshot.lastUpdated
                  ? [{ timestamp: snapshot.lastUpdated, price: snapshot.price }]
                  : [],
            } satisfies CombinedStockSeries;
          }),
        );

        if (cancelled) {
          return;
        }

        const resolved = historyResults
          .filter((result): result is PromiseFulfilledResult<CombinedStockSeries> => result.status === 'fulfilled')
          .map((result) => result.value)
          .filter((item) => item.points.length > 0);

        if (!resolved.length) {
          throw new Error('No combined stock history is available right now.');
        }

        setRemoteSeries(resolved);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load combined stock chart.');
          setRemoteSeries(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadSeries();

    return () => {
      cancelled = true;
    };
  }, [rangeLabel, series]);

  const model = useMemo(
    () => buildCombinedStocksChartModel(remoteSeries ?? series ?? [], rangeLabel, Math.max(260, containerWidth), 220),
    [containerWidth, rangeLabel, remoteSeries, series],
  );

  if (isLoading) {
    return (
      <View className="rounded-lg border border-border bg-background-secondary p-4">
        <Text className="text-sm text-text-secondary">Loading combined stock performance…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="rounded-lg border border-border bg-background-secondary p-4">
        <Text className="text-sm text-danger">Unable to load combined chart: {error}</Text>
      </View>
    );
  }

  if (!model || model.series.length === 0) {
    return (
      <View className="rounded-lg border border-border bg-background-secondary p-4">
        <Text className="text-sm text-text-secondary">Combined chart will appear once stock history is available.</Text>
      </View>
    );
  }

  const averageChange = model.series.reduce((total, item) => total + item.latestPercent, 0) / model.series.length;

  return (
    <View
      className="rounded-lg border border-border bg-background-secondary p-3"
      onLayout={(e) => {
        const nextWidth = Math.max(260, Math.floor(e.nativeEvent.layout.width - 16));
        if (nextWidth !== containerWidth) {
          setContainerWidth(nextWidth);
        }
      }}
    >
      <View className="mb-2 flex-row items-end justify-between">
        <View>
          <Text className="text-xs text-text-secondary">All stocks • {rangeLabel}</Text>
          <Text className="text-lg font-bold text-text">Relative performance</Text>
        </View>
        <Text style={{ color: averageChange >= 0 ? '#10B981' : '#EF4444' }}>
          {averageChange >= 0 ? '+' : ''}{averageChange.toFixed(2)}%
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
        <View style={{ width: model.leftPadding, paddingRight: 6, justifyContent: 'space-between' }}>
          {model.yLabels.map((item) => (
            <Text
              key={`${item.label}-${item.y}`}
              style={{ fontSize: 8, color: '#6B7280', textAlign: 'right', lineHeight: 9 }}
            >
              {item.label}
            </Text>
          ))}
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 4 }}>
            <Svg width={model.chartWidth} height={model.chartHeight}>
              <Defs>
                <LinearGradient id="combined-stock-grid" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#93C5FD" stopOpacity={0.18} />
                  <Stop offset="100%" stopColor="#93C5FD" stopOpacity={0.02} />
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

              {model.series.map((item) => (
                <React.Fragment key={item.symbol}>
                  <Path
                    d={item.linePath}
                    stroke={item.color}
                    strokeWidth={2.5}
                    fill="none"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {item.points.length > 0 && (
                    <Circle
                      cx={item.points[item.points.length - 1].x}
                      cy={item.points[item.points.length - 1].y}
                      r={2.8}
                      fill={item.color}
                    />
                  )}
                </React.Fragment>
              ))}
            </Svg>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 1, paddingRight: 1 }}>
            {model.xLabels.map((item) => (
              <Text key={`${item.label}-${item.x}`} style={{ fontSize: 8, color: '#6B7280' }} numberOfLines={1}>
                {item.label}
              </Text>
            ))}
          </View>
        </View>
      </View>

      <View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {model.series.map((item) => (
          <View
            key={item.symbol}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: '#fff',
              borderWidth: 1,
              borderColor: '#E5E7EB',
            }}
          >
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.color }} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#1F2937' }}>{item.symbol}</Text>
            <Text style={{ fontSize: 12, color: item.latestPercent >= 0 ? '#10B981' : '#EF4444' }}>
              {item.latestPercent >= 0 ? '+' : ''}{item.latestPercent.toFixed(2)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}