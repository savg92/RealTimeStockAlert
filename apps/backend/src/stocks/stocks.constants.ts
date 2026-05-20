export const WATCHLIST_STOCKS = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corp.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
] as const;

export type StockHistoryRange = '1H' | '5H' | '1D' | '5D' | '1M' | '3M' | '1Y' | '5Y' | 'ALL';

export interface StockDetailSnapshot {
  high52w: number;
  low52w: number;
  marketCap: string;
  volume: string;
  pe: number;
  change?: number;
  changePercent?: number;
}

export const STOCK_DETAILS_BASE: Record<string, StockDetailSnapshot> = {
  AAPL: { high52w: 245.89, low52w: 165.23, marketCap: '3.2T', volume: '52.4M', pe: 28.5 },
  MSFT: { high52w: 445.23, low52w: 310.11, marketCap: '2.8T', volume: '24.8M', pe: 32.1 },
  GOOGL: { high52w: 198.34, low52w: 102.21, marketCap: '1.7T', volume: '18.2M', pe: 24.7 },
  AMZN: { high52w: 188.45, low52w: 101.26, marketCap: '1.9T', volume: '41.3M', pe: 45.2 },
  TSLA: { high52w: 299.29, low52w: 138.8, marketCap: '760B', volume: '93.5M', pe: 58.9 },
};
