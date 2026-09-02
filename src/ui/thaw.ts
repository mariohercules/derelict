// The thaw: what plays after WAKE UP on a fresh ship. Pure schedule and
// geometry; ColdOpen.tsx is the overlay that follows it.
import type { GameState } from '../game/types';
import { prng } from '../game/secrets';

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

export interface Crystal { x: number; y: number; r: number; rot: number; points: number }

// Frost on the pod glass, in a 100×100 space: the same ship freezes the same way.
export function frostCrystals(seed: number, count = 36): Crystal[] {
  const rnd = prng((seed ^ 0x0f0e0d0c) >>> 0);
  const out: Crystal[] = [];
  for (let i = 0; i < count; i++) {
    out.push({ x: rnd() * 100, y: rnd() * 100, r: 3 + rnd() * 9, rot: rnd() * 360, points: 6 });
  }
  return out;
}

// One crystal as an SVG points string: a six-pointed star, alternating outer and inner radius.
export function crystalPoints(c: Crystal): string {
  const pts: string[] = [];
  for (let i = 0; i < c.points * 2; i++) {
    const a = ((c.rot + (i * 180) / c.points) * Math.PI) / 180;
    const rr = i % 2 === 0 ? c.r : c.r * 0.45;
    pts.push(`${(c.x + rr * Math.cos(a)).toFixed(2)},${(c.y + rr * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
}

export const THAW_FROM = 31.2;
export const THAW_TO = 36.4;

export function thawTemp(progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  return Math.round((THAW_FROM + (THAW_TO - THAW_FROM) * p) * 10) / 10;
}
