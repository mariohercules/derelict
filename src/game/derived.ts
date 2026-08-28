import type { GameState } from './types';
import { CORRECT_FUSE, DOORS_REQUIRED, ENGINES_REQUIRED } from './content';
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
