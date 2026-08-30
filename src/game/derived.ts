import type { GameState } from './types';
import { CORRECT_FUSE, DOORS_REQUIRED, ENGINES_REQUIRED, WATER_BUDGET } from './content';
import { secretsFor } from './secrets';

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

export type BedState = 'dry' | 'ok' | 'flooded';

export function irrigationReport(s: GameState): { beds: BedState[]; total: number; overBudget: boolean; solved: boolean } {
  const needs = secretsFor(s.seed).waterNeeds;
  const beds = s.chapter2.irrigation.map((v, i): BedState => (v < needs[i] ? 'dry' : v > needs[i] ? 'flooded' : 'ok'));
  const total = s.chapter2.irrigation.reduce((a, b) => a + b, 0);
  const overBudget = total > WATER_BUDGET;
  return { beds, total, overBudget, solved: !overBudget && beds.every((b) => b === 'ok') };
}
