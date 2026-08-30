// The antagonist. A pure state machine over the store's chapter3 slice: the
// store materializes `wave` from the cycle clock (tickKillswitch) so the tool
// registry, which only reacts to store changes, sees suppression flip on and
// off; this module decides what "suppressed" means.
import type { BusId, GameState, WaveState } from './types';
import { CLASSIC_RULES, cycleMs } from './rules';
import type { WaveCycle } from './rules';

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

export function waveAt(cycleStartedAt: number, now: number, cycle: WaveCycle = CLASSIC_RULES.cycle): WaveState {
  const total = cycleMs(cycle);
  const t = ((now - cycleStartedAt) % total + total) % total;
  if (t < cycle.calmMs) return 'calm';
  if (t < cycle.calmMs + cycle.warningMs) return 'warning';
  return 'active';
}

export function suppressed(s: GameState, tool: ToolMeta): boolean {
  if (s.killswitch !== 'active' || s.chapter3.wave !== 'active') return false;
  if (tool.readOnly || IMMUNE_TOOLS.has(tool.name)) return false;
  return !s.chapter3.shielded.includes(tool.bus);
}

export function shieldCost(shieldedCount: number, perBus: number = CLASSIC_RULES.shieldCost): number {
  return perBus * shieldedCount;
}

// Seconds until the current wave state changes — for the HUD countdown.
export function secondsToNextPhase(cycleStartedAt: number, now: number, cycle: WaveCycle = CLASSIC_RULES.cycle): number {
  const total = cycleMs(cycle);
  const t = ((now - cycleStartedAt) % total + total) % total;
  const boundary = t < cycle.calmMs ? cycle.calmMs : t < cycle.calmMs + cycle.warningMs ? cycle.calmMs + cycle.warningMs : total;
  return Math.ceil((boundary - t) / 1000);
}
