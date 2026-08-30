import { describe, expect, it } from 'vitest';
import { variantFor, variantSecretsFor } from './variants';
import type { VariantRoom } from './variants';

const ROOMS: VariantRoom[] = ['cryo_bay', 'engineering', 'bridge'];

describe('variantFor', () => {
  it('is pure and deterministic', () => {
    for (const room of ROOMS) {
      expect(variantFor(777, room)).toBe(variantFor(777, room));
    }
  });

  it('the classic ship rolls variant 0 in every room, always', () => {
    for (const room of ROOMS) expect(variantFor(0, room)).toBe(0);
  });

  it('both variants occur, roughly evenly, over 400 seeds', () => {
    for (const room of ROOMS) {
      let ones = 0;
      for (let seed = 1; seed <= 400; seed++) ones += variantFor(seed, room);
      expect(ones).toBeGreaterThan(120);
      expect(ones).toBeLessThan(280);
    }
  });

  it('rooms roll independently: some ship mixes variants', () => {
    let mixed = false;
    for (let seed = 1; seed <= 100 && !mixed; seed++) {
      const v = ROOMS.map((r) => variantFor(seed, r));
      mixed = new Set(v).size > 1;
    }
    expect(mixed).toBe(true);
  });
});

describe('variantSecretsFor', () => {
  it('is well-formed for every seed', () => {
    for (let seed = 0; seed <= 400; seed++) {
      const v = variantSecretsFor(seed);
      expect([...v.cableBuses].sort()).toEqual([1, 2, 3]);
      const teeth = [v.gearTeeth.target, ...v.gearTeeth.decoys];
      expect(new Set(teeth).size).toBe(3);
      for (const t of teeth) {
        expect(t).toBeGreaterThanOrEqual(13);
        expect(t).toBeLessThanOrEqual(29);
      }
      for (const p of v.coilPhases) {
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(11);
      }
      for (const c of v.driftFix) expect(c).toMatch(/^\d{2}$/);
    }
  });

  it('is deterministic', () => {
    expect(variantSecretsFor(1234)).toEqual(variantSecretsFor(1234));
  });
});
