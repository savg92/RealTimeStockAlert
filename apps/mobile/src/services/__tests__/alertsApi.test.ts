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
      json: jest.fn().mockResolvedValue([
        {
          id: 'a1',
          symbol: 'aapl',
          price: 200,
          condition: 'below',
          threshold: 200,
          isActive: true,
          createdAt: '2026-05-15T10:00:00.000Z',
          updatedAt: '2026-05-15T10:10:00.000Z',
        },
      ]),
    });

    await expect(fetchAlerts('token-123')).resolves.toEqual([
      expect.objectContaining({
        symbol: 'AAPL',
        condition: 'below',
      }),
    ]);

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

  it('returns backend error messages when fetch alerts fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({ message: 'Denied' }),
      statusText: 'Request failed',
    });

    await expect(fetchAlerts('token-123')).rejects.toThrow('Denied');
  });

  it('creates an alert via backend endpoint', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        id: 'a1',
        symbol: 'msft',
        price: 200,
        condition: 'sideways',
        threshold: 200,
        isActive: true,
        createdAt: '2026-05-15T10:00:00.000Z',
        updatedAt: '2026-05-15T10:05:00.000Z',
      }),
    });

    await expect(
      createAlert(
      { symbol: 'AAPL', price: 200, condition: 'above', threshold: 200 },
      'token-123',
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        symbol: 'MSFT',
        condition: 'above',
      }),
    );

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_CONFIG.BASE_URL}${API_ENDPOINTS.ALERTS}`,
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('normalizes created alerts and falls back to status text on parse failures', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: jest.fn().mockRejectedValue(new Error('invalid json')),
      statusText: 'Create failed',
    });

    await expect(
      createAlert({ symbol: 'msft', price: 250, condition: 'sideways' as never, threshold: 250 }, 'token-123'),
    ).rejects.toThrow('Create failed');
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

  it('reports delete errors from the backend', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({}),
      statusText: 'Delete failed',
    });

    await expect(deleteAlert('alert-1', 'token-123')).rejects.toThrow('Delete failed');
  });
});
