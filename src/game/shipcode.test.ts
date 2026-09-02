import { describe, expect, it } from 'vitest';
import { MAX_SEED, decodeShipCode, encodeShipCode, shipFromSearch, shipLink } from './shipcode';

describe('ship codes', () => {
  it('encodes the seed in base 36 behind the hull prefix, with + for New Game+', () => {
    expect(encodeShipCode(0)).toBe('CMR-0');
    expect(encodeShipCode(177)).toBe('CMR-4X');
    expect(encodeShipCode(MAX_SEED)).toBe('CMR-ZIK0ZI');
    expect(encodeShipCode(177, true)).toBe('CMR-4X+');
  });

  it('round-trips every code; prefix optional, case-insensitive, whitespace ignored', () => {
    for (const seed of [0, 1, 177, 4096, MAX_SEED]) {
      expect(decodeShipCode(encodeShipCode(seed))).toEqual({ seed, ngPlus: false });
      expect(decodeShipCode(encodeShipCode(seed, true))).toEqual({ seed, ngPlus: true });
    }
    expect(decodeShipCode('4x')).toEqual({ seed: 177, ngPlus: false });
    expect(decodeShipCode('  cmr-4x+ ')).toEqual({ seed: 177, ngPlus: true });
  });

  it('rejects junk, negatives, floats and seeds past the PRNG range', () => {
    for (const bad of ['', 'CMR-', '+', 'CMR-4X++', 'CMR--1', 'CMR-4.5', 'CMR-ZIK0ZJ', 'CMR-ZZZZZZZZ', 'hello world']) {
      expect(decodeShipCode(bad)).toBeNull();
    }
  });

  it('reads ?ship first, then ?seed with &plus=1, and reports an unreadable invite', () => {
    expect(shipFromSearch('')).toBeNull();
    expect(shipFromSearch('?foo=1')).toBeNull();
    expect(shipFromSearch('?ship=CMR-4X')).toEqual({ ok: true, seed: 177, ngPlus: false });
    expect(shipFromSearch('?ship=CMR-4X%2B')).toEqual({ ok: true, seed: 177, ngPlus: true });
    expect(shipFromSearch('?ship=CMR-4X+')).toEqual({ ok: true, seed: 177, ngPlus: true }); // a literal + reaches us as a space
    expect(shipFromSearch('?ship=CMR-4X&seed=5')).toEqual({ ok: true, seed: 177, ngPlus: false });
    expect(shipFromSearch('?seed=177')).toEqual({ ok: true, seed: 177, ngPlus: false });
    expect(shipFromSearch('?seed=177&plus=1')).toEqual({ ok: true, seed: 177, ngPlus: true });
    expect(shipFromSearch('?ship=nope!')).toEqual({ ok: false });
    expect(shipFromSearch('?seed=-3')).toEqual({ ok: false });
    expect(shipFromSearch('?seed=99999999999')).toEqual({ ok: false });
  });

  it('builds a link the title screen reads back', () => {
    const link = shipLink('https://derelict-game.vercel.app', 177, true);
    expect(link).toBe('https://derelict-game.vercel.app/?ship=CMR-4X%2B');
    expect(shipFromSearch(new URL(link).search)).toEqual({ ok: true, seed: 177, ngPlus: true });
  });
});
