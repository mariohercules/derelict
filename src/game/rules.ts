// The rules profile of a run. The classic profile IS the shipped game (its
// values are the content constants); New Game+ swaps in the plus profile.
// Everything that used to read a timing/cost constant reads rulesFor(state).
import type { GameState, RitualId } from './types';
import {
  BROADCAST_WINDOW_MS, LAUNCH_WINDOW_MS, RESTORE_WINDOW_MS, SHIELD_COST, STAY_WINDOW_MS,
  WAVE_ACTIVE_MS, WAVE_CALM_MS, WAVE_WARNING_MS,
} from './content';

export interface WaveCycle {
  calmMs: number;
  warningMs: number;
  activeMs: number;
}

export interface Rules {
  profile: 'classic' | 'plus';
  windows: Record<RitualId, number>;
  cycle: WaveCycle;
  wakeOn: 'lower_deck' | 'kestrel'; // when the kill-switch goes active
  shieldCost: number; // isolation power per shielded bus
}

export const CLASSIC_RULES: Rules = {
  profile: 'classic',
  windows: { launch: LAUNCH_WINDOW_MS, restore: RESTORE_WINDOW_MS, broadcast: BROADCAST_WINDOW_MS, stay: STAY_WINDOW_MS },
  cycle: { calmMs: WAVE_CALM_MS, warningMs: WAVE_WARNING_MS, activeMs: WAVE_ACTIVE_MS },
  wakeOn: 'lower_deck',
  shieldCost: SHIELD_COST,
};

export const PLUS_RULES: Rules = {
  profile: 'plus',
  windows: { launch: 30_000, restore: 40_000, broadcast: 40_000, stay: 40_000 },
  cycle: { calmMs: 20_000, warningMs: 8_000, activeMs: 25_000 },
  wakeOn: 'kestrel',
  shieldCost: 6,
};

export function rulesFor(s: Pick<GameState, 'ngPlus'>): Rules {
  return s.ngPlus ? PLUS_RULES : CLASSIC_RULES;
}

export function cycleMs(c: WaveCycle): number {
  return c.calmMs + c.warningMs + c.activeMs;
}
