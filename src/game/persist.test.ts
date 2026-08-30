import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadSavedState, startPersisting, migrateV1, SAVE_KEY, LEGACY_SAVE_KEY } from './persist';
import { gameStore, resetGame, initialState } from './store';
import { toolAvailability } from '../mcp/tools';

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
