import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadSavedState, startPersisting, migrateV1, SAVE_KEY, LEGACY_SAVE_KEY } from './persist';
import { gameStore, resetGame, initialState, tickKillswitch } from './store';
import { toolAvailability } from '../mcp/tools';
import { tiersFor, variantFor } from './variants';
import { secretsFor } from './secrets';

const storage = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => void storage.set(k, v),
  removeItem: (k: string) => void storage.delete(k),
});

beforeEach(() => {
  storage.clear();
  resetGame(0);
});

describe('persistence', () => {
  it('round-trips state through localStorage', () => {
    const stop = startPersisting();
    gameStore.setState({ auxPower: true, act: 2, room: 'engineering' });
    stop();
    const loaded = loadSavedState();
    expect(loaded?.auxPower).toBe(true);
    expect(loaded?.room).toBe('engineering');
  });

  it('returns null for corrupt saves instead of throwing', () => {
    storage.set(SAVE_KEY, '{not json');
    expect(loadSavedState()).toBeNull();
  });

  it('returns null when a save is missing expected fields', () => {
    storage.set(SAVE_KEY, JSON.stringify({ hello: 'world' }));
    expect(loadSavedState()).toBeNull();
  });

  it('sanitizes an armed ritual on load: back to idle, no handle held', () => {
    const saved = { ...initialState(0), ritual: { active: 'launch', phase: 'armed', endsAt: 123456789, held: true } };
    storage.set(SAVE_KEY, JSON.stringify(saved));
    expect(loadSavedState()?.ritual).toEqual({ active: null, phase: 'idle', endsAt: null, held: false });
  });

  it('round-trips the ship seed', () => {
    const stop = startPersisting();
    resetGame(4242);
    stop();
    expect(loadSavedState()?.seed).toBe(4242);
  });

  it('treats a save from before seeded ships as the classic ship', () => {
    const legacy = { ...initialState(0) } as Record<string, unknown>;
    delete legacy.seed;
    storage.set(SAVE_KEY, JSON.stringify(legacy));
    expect(loadSavedState()?.seed).toBe(0);
  });

  it('rejects a tampered seed: negative or fractional would corrupt seed % 3 array indexing', () => {
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), seed: -1 }));
    expect(loadSavedState()).toBeNull();
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), seed: 1.5 }));
    expect(loadSavedState()).toBeNull();
  });

  it('rejects a save with a malformed launch object', () => {
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), ritual: null }));
    expect(loadSavedState()).toBeNull();
  });

  it('rejects a save with an incomplete power allocation', () => {
    const saved = { ...initialState(), powerAllocation: { life_support: 25 } };
    storage.set(SAVE_KEY, JSON.stringify(saved));
    expect(loadSavedState()).toBeNull();
  });

  it('rejects a save with malformed valve settings', () => {
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(), valveSettings: [] }));
    expect(loadSavedState()).toBeNull();
  });

  it('rejects a save pointing at a room that does not exist', () => {
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(), room: 'holodeck' }));
    expect(loadSavedState()).toBeNull();
  });

  it('keeps a completed ritual as done, but still clears the held flag', () => {
    const saved = { ...initialState(0), ritual: { active: 'launch', phase: 'done', endsAt: null, held: true } };
    storage.set(SAVE_KEY, JSON.stringify(saved));
    expect(loadSavedState()?.ritual).toEqual({ active: 'launch', phase: 'done', endsAt: null, held: false });
  });

  it('rejects a save with an impossible chapter', () => {
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), chapter: 7 }));
    expect(loadSavedState()).toBeNull();
  });

  it('rejects a save with an impossible checkpoint chapter', () => {
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), checkpoint: { chapter: 9, room: 'bridge' } }));
    expect(loadSavedState()).toBeNull();
  });

  it('rejects a save with a bogus ending', () => {
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), ending: 'bogus' }));
    expect(loadSavedState()).toBeNull();
  });

  it('rejects a save with a bogus ritual.active', () => {
    const saved = { ...initialState(0), ritual: { active: 'bogus', phase: 'idle', endsAt: null, held: false } };
    storage.set(SAVE_KEY, JSON.stringify(saved));
    expect(loadSavedState()).toBeNull();
  });

  it('accepts the leave_knowing ending', () => {
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), ending: 'leave_knowing', won: true }));
    expect(loadSavedState()?.ending).toBe('leave_knowing');
  });

  it('fills chapter-2 defaults for a Plan A save and rejects a bogus kill-switch state', () => {
    const planA = { ...initialState(0) } as Record<string, unknown>;
    delete planA.chapter2;
    delete planA.killswitch;
    storage.set(SAVE_KEY, JSON.stringify(planA));
    expect(loadSavedState()?.chapter2.crateLifted).toBe(false);
    expect(loadSavedState()?.killswitch).toBe('dormant');
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), killswitch: 'bogus' }));
    expect(loadSavedState()).toBeNull();
  });

  it('round-trips a mid-Chapter-2 save: room, flags, and killswitch, with the right tools online', () => {
    const stop = startPersisting();
    gameStore.setState({
      room: 'hydroponics',
      chapter: 2,
      doors: { cryo_exit: true, engineering_exit: true },
      sealedLogRead: true,
      chapter2: { ...initialState(0).chapter2, safeOpened: true },
      killswitch: 'stirring',
    });
    stop();
    const loaded = loadSavedState();
    expect(loaded?.room).toBe('hydroponics');
    expect(loaded?.chapter).toBe(2);
    expect(loaded?.doors).toEqual({ cryo_exit: true, engineering_exit: true });
    expect(loaded?.chapter2.safeOpened).toBe(true);
    expect(loaded?.killswitch).toBe('stirring');
    expect(toolAvailability(loaded!).find((t) => t.name === 'decrypt_private_log')!.online).toBe(true);
  });

  it('rejects chapter-2 fields that fall outside their valid ranges', () => {
    storage.set(SAVE_KEY, JSON.stringify({
      ...initialState(0), chapter2: { ...initialState(0).chapter2, craneAt: { row: 7, col: 0 } },
    }));
    expect(loadSavedState()).toBeNull();
    storage.set(SAVE_KEY, JSON.stringify({
      ...initialState(0), chapter2: { ...initialState(0).chapter2, irrigation: [99, 0, 0] },
    }));
    expect(loadSavedState()).toBeNull();
    storage.set(SAVE_KEY, JSON.stringify({
      ...initialState(0), chapter2: { ...initialState(0).chapter2, safeOpened: 'yes' },
    }));
    expect(loadSavedState()).toBeNull();
  });

  it('fills the isolation subsystem and chapter-3 defaults for a Plan B save', () => {
    const planB = { ...initialState(0) } as Record<string, unknown>;
    delete planB.chapter3;
    planB.powerAllocation = { life_support: 25, medbay: 5, comms: 10, doors: 0, engines: 0 };
    storage.set(SAVE_KEY, JSON.stringify(planB));
    const loaded = loadSavedState();
    expect(loaded?.powerAllocation.isolation).toBe(0);
    expect(loaded?.chapter3.shielded).toEqual([]);
    expect(loaded?.chapter3.wave).toBe('calm');
  });

  it('accepts the chapter-3 kill-switch states, rituals and endings, and rejects bogus ones', () => {
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), killswitch: 'contained', ending: 'restore' }));
    expect(loadSavedState()?.killswitch).toBe('contained');
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), ritual: { active: 'broadcast', phase: 'done', endsAt: null, held: false } }));
    expect(loadSavedState()?.ritual.active).toBe('broadcast');
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), ending: 'ascend' }));
    expect(loadSavedState()).toBeNull();
  });

  it('rejects a malformed chapter-3 slice', () => {
    const c3 = initialState(0).chapter3;
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), chapter3: { ...c3, shielded: ['warp'] } }));
    expect(loadSavedState()).toBeNull();
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), chapter3: { ...c3, rack: ['A', 'B'] } }));
    expect(loadSavedState()).toBeNull();
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), chapter3: { ...c3, dish: { az: 400, el: 0 } } }));
    expect(loadSavedState()).toBeNull();
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), chapter3: { ...c3, quarantineStep: 9 } }));
    expect(loadSavedState()).toBeNull();
  });

  it('fills lastCycle for a Plan B/C save and rejects a malformed one', () => {
    const older = { ...initialState(0), chapter2: { ...initialState(0).chapter2 } } as Record<string, unknown>;
    delete (older.chapter2 as Record<string, unknown>).lastCycle;
    storage.set(SAVE_KEY, JSON.stringify(older));
    expect(loadSavedState()?.chapter2.lastCycle).toBeNull();
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), chapter2: { ...initialState(0).chapter2, lastCycle: ['wet', 'ok', 'ok'] } }));
    expect(loadSavedState()).toBeNull();
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), chapter2: { ...initialState(0).chapter2, lastCycle: ['dry', 'ok', 'flooded'] } }));
    expect(loadSavedState()?.chapter2.lastCycle).toEqual(['dry', 'ok', 'flooded']);
  });

  it('restarts the cycle from calm on resume', () => {
    const c3 = { ...initialState(0).chapter3, cycleStartedAt: 123456, wave: 'active' as const };
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), chapter: 3, killswitch: 'active', chapter3: c3 }));
    const loaded = loadSavedState();
    expect(loaded?.chapter3.wave).toBe('calm');
    expect(loaded?.chapter3.cycleStartedAt).toBeGreaterThan(Date.now() - 2000);
    expect(loaded?.chapter3.cycleStartedAt).toBeLessThanOrEqual(Date.now() + 2000);
  });

  it('keeps the endured-wave count when it restarts the cycle on resume', () => {
    const c3 = { ...initialState(0).chapter3, cycleStartedAt: 123456, wave: 'active' as const, wavesEndured: 3 };
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), chapter: 3, killswitch: 'active', chapter3: c3 }));
    const loaded = loadSavedState();
    expect(loaded?.chapter3.wave).toBe('calm');
    expect(loaded?.chapter3.wavesEndured).toBe(3);
  });

  it('fills ngPlus for an older save, validates it, and accepts the stay ending and ritual', () => {
    const older = { ...initialState(0) } as Record<string, unknown>;
    delete older.ngPlus;
    storage.set(SAVE_KEY, JSON.stringify(older));
    expect(loadSavedState()?.ngPlus).toBe(false);
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), ngPlus: 'yes' }));
    expect(loadSavedState()).toBeNull();
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0, true), ending: 'stay', won: true, ritual: { active: 'stay', phase: 'done', endsAt: null, held: false } }));
    const loaded = loadSavedState();
    expect(loaded?.ngPlus).toBe(true);
    expect(loaded?.ending).toBe('stay');
    expect(loaded?.ritual.active).toBe('stay');
  });

  it('resumes a New Game+ save on the plus cycle: calm at load, warning after the 20s calm phase', () => {
    const saved = {
      ...initialState(0, true), chapter: 3, killswitch: 'active',
      chapter3: { ...initialState(0).chapter3, cycleStartedAt: 123456, wave: 'active' },
    };
    storage.set(SAVE_KEY, JSON.stringify(saved));
    const loaded = loadSavedState();
    expect(loaded?.chapter3.wave).toBe('calm');
    expect(loaded?.ngPlus).toBe(true);
    gameStore.setState(loaded!, true);
    tickKillswitch(loaded!.chapter3.cycleStartedAt! + 20_001);
    expect(gameStore.getState().chapter3.wave).toBe('warning');
  });

  it('fills chapter1v defaults for an older save and rejects malformed shapes', () => {
    const older = { ...initialState(0) } as Record<string, unknown>;
    delete older.chapter1v;
    storage.set(SAVE_KEY, JSON.stringify(older));
    const loaded = loadSavedState();
    expect(loaded?.chapter1v).toEqual({ sockets: [null, null, null], energized: false, gear: null, phases: [0, 0, 0] });
    const c1 = initialState(0).chapter1v;
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), chapter1v: { ...c1, sockets: [0, null, null] } }));
    expect(loadSavedState()).toBeNull();
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), chapter1v: { ...c1, phases: [0, 0, 12] } }));
    expect(loadSavedState()).toBeNull();
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), chapter1v: { ...c1, energized: 'yes' } }));
    expect(loadSavedState()).toBeNull();
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), chapter1v: { ...c1, sockets: [2, 1, 3], gear: 17 } }));
    expect(loadSavedState()?.chapter1v.gear).toBe(17);
  });

  it('fills chapter2v for an older save from the seed and rejects malformed shapes', () => {
    const older = { ...initialState(0) } as Record<string, unknown>;
    delete older.chapter2v;
    storage.set(SAVE_KEY, JSON.stringify(older));
    expect(loadSavedState()?.chapter2v).toEqual({ keyFound: false, held: false, tiers: [1, 1, 1, 1, 1, 1, 1, 1, 1] });
    // a pre-F2 save of a ship that now rolls a stacked bay gets the bay's layout, not a flat one
    let stacked = 1;
    while (variantFor(stacked, 'cargo_bay') !== 1) stacked++;
    const olderStacked = { ...initialState(stacked) } as Record<string, unknown>;
    delete olderStacked.chapter2v;
    storage.set(SAVE_KEY, JSON.stringify(olderStacked));
    expect(loadSavedState()?.chapter2v.tiers).toEqual(tiersFor(stacked));
    expect(loadSavedState()?.chapter2v.tiers.filter((t) => t === 2)).toHaveLength(3);
    const c2v = initialState(0).chapter2v;
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), chapter2v: { ...c2v, tiers: [1, 1, 1, 1, 1, 1, 1, 1] } }));
    expect(loadSavedState()).toBeNull();
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), chapter2v: { ...c2v, tiers: [1, 1, 1, 1, 3, 1, 1, 1, 1] } }));
    expect(loadSavedState()).toBeNull();
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), chapter2v: { ...c2v, held: 'yes' } }));
    expect(loadSavedState()).toBeNull();
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), chapter2v: { ...c2v, keyFound: true } }));
    expect(loadSavedState()?.chapter2v.keyFound).toBe(true);
  });

  it('fills chapter2v coherently for a pre-F2 save that already finished a puzzle', () => {
    let stacked = 1;
    while (variantFor(stacked, 'cargo_bay') !== 1) stacked++;
    const qIndex = (() => { const q = secretsFor(stacked).quarantineSlot; return q.row * 3 + q.col; })();
    // a stacked-seed save that had already lifted the quarantine container is no longer under a pallet
    const olderLifted = { ...initialState(stacked), chapter2: { ...initialState(stacked).chapter2, crateLifted: true } } as Record<string, unknown>;
    delete olderLifted.chapter2v;
    storage.set(SAVE_KEY, JSON.stringify(olderLifted));
    const loadedLifted = loadSavedState();
    expect(loadedLifted?.chapter2v.tiers[qIndex]).toBe(1);
    expect(loadedLifted?.chapter2v.tiers.filter((t) => t === 2)).toHaveLength(2);
    // a save that had already opened the safe must not resurrect the key search
    const olderSafeOpened = { ...initialState(0), chapter2: { ...initialState(0).chapter2, safeOpened: true } } as Record<string, unknown>;
    delete olderSafeOpened.chapter2v;
    storage.set(SAVE_KEY, JSON.stringify(olderSafeOpened));
    expect(loadSavedState()?.chapter2v.keyFound).toBe(true);
    // reload mid-lift is coherent: an explicit chapter2v is never touched by the fill
    const baseTiers = tiersFor(stacked);
    const lowerIdx = baseTiers.findIndex((t, i) => t === 2 && i !== qIndex);
    const midLiftTiers = [...baseTiers];
    midLiftTiers[lowerIdx] = 1;
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(stacked), chapter2v: { keyFound: false, held: true, tiers: midLiftTiers } }));
    const loadedMidLift = loadSavedState();
    expect(loadedMidLift?.chapter2v.held).toBe(true);
    expect(loadedMidLift?.chapter2v.tiers).toEqual(midLiftTiers);
  });

  it('fills chapter3v for an older save — empty, or the proven order — and rejects malformed shapes', () => {
    const older = { ...initialState(0) } as Record<string, unknown>;
    delete older.chapter3v;
    storage.set(SAVE_KEY, JSON.stringify(older));
    expect(loadSavedState()?.chapter3v).toEqual({ seated: [] });
    // a save that already proved the rack keeps it proven on a ship that now sequences it
    for (const proof of [{ kernelSeated: true }, { cacheRead: true }, { fragmentStage: 2 }]) {
      const proven = { ...initialState(0), chapter3: { ...initialState(0).chapter3, ...proof } } as Record<string, unknown>;
      delete proven.chapter3v;
      storage.set(SAVE_KEY, JSON.stringify(proven));
      expect(loadSavedState()?.chapter3v.seated).toEqual([...secretsFor(0).columnOrder]);
    }
    const base = initialState(0);
    storage.set(SAVE_KEY, JSON.stringify({ ...base, chapter3v: { seated: ['A', 'B', 'C', 'D', 'A'] } }));
    expect(loadSavedState()).toBeNull();
    storage.set(SAVE_KEY, JSON.stringify({ ...base, chapter3v: { seated: ['A', 'A'] } }));
    expect(loadSavedState()).toBeNull();
    storage.set(SAVE_KEY, JSON.stringify({ ...base, chapter3v: { seated: ['E'] } }));
    expect(loadSavedState()).toBeNull();
    storage.set(SAVE_KEY, JSON.stringify({ ...base, chapter3v: { seated: 'CADB' } }));
    expect(loadSavedState()).toBeNull();
    storage.set(SAVE_KEY, JSON.stringify({ ...base, chapter3v: { seated: ['C', 'A'] } }));
    expect(loadSavedState()?.chapter3v.seated).toEqual(['C', 'A']);
  });
});

describe('v1 → v2 migration', () => {
  function v1Save(overrides: Record<string, unknown> = {}) {
    return {
      seed: 0, act: 3, room: 'bridge', auxPower: true, grateRemoved: true, breakersFlipped: ['C', 'A', 'B'],
      doors: { cryo_exit: true, engineering_exit: true },
      powerAllocation: { life_support: 15, doors: 5, medbay: 0, engines: 20, comms: 0 },
      fuseInstalled: '10A', valveSettings: [6, 3, 7], starFixTaken: true, trajectorySet: true,
      launch: { phase: 'countdown', countdownEndsAt: 123456789, handleHeld: true },
      toolCalls: 30, won: false,
      ...overrides,
    };
  }

  it('maps a v1 launch to a ritual and fills the new fields', () => {
    const m = migrateV1(v1Save());
    expect(m.ritual).toEqual({ active: 'launch', phase: 'armed', endsAt: 123456789, held: true });
    expect(m.chapter).toBe(1);
    expect(m.sealedLogRead).toBe(false);
    expect(m.ending).toBeNull();
    expect(m.checkpoint).toEqual({ chapter: 1, room: 'bridge' });
    expect((m as Record<string, unknown>).launch).toBeUndefined();
  });

  it('maps a won v1 save to the leave-unknowing ending and a done ritual', () => {
    const m = migrateV1(v1Save({ won: true, launch: { phase: 'launched', countdownEndsAt: null, handleHeld: false } }));
    expect(m.ending).toBe('leave_unknowing');
    expect(m.ritual?.phase).toBe('done');
  });

  it('loads a v1 save from the legacy key when no v2 save exists, with progress intact', () => {
    storage.set(LEGACY_SAVE_KEY, JSON.stringify(v1Save()));
    const loaded = loadSavedState();
    expect(loaded?.room).toBe('bridge');
    expect(loaded?.trajectorySet).toBe(true);
    expect(loaded?.ritual).toEqual({ active: null, phase: 'idle', endsAt: null, held: false }); // armed → sanitized
    expect(loaded?.chapter).toBe(1);
  });

  it('prefers the v2 save when both exist', () => {
    storage.set(LEGACY_SAVE_KEY, JSON.stringify(v1Save({ room: 'engineering' })));
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), room: 'bridge', doors: { cryo_exit: true, engineering_exit: true } }));
    expect(loadSavedState()?.room).toBe('bridge');
  });

  it('writes v2 only, clearing a pre-existing legacy save', () => {
    storage.set(LEGACY_SAVE_KEY, JSON.stringify(v1Save()));
    const stop = startPersisting();
    gameStore.setState({ auxPower: true });
    stop();
    expect(storage.has(SAVE_KEY)).toBe(true);
    expect(storage.has(LEGACY_SAVE_KEY)).toBe(false);
  });
});
