import { describe, expect, it } from 'bun:test';
import { version } from '../src/index';

describe('shared package exports', () => {
  it('exposes the package version constant', () => {
    expect(version).toBe('0.1.0');
  });
});
