import { validateCreateAlertForm } from '../CreateAlertForm';

describe('validateCreateAlertForm', () => {
  it('returns validation error for missing symbol', () => {
    const result = validateCreateAlertForm('', '120');
    expect(result).toEqual({ error: 'Symbol is required.' });
  });

  it('returns validation error for invalid threshold', () => {
    const result = validateCreateAlertForm('AAPL', '-1');
    expect(result).toEqual({ error: 'Threshold must be a positive number.' });
  });

  it('returns normalized payload for valid form data', () => {
    const result = validateCreateAlertForm(' aapl ', '189.5');
    expect(result).toEqual({
      payload: {
        symbol: 'AAPL',
        threshold: 189.5,
      },
    });
  });
});
