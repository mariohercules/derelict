import type { BedState, GameState } from './types';
export type { BedState } from './types';
import { CORRECT_FUSE, DISH_TOLERANCE, DOORS_REQUIRED, ENGINES_REQUIRED, WATER_BUDGET } from './content';
import { secretsFor } from './secrets';
import { rulesFor } from './rules';

export function valvesCorrect(s: GameState): boolean {
  const targets = secretsFor(s.seed).valveTargets;
  return s.valveSettings.every((v, i) => v === targets[i]);
}

export function doorsPowered(s: GameState): boolean {
  return s.powerAllocation.doors >= DOORS_REQUIRED;
}

export function enginesOnline(s: GameState): boolean {
  return (
    s.powerAllocation.engines >= ENGINES_REQUIRED &&
    s.fuseInstalled === CORRECT_FUSE &&
    valvesCorrect(s)
  );
}

export function logsAvailable(s: GameState): number {
  let n = 2;
  if (s.powerAllocation.engines >= ENGINES_REQUIRED) n++;
  if (valvesCorrect(s)) n++;
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

export function rackCorrect(s: GameState): boolean {
  const order = secretsFor(s.seed).columnOrder;
  return s.chapter3.rack.every((c, i) => c === order[i]);
}

export function dishAligned(s: GameState): boolean {
  const target = secretsFor(s.seed).beaconBearing;
  const { az, el } = s.chapter3.dish;
  return Math.abs(az - target.az) <= DISH_TOLERANCE && Math.abs(el - target.el) <= DISH_TOLERANCE;
}

// Isolation power the next breaker will demand: the profile's cost per shielded bus, cumulative.
export function nextShieldCost(s: GameState): number {
  return rulesFor(s).shieldCost * (s.chapter3.shielded.length + 1);
}
