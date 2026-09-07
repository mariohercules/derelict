import { describe, expect, it } from 'vitest';
import { normalizeAuthCode } from './authcode';

describe('normalizeAuthCode — the PIN is digits, not a format', () => {
  it('keeps a clean four-digit PIN and restores the leading zero a number loses', () => {
    expect(normalizeAuthCode('0407')).toBe('0407');
    expect(normalizeAuthCode(407)).toBe('0407');
    expect(normalizeAuthCode(1111)).toBe('1111');
  });

  it('reads day and month written as two groups, padding each', () => {
    expect(normalizeAuthCode('04/07')).toBe('0407');
    expect(normalizeAuthCode('04-07')).toBe('0407');
    expect(normalizeAuthCode('04 07')).toBe('0407');
    expect(normalizeAuthCode('4/7')).toBe('0407');
    expect(normalizeAuthCode('11.11')).toBe('1111');
  });

  it('ignores whitespace, punctuation and words around the digits', () => {
    expect(normalizeAuthCode(' 0407 ')).toBe('0407');
    expect(normalizeAuthCode('0407.')).toBe('0407');
    expect(normalizeAuthCode('code 0407')).toBe('0407');
    expect(normalizeAuthCode('Amara 0407')).toBe('0407');
  });

  it('is null with no digits at all, and passes longer strings through for the door to refuse', () => {
    expect(normalizeAuthCode(undefined)).toBeNull();
    expect(normalizeAuthCode(null)).toBeNull();
    expect(normalizeAuthCode('')).toBeNull();
    expect(normalizeAuthCode('Amara')).toBeNull();
    expect(normalizeAuthCode('04072098')).toBe('04072098');
    expect(normalizeAuthCode('04/07/2098')).toBe('04072098');
  });
});
