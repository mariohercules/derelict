import { describe, expect, it } from 'vitest';
import { CLASSIC_SEED, randomSeed, secretsFor } from './secrets';
import {
  AUTH_CODE, BREAKER_SEQUENCE, GAUGE_PRESSURES, LAUNCH_AUTH, STAR_FIX, VALVE_TARGETS,
} from './content';

describe('secretsFor', () => {
  it('seed 0 is the classic ship — every original answer, unchanged', () => {
    const s = secretsFor(CLASSIC_SEED);
    expect(s.authCode).toBe(AUTH_CODE);
    expect(s.birthday).toEqual({ day: 4, month: 7 });
    expect(s.breakerSequence).toEqual(BREAKER_SEQUENCE);
    expect(s.gaugePressures).toEqual(GAUGE_PRESSURES);
    expect(s.valveTargets).toEqual(VALVE_TARGETS);
    expect(s.starFix).toEqual(STAR_FIX);
    expect(s.launchAuth).toBe(LAUNCH_AUTH);
  });

  it('is deterministic for a given seed', () => {
    expect(secretsFor(12345)).toEqual(secretsFor(12345));
  });

  it('produces different ships for different seeds', () => {
    expect(secretsFor(1)).not.toEqual(secretsFor(2));
  });

  it('keeps every secret inside the puzzle rules, across many seeds', () => {
    for (let seed = 1; seed <= 400; seed++) {
      const s = secretsFor(seed);
      expect(s.authCode).toMatch(/^\d{4}$/);
      expect(s.birthday.day).toBeGreaterThanOrEqual(1);
      expect(s.birthday.day).toBeLessThanOrEqual(28);
      expect(s.birthday.month).toBeGreaterThanOrEqual(1);
      expect(s.birthday.month).toBeLessThanOrEqual(12);
      expect(s.authCode).toBe(
        `${String(s.birthday.day).padStart(2, '0')}${String(s.birthday.month).padStart(2, '0')}`
      );
      expect([...s.breakerSequence].sort()).toEqual(['A', 'B', 'C']);
      for (let i = 0; i < 3; i++) {
        expect(Number.isInteger(s.gaugePressures[i])).toBe(true);
        expect(s.gaugePressures[i]).toBeGreaterThanOrEqual(20);
        expect(s.gaugePressures[i]).toBeLessThanOrEqual(110);
        expect(s.valveTargets[i]).toBe(Math.floor(s.gaugePressures[i] / 12));
      }
      expect(new Set(s.starFix).size).toBe(3);
      expect(s.starFix.every((g) => /^[A-Z]{3}$/.test(g))).toBe(true);
      expect(s.launchAuth).toMatch(/^OVERRIDE-[A-Z]+$/);
    }
  });

  it('randomSeed never returns the classic seed', () => {
    for (let i = 0; i < 50; i++) {
      const seed = randomSeed();
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).not.toBe(CLASSIC_SEED);
    }
  });
});
