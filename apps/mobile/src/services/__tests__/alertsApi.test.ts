import { API_CONFIG, API_ENDPOINTS } from '../../utils/api';
import { createAlert, deleteAlert, fetchAlerts } from '../alertsApi';

describe('alertsApi', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('fetches alerts from backend endpoint with bearer auth', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([]),
    });

    await fetchAlerts('token-123');

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_CONFIG.BASE_URL}${API_ENDPOINTS.ALERTS}`,
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123',
        }),
      }),
    );
  });

  it('creates an alert via backend endpoint', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        id: 'a1',
        symbol: 'AAPL',
        price: 200,
        condition: 'above',
        threshold: 200,
        isActive: true,
        createdAt: '2026-05-15T10:00:00.000Z',
      }),
    });

    await createAlert(
      { symbol: 'AAPL', price: 200, condition: 'above', threshold: 200 },
      'token-123',
    );

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_CONFIG.BASE_URL}${API_ENDPOINTS.ALERTS}`,
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('deletes an alert via backend endpoint', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ count: 1 }),
    });

    await deleteAlert('alert-1', 'token-123');

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_CONFIG.BASE_URL}${API_ENDPOINTS.ALERT_BY_ID('alert-1')}`,
      expect.objectContaining({
        method: 'DELETE',
      }),
    );
  });
});
