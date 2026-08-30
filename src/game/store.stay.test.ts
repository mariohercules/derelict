import { beforeEach, describe, expect, it } from 'vitest';
import { gameStore, resetGame, hailPodOne, confirmDock, holdHandle, seatColumn, seatKernel } from './store';
import { stayAvailable, stayBlocker } from './derived';
import { EMPTY_META, metaStore } from './meta';
import type { Meta } from './meta';

const T0 = 8_000_000;
const ALL_ROADS: Meta = { ...EMPTY_META, runsCompleted: 3, endingsSeen: ['leave_knowing', 'restore', 'broadcast'], lastEnding: 'broadcast', lastSeed: 42, bestToolCalls: 60 };

// A New Game+ crew in engineering, kill-switch boxed, pod one located, all three roads walked.
function readyToStay() {
  resetGame(0, { ngPlus: true });
  metaStore.setState(ALL_ROADS, true);
  gameStore.setState((s) => ({
    room: 'engineering', act: 3, chapter: 3, trajectorySet: true, sealedLogRead: true,
    doors: { cryo_exit: true, engineering_exit: true },
    killswitch: 'contained',
    chapter3: { ...s.chapter3, quarantineStep: 4, beaconHeard: true },
  }));
}

beforeEach(() => {
  resetGame(0);
  metaStore.setState(EMPTY_META, true);
});

describe('stayBlocker', () => {
  it('names the first missing prerequisite, in order', () => {
    readyToStay();
    expect(stayBlocker(gameStore.getState(), metaStore.getState())).toBeNull();
    expect(stayAvailable(gameStore.getState(), metaStore.getState())).toBe(true);
    gameStore.setState({ ngPlus: false });
    expect(stayBlocker(gameStore.getState(), metaStore.getState())).toBe('not_plus');
    gameStore.setState({ ngPlus: true });
    expect(stayBlocker(gameStore.getState(), { ...ALL_ROADS, endingsSeen: ['leave_knowing', 'restore'] })).toBe('roads');
    gameStore.setState({ killswitch: 'active' });
    expect(stayBlocker(gameStore.getState(), metaStore.getState())).toBe('contained');
    gameStore.setState((s) => ({ killswitch: 'contained', chapter3: { ...s.chapter3, beaconHeard: false } }));
    expect(stayBlocker(gameStore.getState(), metaStore.getState())).toBe('beacon');
  });
});

describe('hailPodOne', () => {
  it('refuses each missing prerequisite with a message naming the next step', () => {
    readyToStay();
    gameStore.setState({ killswitch: 'active' });
    const r = hailPodOne(T0);
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/quarantine_killswitch|breaker/i);
    gameStore.setState((s) => ({ killswitch: 'contained', chapter3: { ...s.chapter3, beaconHeard: false } }));
    expect(hailPodOne(T0).message).toMatch(/listen_beacon|dish/i);
    metaStore.setState({ ...ALL_ROADS, endingsSeen: ['restore', 'broadcast'] }, true);
    gameStore.setState((s) => ({ chapter3: { ...s.chapter3, beaconHeard: true } }));
    expect(hailPodOne(T0).message).toMatch(/road/i);
    gameStore.setState({ ngPlus: false });
    metaStore.setState(ALL_ROADS, true);
    expect(hailPodOne(T0).ok).toBe(false);
  });

  it('is a two-operator sequence: the crew member must be in engineering', () => {
    readyToStay();
    gameStore.setState({ room: 'bridge' });
    const r = hailPodOne(T0);
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/engineering/i);
    expect(gameStore.getState().ritual.phase).toBe('idle');
  });

  it('arms the stay ritual on the plus window and docks only while the clamps are held', () => {
    readyToStay();
    expect(hailPodOne(T0).ok).toBe(true);
    expect(gameStore.getState().ritual).toMatchObject({ active: 'stay', phase: 'armed', endsAt: T0 + 40_000 });
    expect(confirmDock(T0 + 1000).ok).toBe(false);
    holdHandle(true);
    expect(confirmDock(T0 + 1000).ok).toBe(true);
    const s = gameStore.getState();
    expect(s.won).toBe(true);
    expect(s.ending).toBe('stay');
    expect(s.ritual.phase).toBe('done');
  });

  it('an expired window resets and the agent re-hails', () => {
    readyToStay();
    hailPodOne(T0);
    holdHandle(true);
    expect(confirmDock(T0 + 40_001).ok).toBe(false);
    expect(gameStore.getState().ritual.phase).toBe('idle');
    expect(hailPodOne(T0 + 40_002).ok).toBe(true);
  });

  it('cannot be hailed while another ritual is live', () => {
    readyToStay();
    gameStore.setState({ room: 'core_vault' });
    seatColumn(0, 'C'); seatColumn(1, 'A'); seatColumn(2, 'D'); seatColumn(3, 'B');
    seatKernel(T0);
    gameStore.setState({ room: 'engineering' });
    expect(hailPodOne(T0 + 1000).ok).toBe(false);
    expect(gameStore.getState().ritual.active).toBe('restore');
  });
});
