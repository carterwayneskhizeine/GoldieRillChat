import { describe, it, expect } from 'vitest';
import {
  formatMessageTime,
  estimateTokens,
  shouldCollapseMessage,
  generateMessageFileName,
} from '../utils/messageUtils';

describe('formatMessageTime', () => {
  it('formats a timestamp into the expected pattern', () => {
    const result = formatMessageTime('2024-06-15T10:30:45Z');
    expect(result).toMatch(/^\d{2}[A-Za-z]{3}\d{2}_\d{6}$/);
  });
});

describe('estimateTokens', () => {
  it('estimates tokens as ceil(length / 4)', () => {
    expect(estimateTokens('hello')).toBe(2); // ceil(5/4)
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('abcd')).toBe(1);
  });
});

describe('shouldCollapseMessage', () => {
  it('returns false for empty content', () => {
    expect(shouldCollapseMessage({ content: '' })).toBe(false);
    expect(shouldCollapseMessage({ content: null })).toBe(false);
  });

  it('returns true when content has more than 6 lines', () => {
    const longContent = Array(8).fill('line').join('\n');
    expect(shouldCollapseMessage({ content: longContent })).toBe(true);
  });

  it('returns true when content exceeds 300 characters', () => {
    const longContent = 'a'.repeat(301);
    expect(shouldCollapseMessage({ content: longContent })).toBe(true);
  });

  it('returns false for short single-line content', () => {
    expect(shouldCollapseMessage({ content: 'short message' })).toBe(false);
  });
});

describe('generateMessageFileName', () => {
  it('includes model and tokens when provided', () => {
    const msg = { timestamp: '2024-01-01T00:00:00Z' };
    const result = generateMessageFileName(msg, 'gpt-4', 100);
    expect(result).toContain('gpt-4');
    expect(result).toContain('100');
  });

  it('omits model/tokens when not provided', () => {
    const msg = { timestamp: '2024-01-01T00:00:00Z' };
    const result = generateMessageFileName(msg);
    expect(result).not.toContain('•');
  });
});
