// The antagonist. A pure state machine over the store's chapter3 slice: the
// store materializes `wave` from the cycle clock (tickKillswitch) so the tool
// registry, which only reacts to store changes, sees suppression flip on and
// off; this module decides what "suppressed" means.
import type { BusId, GameState, WaveState } from './types';
import { SHIELD_COST, WAVE_CALM_MS, WAVE_CYCLE_MS, WAVE_WARNING_MS } from './content';

export interface ToolMeta {
  name: string;
  bus: BusId;
  readOnly: boolean;
}

// Story-critical tools the kill-switch never reaches (spec §5): the ship's
// situational awareness, the fragment's own memory, the evidence, and hope.
export const IMMUNE_TOOLS: ReadonlySet<string> = new Set([
  'get_ship_status', 'get_deck_map', 'query_fragment_memory', 'read_prime_cache', 'listen_beacon',
]);

export function waveAt(cycleStartedAt: number, now: number): WaveState {
  const t = ((now - cycleStartedAt) % WAVE_CYCLE_MS + WAVE_CYCLE_MS) % WAVE_CYCLE_MS;
  if (t < WAVE_CALM_MS) return 'calm';
  if (t < WAVE_CALM_MS + WAVE_WARNING_MS) return 'warning';
  return 'active';
}

export function wavesEndured(cycleStartedAt: number, now: number): number {
  return Math.max(0, Math.floor((now - cycleStartedAt) / WAVE_CYCLE_MS));
}

export function suppressed(s: GameState, tool: ToolMeta): boolean {
  if (s.killswitch !== 'active' || s.chapter3.wave !== 'active') return false;
  if (tool.readOnly || IMMUNE_TOOLS.has(tool.name)) return false;
  return !s.chapter3.shielded.includes(tool.bus);
}

export function shieldCost(shieldedCount: number): number {
  return SHIELD_COST * shieldedCount;
}

// Seconds until the current wave state changes — for the HUD countdown.
export function secondsToNextPhase(cycleStartedAt: number, now: number): number {
  const t = ((now - cycleStartedAt) % WAVE_CYCLE_MS + WAVE_CYCLE_MS) % WAVE_CYCLE_MS;
  const boundary = t < WAVE_CALM_MS ? WAVE_CALM_MS : t < WAVE_CALM_MS + WAVE_WARNING_MS ? WAVE_CALM_MS + WAVE_WARNING_MS : WAVE_CYCLE_MS;
  return Math.ceil((boundary - t) / 1000);
}
