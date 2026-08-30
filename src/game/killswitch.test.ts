import { describe, expect, it } from 'vitest';
import { IMMUNE_TOOLS, secondsToNextPhase, shieldCost, suppressed, waveAt, wavesEndured } from './killswitch';
import { initialState } from './store';
import { SHIELD_COST, WAVE_ACTIVE_MS, WAVE_CALM_MS, WAVE_CYCLE_MS, WAVE_WARNING_MS } from './content';
import type { GameState } from './types';

const T0 = 1_000_000;

describe('waveAt', () => {
  it('cycles calm → warning → active → calm on the documented timings', () => {
    expect(waveAt(T0, T0)).toBe('calm');
    expect(waveAt(T0, T0 + WAVE_CALM_MS - 1)).toBe('calm');
    expect(waveAt(T0, T0 + WAVE_CALM_MS)).toBe('warning');
    expect(waveAt(T0, T0 + WAVE_CALM_MS + WAVE_WARNING_MS - 1)).toBe('warning');
    expect(waveAt(T0, T0 + WAVE_CALM_MS + WAVE_WARNING_MS)).toBe('active');
    expect(waveAt(T0, T0 + WAVE_CALM_MS + WAVE_WARNING_MS + WAVE_ACTIVE_MS - 1)).toBe('active');
    expect(waveAt(T0, T0 + WAVE_CYCLE_MS)).toBe('calm');
    expect(WAVE_CYCLE_MS).toBe(WAVE_CALM_MS + WAVE_WARNING_MS + WAVE_ACTIVE_MS);
  });

  it('counts endured waves per completed cycle', () => {
    expect(wavesEndured(T0, T0)).toBe(0);
    expect(wavesEndured(T0, T0 + WAVE_CYCLE_MS - 1)).toBe(0);
    expect(wavesEndured(T0, T0 + WAVE_CYCLE_MS)).toBe(1);
    expect(wavesEndured(T0, T0 + 3 * WAVE_CYCLE_MS + 5)).toBe(3);
  });
});

describe('secondsToNextPhase', () => {
  it('counts down to the calm→warning boundary', () => {
    expect(secondsToNextPhase(T0, T0)).toBe(WAVE_CALM_MS / 1000);
    expect(secondsToNextPhase(T0, T0 + WAVE_CALM_MS - 1)).toBe(1);
  });

  it('counts down to the warning→active boundary', () => {
    expect(secondsToNextPhase(T0, T0 + WAVE_CALM_MS)).toBe(WAVE_WARNING_MS / 1000);
    expect(secondsToNextPhase(T0, T0 + WAVE_CALM_MS + WAVE_WARNING_MS - 1)).toBe(1);
  });

  it('counts down to the active→calm boundary that closes the cycle', () => {
    expect(secondsToNextPhase(T0, T0 + WAVE_CALM_MS + WAVE_WARNING_MS)).toBe(WAVE_ACTIVE_MS / 1000);
    expect(secondsToNextPhase(T0, T0 + WAVE_CYCLE_MS - 1)).toBe(1);
  });

  it('wraps into the next cycle', () => {
    expect(secondsToNextPhase(T0, T0 + WAVE_CYCLE_MS)).toBe(WAVE_CALM_MS / 1000);
    expect(secondsToNextPhase(T0, T0 + 3 * WAVE_CYCLE_MS)).toBe(WAVE_CALM_MS / 1000);
  });
});

describe('suppressed', () => {
  function active(): GameState {
    const s = initialState(0);
    return { ...s, chapter: 3, killswitch: 'active', chapter3: { ...s.chapter3, wave: 'active' } };
  }
  const mutating = { name: 'route_power', bus: 'nav' as const, readOnly: false };

  it('suppresses a mutating tool on an unshielded bus during an active wave only', () => {
    expect(suppressed(active(), mutating)).toBe(true);
    const warning = active();
    warning.chapter3 = { ...warning.chapter3, wave: 'warning' };
    expect(suppressed(warning, mutating)).toBe(false);
    const stirring = { ...active(), killswitch: 'stirring' as const };
    expect(suppressed(stirring, mutating)).toBe(false);
    const contained = { ...active(), killswitch: 'contained' as const };
    expect(suppressed(contained, mutating)).toBe(false);
  });

  it('never suppresses read-only or story-critical tools', () => {
    expect(suppressed(active(), { name: 'read_crew_logs', bus: 'archive', readOnly: true })).toBe(false);
    for (const name of IMMUNE_TOOLS) expect(suppressed(active(), { name, bus: 'core', readOnly: false })).toBe(false);
  });

  it('spares a shielded bus', () => {
    const s = active();
    s.chapter3 = { ...s.chapter3, shielded: ['nav'] };
    expect(suppressed(s, mutating)).toBe(false);
    expect(suppressed(s, { name: 'merge_fragment', bus: 'core', readOnly: false })).toBe(true);
  });

  it('prices shielding linearly', () => {
    expect(shieldCost(1)).toBe(SHIELD_COST);
    expect(shieldCost(4)).toBe(4 * SHIELD_COST);
  });
});
