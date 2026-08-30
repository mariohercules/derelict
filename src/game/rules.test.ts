import { describe, expect, it } from 'vitest';
import { CLASSIC_RULES, PLUS_RULES, cycleMs, rulesFor } from './rules';
import { BROADCAST_WINDOW_MS, LAUNCH_WINDOW_MS, RESTORE_WINDOW_MS, SHIELD_COST, STAY_WINDOW_MS, WAVE_ACTIVE_MS, WAVE_CALM_MS, WAVE_WARNING_MS } from './content';

describe('rules profiles', () => {
  it('the classic profile is the shipped game, constant for constant', () => {
    expect(CLASSIC_RULES).toEqual({
      profile: 'classic',
      windows: { launch: LAUNCH_WINDOW_MS, restore: RESTORE_WINDOW_MS, broadcast: BROADCAST_WINDOW_MS, stay: STAY_WINDOW_MS },
      cycle: { calmMs: WAVE_CALM_MS, warningMs: WAVE_WARNING_MS, activeMs: WAVE_ACTIVE_MS },
      wakeOn: 'lower_deck',
      shieldCost: SHIELD_COST,
    });
    expect(cycleMs(CLASSIC_RULES.cycle)).toBe(60_000);
  });

  it('the plus profile is the spec table', () => {
    expect(PLUS_RULES).toEqual({
      profile: 'plus',
      windows: { launch: 30_000, restore: 40_000, broadcast: 40_000, stay: 40_000 },
      cycle: { calmMs: 20_000, warningMs: 8_000, activeMs: 25_000 },
      wakeOn: 'kestrel',
      shieldCost: 6,
    });
  });

  it('rulesFor picks by the ngPlus flag', () => {
    expect(rulesFor({ ngPlus: false }).profile).toBe('classic');
    expect(rulesFor({ ngPlus: true }).profile).toBe('plus');
  });
});
