// The thaw: what plays after WAKE UP on a fresh ship. Pure schedule and
// geometry; ColdOpen.tsx is the overlay that follows it.
import type { GameState } from '../game/types';

export function isFreshRun(s: GameState): boolean {
  return s.chapter === 1 && s.room === 'cryo_bay' && !s.grateRemoved && s.breakersFlipped.length === 0
    && s.checkpoint === null && !s.won;
}

// The pod opens for a ship drawn in this session, never for a save resumed —
// a reload must read as a resume, not as a new run with the same PIN.
// `resumedSeed` is the seed of the save the app loaded (null when none).
export function shouldThaw(s: GameState, resumedSeed: number | null): boolean {
  return s.seed !== resumedSeed && isFreshRun(s);
}

export type ColdOpenStepId = 'vitals' | 'frost' | 'bulletin' | 'open';
export interface ColdOpenStep { id: ColdOpenStepId; at: number }
export const COLD_OPEN_DONE_MS = 7000;

export function coldOpenSchedule(): ColdOpenStep[] {
  return [{ id: 'vitals', at: 0 }, { id: 'frost', at: 1800 }, { id: 'bulletin', at: 3400 }, { id: 'open', at: 6200 }];
}

export const THAW_FROM = 31.2;
export const THAW_TO = 36.4;

export function thawTemp(progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  return Math.round((THAW_FROM + (THAW_TO - THAW_FROM) * p) * 10) / 10;
}
