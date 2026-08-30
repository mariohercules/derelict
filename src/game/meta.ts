// What survives a run. Separate from the run save: a small record of the
// endings a crew has seen, hydrated before the app mounts, written once per
// completed run. The game never depends on it to run — a bad value is the
// empty meta.
import { createStore } from 'zustand/vanilla';
import type { StoreApi } from 'zustand/vanilla';
import type { EndingId, GameState } from './types';

export const META_KEY = 'derelict-meta';

export interface Meta {
  version: 1;
  runsCompleted: number;
  endingsSeen: EndingId[]; // unique, insertion order
  lastEnding: EndingId | null;
  lastSeed: number | null;
  bestToolCalls: number | null; // fewest tool calls over a completed run
}

export const EMPTY_META: Meta = { version: 1, runsCompleted: 0, endingsSeen: [], lastEnding: null, lastSeed: null, bestToolCalls: null };

const ENDINGS: EndingId[] = ['leave_unknowing', 'leave_knowing', 'restore', 'broadcast', 'stay'];
const isEnding = (v: unknown): v is EndingId => typeof v === 'string' && ENDINGS.includes(v as EndingId);
const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;

export function validMeta(v: unknown): v is Meta {
  if (!v || typeof v !== 'object') return false;
  const m = v as Record<string, unknown>;
  if (m.version !== 1) return false;
  if (!isCount(m.runsCompleted)) return false;
  if (!Array.isArray(m.endingsSeen) || !m.endingsSeen.every(isEnding) || new Set(m.endingsSeen).size !== m.endingsSeen.length) return false;
  if (m.lastEnding !== null && !isEnding(m.lastEnding)) return false;
  if (m.lastSeed !== null && !(typeof m.lastSeed === 'number' && Number.isFinite(m.lastSeed))) return false;
  if (m.bestToolCalls !== null && !isCount(m.bestToolCalls)) return false;
  return true;
}

export function loadMeta(): Meta {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return EMPTY_META;
    const parsed: unknown = JSON.parse(raw);
    return validMeta(parsed) ? parsed : EMPTY_META;
  } catch {
    return EMPTY_META;
  }
}

export const metaStore = createStore<Meta>(() => EMPTY_META);

export function hydrateMeta(): void {
  metaStore.setState(loadMeta(), true);
}

export function getMemory(): Meta {
  return metaStore.getState();
}

export function hasSeenAllRoads(m: Meta): boolean {
  const seen = (e: EndingId) => m.endingsSeen.includes(e);
  return (seen('leave_unknowing') || seen('leave_knowing')) && seen('restore') && seen('broadcast');
}

// Record a completed run. Idempotence is the caller's job (startRecordingRuns
// fires on the won transition only).
export function recordRun(s: GameState): Meta {
  if (!s.won || s.ending === null) return getMemory();
  const prev = getMemory();
  const next: Meta = {
    version: 1,
    runsCompleted: prev.runsCompleted + 1,
    endingsSeen: prev.endingsSeen.includes(s.ending) ? prev.endingsSeen : [...prev.endingsSeen, s.ending],
    lastEnding: s.ending,
    lastSeed: s.seed,
    bestToolCalls: prev.bestToolCalls === null ? s.toolCalls : Math.min(prev.bestToolCalls, s.toolCalls),
  };
  metaStore.setState(next, true);
  try {
    localStorage.setItem(META_KEY, JSON.stringify(next));
  } catch {
    // Private mode / quota: the memory lives for this session only.
  }
  return next;
}

export function startRecordingRuns(store: StoreApi<GameState>): () => void {
  return store.subscribe((s, prev) => {
    if (s.won && !prev.won) recordRun(s);
  });
}
