import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags, ApiParam, ApiQuery } from '@nestjs/swagger';
import { StocksService, type StockHistoryPoint, type StockSnapshot } from './stocks.service';
import type { StockDetailSnapshot } from './stocks.constants';

@ApiTags('stocks')
@Controller('stocks')
export class StocksController {
  constructor(private readonly stocksService: StocksService) {}

  @Get('prices')
  @ApiOperation({ summary: 'Get current watchlist prices' })
  @ApiOkResponse({ description: 'Current watchlist prices.', type: [Object] })
  getPrices(): Promise<StockSnapshot[]> {
    return this.stocksService.getWatchlistSnapshot();
  }

  @Get(':symbol')
  @ApiOperation({ summary: 'Get a single stock snapshot by symbol' })
  @ApiParam({ name: 'symbol', description: 'Stock symbol (e.g., AAPL)' })
  @ApiOkResponse({ description: 'Stock snapshot', type: Object })
  getStock(@Param('symbol') symbol: string): Promise<StockSnapshot> {
    return this.stocksService.getStockSnapshot(symbol);
  }

  @Get(':symbol/details')
  @ApiOperation({ summary: 'Get stock details by symbol' })
  @ApiParam({ name: 'symbol', description: 'Stock symbol (e.g., AAPL)' })
  @ApiOkResponse({ description: 'Stock detail snapshot', type: Object })
  getStockDetails(@Param('symbol') symbol: string): Promise<StockDetailSnapshot> {
    return this.stocksService.getStockDetails(symbol);
  }

  @Get(':symbol/history')
  @ApiOperation({ summary: 'Get stock history for a selected range' })
  @ApiParam({ name: 'symbol', description: 'Stock symbol (e.g., AAPL)' })
  @ApiQuery({
    name: 'range',
    required: true,
    enum: ['1H', '5H', '1D', '5D', '1M', '3M', '1Y', '5Y', 'ALL'],
  })
  @ApiOkResponse({ description: 'Historical chart points.', type: [Object] })
  getStockHistory(
    @Param('symbol') symbol: string,
    @Query('range') range: string = '1D',
  ): Promise<StockHistoryPoint[]> {
    return this.stocksService.getStockHistory(symbol, range);
  }
}
