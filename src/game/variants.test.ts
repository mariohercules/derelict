import { describe, expect, it } from 'vitest';
import { DRAWINGS, tiersFor, variantFor, variantSecretsFor } from './variants';
import type { VariantRoom } from './variants';
import { secretsFor } from './secrets';

const ROOMS: VariantRoom[] = ['cryo_bay', 'engineering', 'bridge', 'crew_quarters', 'hydroponics', 'cargo_bay'];

// Frozen from the Plan F build (variantSecretsFor(8) before Plan F2 appended
// keyDrawing/stackSlots). If this fails, a draw landed before driftFix — move it after.
const FROZEN_VARIANT_8 = {
  cableBuses: [3, 1, 2],
  gearTeeth: { target: 16, decoys: [13, 28] },
  coilPhases: [0, 7, 3],
  driftFix: ['57', '16', '38'],
};

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

  it('keeps every chapter-1 variant draw of a seeded ship unchanged', () => {
    const v = variantSecretsFor(8);
    expect({ cableBuses: v.cableBuses, gearTeeth: v.gearTeeth, coilPhases: v.coilPhases, driftFix: v.driftFix }).toEqual(FROZEN_VARIANT_8);
  });

  it('draws a key drawing and two decoy stacks that never hide the quarantine slot', () => {
    for (let seed = 0; seed <= 400; seed++) {
      const v = variantSecretsFor(seed);
      expect(v.keyDrawing).toBeGreaterThanOrEqual(0);
      expect(v.keyDrawing).toBeLessThan(DRAWINGS.length);
      const q = secretsFor(seed).quarantineSlot;
      const qIndex = q.row * 3 + q.col;
      expect(v.stackSlots).toHaveLength(2);
      expect(v.stackSlots[0]).not.toBe(v.stackSlots[1]);
      for (const i of v.stackSlots) {
        expect(i).toBeGreaterThanOrEqual(0);
        expect(i).toBeLessThanOrEqual(8);
        expect(i).not.toBe(qIndex);
      }
    }
  });
});

describe('tiersFor', () => {
  it('is nine single-tier slots on every unstacked ship, the classic ship included', () => {
    expect(tiersFor(0)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1]);
    for (let seed = 1; seed <= 200; seed++) {
      if (variantFor(seed, 'cargo_bay') === 0) expect(tiersFor(seed)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1]);
    }
  });

  it('stacks exactly the quarantine slot and the two decoys on a stacked ship', () => {
    for (let seed = 1; seed <= 200; seed++) {
      if (variantFor(seed, 'cargo_bay') !== 1) continue;
      const tiers = tiersFor(seed);
      const q = secretsFor(seed).quarantineSlot;
      const expected = new Set([q.row * 3 + q.col, ...variantSecretsFor(seed).stackSlots]);
      expect(tiers).toHaveLength(9);
      tiers.forEach((tier, i) => expect(tier).toBe(expected.has(i) ? 2 : 1));
    }
  });
});
