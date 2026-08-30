import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from 'zustand/vanilla';
import { EMPTY_META, META_KEY, getMemory, hasSeenAllRoads, hydrateMeta, loadMeta, metaStore, recordRun, startRecordingRuns } from './meta';
import { initialState } from './store';
import type { GameState } from './types';

const storage = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => void storage.set(k, v),
  removeItem: (k: string) => void storage.delete(k),
});

beforeEach(() => {
  storage.clear();
  metaStore.setState(EMPTY_META, true);
});

describe('loadMeta', () => {
  it('is empty when nothing is stored, and when the stored value is garbage', () => {
    expect(loadMeta()).toEqual(EMPTY_META);
    storage.set(META_KEY, '{not json');
    expect(loadMeta()).toEqual(EMPTY_META);
    storage.set(META_KEY, JSON.stringify({ version: 1, runsCompleted: -1, endingsSeen: [], lastEnding: null, lastSeed: null, bestToolCalls: null }));
    expect(loadMeta()).toEqual(EMPTY_META);
    storage.set(META_KEY, JSON.stringify({ version: 1, runsCompleted: 2, endingsSeen: ['restore', 'bogus'], lastEnding: null, lastSeed: null, bestToolCalls: null }));
    expect(loadMeta()).toEqual(EMPTY_META);
  });

  it('round-trips a valid meta into the store', () => {
    const meta = { version: 1, runsCompleted: 2, endingsSeen: ['leave_knowing', 'restore'], lastEnding: 'restore', lastSeed: 77, bestToolCalls: 41 };
    storage.set(META_KEY, JSON.stringify(meta));
    hydrateMeta();
    expect(getMemory()).toEqual(meta);
  });
});

describe('recordRun', () => {
  const won = (ending: GameState['ending'], toolCalls: number, seed = 5): GameState => ({ ...initialState(seed), won: true, ending, toolCalls });

  it('accumulates unique endings, counts runs, keeps the best tool-call count, and persists', () => {
    recordRun(won('leave_knowing', 50));
    recordRun(won('restore', 70, 9));
    recordRun(won('leave_knowing', 44));
    const m = getMemory();
    expect(m.runsCompleted).toBe(3);
    expect(m.endingsSeen).toEqual(['leave_knowing', 'restore']);
    expect(m.lastEnding).toBe('leave_knowing');
    expect(m.lastSeed).toBe(5);
    expect(m.bestToolCalls).toBe(44);
    expect(JSON.parse(storage.get(META_KEY)!)).toEqual(m);
  });

  it('ignores a state that has no ending', () => {
    recordRun({ ...initialState(1), won: true, ending: null });
    expect(getMemory()).toEqual(EMPTY_META);
  });
});

describe('hasSeenAllRoads', () => {
  it('needs restore, broadcast and either leave', () => {
    const m = (endingsSeen: GameState['ending'][]) => ({ ...EMPTY_META, endingsSeen: endingsSeen.filter((e): e is NonNullable<typeof e> => e !== null) });
    expect(hasSeenAllRoads(m(['restore', 'broadcast']))).toBe(false);
    expect(hasSeenAllRoads(m(['leave_unknowing', 'restore', 'broadcast']))).toBe(true);
    expect(hasSeenAllRoads(m(['leave_knowing', 'broadcast', 'restore']))).toBe(true);
    expect(hasSeenAllRoads(m(['leave_knowing', 'restore', 'stay']))).toBe(false);
  });
});

describe('startRecordingRuns', () => {
  it('records once when won flips, never on later changes or on hydration', () => {
    const store = createStore<GameState>(() => ({ ...initialState(3), won: true, ending: 'broadcast' })); // hydrated as won: no record
    const stop = startRecordingRuns(store);
    expect(getMemory().runsCompleted).toBe(0);
    store.setState({ ...initialState(4) }, true);
    store.setState({ won: true, ending: 'restore', toolCalls: 12 });
    store.setState({ toolCalls: 13 });
    expect(getMemory().runsCompleted).toBe(1);
    expect(getMemory().lastEnding).toBe('restore');
    stop();
  });
});
