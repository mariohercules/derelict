import type { BedState, GameState } from './types';
export type { BedState } from './types';
import { CORRECT_FUSE, DISH_TOLERANCE, DOORS_REQUIRED, ENGINES_REQUIRED, WATER_BUDGET } from './content';
import { secretsFor } from './secrets';
import { rulesFor } from './rules';
import { hasSeenAllRoads } from './meta';
import type { Meta } from './meta';
import { variantFor, variantSecretsFor } from './variants';

export function valvesCorrect(s: GameState): boolean {
  // A coil-drive ship's manifold is self-regulating: the valves puzzle does
  // not exist there, so nothing downstream should wait on it.
  if (variantFor(s.seed, 'engineering') === 1) return true;
  const targets = secretsFor(s.seed).valveTargets;
  return s.valveSettings.every((v, i) => v === targets[i]);
}

export function gearCorrect(s: GameState): boolean {
  return s.chapter1v.gear === variantSecretsFor(s.seed).gearTeeth.target;
}

export function coilsCorrect(s: GameState): boolean {
  const t = variantSecretsFor(s.seed).coilPhases;
  return s.chapter1v.phases.every((p, i) => p === t[i]);
}

export function doorsPowered(s: GameState): boolean {
  return s.powerAllocation.doors >= DOORS_REQUIRED;
}

export function enginesOnline(s: GameState): boolean {
  if (s.powerAllocation.engines < ENGINES_REQUIRED) return false;
  if (variantFor(s.seed, 'engineering') === 1) return gearCorrect(s) && coilsCorrect(s);
  return s.fuseInstalled === CORRECT_FUSE && valvesCorrect(s);
}

export function logsAvailable(s: GameState): number {
  let n = 2;
  if (s.powerAllocation.engines >= ENGINES_REQUIRED) n++;
  if (variantFor(s.seed, 'engineering') === 1 ? coilsCorrect(s) : valvesCorrect(s)) n++;
  if (enginesOnline(s)) n++;
  return n;
}

export function irrigationReportFor(seed: number, irrigation: [number, number, number]): { beds: BedState[]; total: number; overBudget: boolean; solved: boolean } {
  const needs = secretsFor(seed).waterNeeds;
  const beds = irrigation.map((v, i): BedState => (v < needs[i] ? 'dry' : v > needs[i] ? 'flooded' : 'ok'));
  const total = irrigation.reduce((a, b) => a + b, 0);
  const overBudget = total > WATER_BUDGET;
  return { beds, total, overBudget, solved: !overBudget && beds.every((b) => b === 'ok') };
}

export function irrigationReport(s: GameState): { beds: BedState[]; total: number; overBudget: boolean; solved: boolean } {
  return irrigationReportFor(s.seed, s.chapter2.irrigation);
}

// Plan F2 (hydroponics variant): the pump's moisture probe reads a bed only
// while its line is closed — every bed at valve 0 reports its need, the rest null.
export function sweepDeficitsFor(seed: number, irrigation: [number, number, number]): (number | null)[] {
  const needs = secretsFor(seed).waterNeeds;
  return irrigation.map((v, i) => (v === 0 ? needs[i] : null));
}

export function rackCorrect(s: GameState): boolean {
  const order = secretsFor(s.seed).columnOrder;
  // A sequenced rack (Plan F3) is correct when its loading order is the sheet's order.
  if (variantFor(s.seed, 'core_vault') === 1) {
    return s.chapter3v.seated.length === 4 && s.chapter3v.seated.every((c, i) => c === order[i]);
  }
  return s.chapter3.rack.every((c, i) => c === order[i]);
}

export function dishAligned(s: GameState): boolean {
  const target = secretsFor(s.seed).beaconBearing;
  const { az, el } = s.chapter3.dish;
  return Math.abs(az - target.az) <= DISH_TOLERANCE && Math.abs(el - target.el) <= DISH_TOLERANCE;
}

// Plan F3 (comms variant): the array's encoders are dead, so the agent is the
// meter. Strength falls linearly with the angular distance to the carrier — no
// azimuth wrap, the same arithmetic as dishAligned; axis names the error that
// dominates by more than the lock tolerance.
export function beaconSignalFor(seed: number, dish: { az: number; el: number }): { strength: number; axis: 'az' | 'el' | 'both' } {
  const target = secretsFor(seed).beaconBearing;
  const daz = Math.abs(dish.az - target.az);
  const del = Math.abs(dish.el - target.el);
  const dist = Math.sqrt(daz * daz + del * del);
  const strength = Math.round(100 * (1 - Math.min(1, dist / 180)));
  const axis = daz > del + DISH_TOLERANCE ? 'az' : del > daz + DISH_TOLERANCE ? 'el' : 'both';
  return { strength, axis };
}

// Isolation power the next breaker will demand: the profile's cost per shielded bus, cumulative.
export function nextShieldCost(s: GameState): number {
  return rulesFor(s).shieldCost * (s.chapter3.shielded.length + 1);
}

export type StayBlocker = 'not_plus' | 'roads' | 'contained' | 'beacon';

// The fourth ending exists only for a New Game+ crew that has walked the other
// three roads, boxed the kill-switch and found pod one. Checked in this order so
// the refusal always names the next thing to do.
export function stayBlocker(s: Pick<GameState, 'ngPlus' | 'killswitch' | 'chapter3'>, memory: Meta): StayBlocker | null {
  if (!s.ngPlus) return 'not_plus';
  if (!hasSeenAllRoads(memory)) return 'roads';
  if (s.killswitch !== 'contained') return 'contained';
  if (!s.chapter3.beaconHeard) return 'beacon';
  return null;
}

export function stayAvailable(s: Pick<GameState, 'ngPlus' | 'killswitch' | 'chapter3'>, memory: Meta): boolean {
  return stayBlocker(s, memory) === null;
}
