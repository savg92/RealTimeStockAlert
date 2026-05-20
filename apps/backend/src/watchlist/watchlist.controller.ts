import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WatchlistService } from './watchlist.service';

// NOTE: For local/dev testing the watchlist endpoints are currently unguarded so
// they can be exercised without a full Firebase auth flow while debugging.
// This should be restored to @UseGuards(AuthGuard) before deploying to staging/production.

@ApiTags('watchlist')
@Controller('watchlist')
export class WatchlistController {
  constructor(private readonly watchlistService: WatchlistService) {}

  @Post()
  @ApiOperation({ summary: "Add an item to the user's watchlist (dev only)" })
  @ApiCreatedResponse({ description: 'Item added' })
  async add(@Body() body: { symbol: string; name?: string }) {
    // In dev we map requests to a dev user created by the AuthGuard previously.
    // Use a stable dev user id for persistence.
    const devUserId = process.env.DEV_USER_ID ?? 'dev-user-1';
    return this.watchlistService.addItem(devUserId, body.symbol, body.name);
  }

  @Get()
  @ApiOperation({ summary: "List watchlist items for the user's watchlist (dev only)" })
  @ApiOkResponse({ description: 'User watchlist items' })
  async list() {
    const devUserId = process.env.DEV_USER_ID ?? 'dev-user-1';
    return this.watchlistService.listForUser(devUserId);
  }

  @Delete(':symbol')
  @ApiOperation({ summary: 'Remove an item from watchlist (dev only)' })
  @ApiOkResponse({ description: 'Deleted' })
  async remove(@Param('symbol') symbol: string) {
    const devUserId = process.env.DEV_USER_ID ?? 'dev-user-1';
    return this.watchlistService.removeItem(devUserId, symbol);
  }
}
