type NotificationRouteName = 'Home' | 'Watchlist' | 'Alerts' | 'Settings' | 'StockDetail';

type NotificationRoute =
  | { name: 'Home' | 'Watchlist' | 'Alerts' | 'Settings'; params?: undefined }
  | { name: 'StockDetail'; params: { symbol: string; name?: string } };

export interface NotificationResponseLike {
  notification?: {
    request?: {
      content?: {
        data?: unknown;
      };
    };
  };
}

export interface NotificationNavigationAdapter {
  isReady: () => boolean;
  navigate: (name: NotificationRouteName, params?: Record<string, unknown>) => void;
}

const ALLOWED_ROUTES: ReadonlySet<NotificationRouteName> = new Set([
  'Home',
  'Watchlist',
  'Alerts',
  'Settings',
  'StockDetail',
]);

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const readString = (value: unknown): string | undefined => (
  typeof value === 'string' && value.trim() ? value.trim() : undefined
);

export const resolveNotificationRoute = (data: unknown): NotificationRoute | null => {
  if (!isRecord(data)) {
    return null;
  }

  const requestedRoute = readString(data.route) ?? readString(data.screen) ?? readString(data.target);
  const symbol = readString(data.symbol) ?? readString(data.stockSymbol);
  const name = readString(data.name);

  if (requestedRoute) {
    if (!ALLOWED_ROUTES.has(requestedRoute as NotificationRouteName)) {
      return null;
    }

    if (requestedRoute === 'StockDetail') {
      if (!symbol) {
        return null;
      }

      return {
        name: 'StockDetail',
        params: name ? { symbol, name } : { symbol },
      };
    }

    return { name: requestedRoute as Exclude<NotificationRouteName, 'StockDetail'> };
  }

  if (symbol) {
    return {
      name: 'StockDetail',
      params: name ? { symbol, name } : { symbol },
    };
  }

  return null;
};

export class NotificationRouter {
  private pendingRoute: NotificationRoute | null = null;

  constructor(private readonly navigation: NotificationNavigationAdapter) {}

  handleResponse(response: NotificationResponseLike | null | undefined): void {
    const route = resolveNotificationRoute(response?.notification?.request?.content?.data);
    if (!route) {
      return;
    }

    if (this.navigation.isReady()) {
      this.navigation.navigate(route.name, route.params);
      return;
    }

    this.pendingRoute = route;
  }

  handleReady(): void {
    if (!this.pendingRoute || !this.navigation.isReady()) {
      return;
    }

    const route = this.pendingRoute;
    this.pendingRoute = null;
    this.navigation.navigate(route.name, route.params);
  }
}
