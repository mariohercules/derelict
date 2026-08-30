import { beforeEach, describe, expect, it } from 'vitest';
import {
  gameStore, resetGame, startInvestigation, moveCrane, liftCrate, analyzeSample, enterRoom, routePower,
  tickKillswitch, cutIsolation, quarantineKillswitch, seatColumn, seatKernel, queryFragmentMemory, readPrimeCache,
  setDish, hearBeacon, openBand, confirmMerge, confirmBroadcast, holdHandle, initiateLaunch, confirmLaunch,
} from './store';
import { dishAligned, nextShieldCost, rackCorrect } from './derived';
import { RESTORE_WINDOW_MS, SHIELD_COST, WAVE_CALM_MS, WAVE_CYCLE_MS, WAVE_WARNING_MS, LAUNCH_AUTH, STAR_FIX } from './content';

const T0 = 5_000_000;

// Chapter 2 solved on the classic ship, standing in the cargo bay with the Kestrel confirmed.
function kestrelConfirmed() {
  resetGame(0);
  gameStore.setState({ room: 'bridge', act: 3, trajectorySet: true, sealedLogRead: true, doors: { cryo_exit: true, engineering_exit: true } });
  startInvestigation();
  gameStore.setState({ room: 'cargo_bay' });
  moveCrane('down'); moveCrane('down'); moveCrane('right'); liftCrate();
  analyzeSample('7741');
}

// …and the kill-switch fully awake in the reactor room, with the waves' clock at T0.
function inReactorRoom(now = T0) {
  kestrelConfirmed();
  gameStore.setState({ room: 'engineering' });
  enterRoom('reactor_room', now);
}

beforeEach(() => resetGame(0));

describe('entering chapter 3', () => {
  it('the Kestrel confirmation opens the lower deck and leaves the kill-switch stirring', () => {
    kestrelConfirmed();
    const s = gameStore.getState();
    expect(s.chapter).toBe(3);
    expect(s.checkpoint).toEqual({ chapter: 3, room: 'cargo_bay' });
    expect(s.killswitch).toBe('stirring');
    expect(s.chapter3.cycleStartedAt).toBeNull();
  });

  it('the first step into a chapter-3 room wakes the kill-switch and starts the wave clock', () => {
    kestrelConfirmed();
    gameStore.setState({ room: 'engineering' });
    expect(enterRoom('reactor_room', T0).ok).toBe(true);
    const s = gameStore.getState();
    expect(s.killswitch).toBe('active');
    expect(s.chapter3.cycleStartedAt).toBe(T0);
    expect(s.chapter3.wave).toBe('calm');
    // walking on does not restart the clock
    enterRoom('core_vault', T0 + 5000);
    expect(gameStore.getState().chapter3.cycleStartedAt).toBe(T0);
  });
});

describe('the wave clock', () => {
  it('materializes calm → warning → active as time passes and counts endured waves', () => {
    inReactorRoom();
    tickKillswitch(T0 + WAVE_CALM_MS + 1);
    expect(gameStore.getState().chapter3.wave).toBe('warning');
    tickKillswitch(T0 + WAVE_CALM_MS + WAVE_WARNING_MS + 1);
    expect(gameStore.getState().chapter3.wave).toBe('active');
    tickKillswitch(T0 + WAVE_CYCLE_MS + 1);
    expect(gameStore.getState().chapter3.wave).toBe('calm');
    expect(gameStore.getState().chapter3.wavesEndured).toBe(1);
  });

  it('does nothing unless the kill-switch is active', () => {
    kestrelConfirmed();
    tickKillswitch(T0 + WAVE_CYCLE_MS);
    expect(gameStore.getState().chapter3.wave).toBe('calm');
    expect(gameStore.getState().chapter3.wavesEndured).toBe(0);
  });

  it('never materializes calm straight into active: a throttled tab jumping past the warning window is telegraphed a warning first', () => {
    inReactorRoom();
    const jumpNow = T0 + WAVE_CALM_MS + WAVE_WARNING_MS + 5; // a tick that lands well inside the active window
    tickKillswitch(jumpNow);
    expect(gameStore.getState().chapter3.wave).toBe('warning');
    tickKillswitch(jumpNow + WAVE_WARNING_MS);
    expect(gameStore.getState().chapter3.wave).toBe('active');
  });

  it('counts a wave only on the active → calm transition, and keeps the count across a throttled jump', () => {
    inReactorRoom();
    tickKillswitch(T0 + WAVE_CALM_MS + 1); // warning
    tickKillswitch(T0 + WAVE_CALM_MS + WAVE_WARNING_MS + 1); // active
    expect(gameStore.getState().chapter3.wavesEndured).toBe(0);
    tickKillswitch(T0 + WAVE_CYCLE_MS + 1); // calm again
    expect(gameStore.getState().chapter3.wavesEndured).toBe(1);
    // a jump straight into the next active window rebases to warning without touching the count
    tickKillswitch(T0 + 2 * WAVE_CYCLE_MS + WAVE_CALM_MS + WAVE_WARNING_MS + 5);
    expect(gameStore.getState().chapter3.wave).toBe('warning');
    expect(gameStore.getState().chapter3.wavesEndured).toBe(1);
  });
});

describe('reactor room — isolation breakers', () => {
  it('a breaker needs isolation power the AI routed, then shields its bus for good', () => {
    inReactorRoom();
    expect(nextShieldCost(gameStore.getState())).toBe(SHIELD_COST);
    const r = cutIsolation('core');
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/route_power|isolation/i);
    expect(routePower('comms', 'isolation', SHIELD_COST).ok).toBe(true);
    expect(cutIsolation('core').ok).toBe(true);
    expect(gameStore.getState().chapter3.shielded).toEqual(['core']);
    expect(nextShieldCost(gameStore.getState())).toBe(2 * SHIELD_COST);
    // a second bus needs a second helping
    expect(cutIsolation('nav').ok).toBe(false);
    routePower('comms', 'isolation', SHIELD_COST);
    expect(cutIsolation('nav').ok).toBe(true);
    expect(cutIsolation('nav').ok).toBe(true); // already cut: idempotent, still ok
    expect(gameStore.getState().chapter3.shielded).toEqual(['core', 'nav']);
  });

  it('breakers are cut only from the reactor room', () => {
    inReactorRoom();
    routePower('comms', 'isolation', SHIELD_COST);
    gameStore.setState({ room: 'engineering' });
    expect(cutIsolation('core').ok).toBe(false);
    expect(gameStore.getState().chapter3.shielded).toEqual([]);
  });

  it('a shielded bus holds its isolation power for good: routing it back out is refused', () => {
    inReactorRoom();
    routePower('comms', 'isolation', SHIELD_COST);
    expect(cutIsolation('core').ok).toBe(true);
    const before = gameStore.getState().powerAllocation;
    const r = routePower('isolation', 'engines', SHIELD_COST);
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/holding|shielded/i);
    expect(gameStore.getState().powerAllocation).toEqual(before);
  });

  it('with headroom above what is held, isolation gives up the free units but not the last held ones', () => {
    inReactorRoom();
    routePower('comms', 'isolation', 2 * SHIELD_COST); // 10u in, one bus shielded holds 5u
    expect(cutIsolation('core').ok).toBe(true);
    expect(routePower('isolation', 'engines', SHIELD_COST).ok).toBe(true); // 10 → 5, still covers the hold
    expect(gameStore.getState().powerAllocation.isolation).toBe(SHIELD_COST);
    expect(routePower('isolation', 'engines', SHIELD_COST).ok).toBe(false); // the last 5u are spoken for
    expect(gameStore.getState().powerAllocation.isolation).toBe(SHIELD_COST);
  });
});

describe('quarantine', () => {
  function shield(n: number) {
    // 25u are free above the life-support minimum on the classic allocation (medbay 5, comms 10, doors/engines 0 → route from comms/medbay)
    routePower('comms', 'isolation', 10);
    routePower('medbay', 'isolation', 5);
    routePower('life_support', 'isolation', 5); // 25 → 20, still above the 15u floor
    (['core', 'nav', 'archive', 'comms'] as const).slice(0, n).forEach((b) => cutIsolation(b));
  }

  it('advances one step per call, only as far as the shielding goes, and contains the kill-switch at four', () => {
    inReactorRoom();
    expect(quarantineKillswitch().ok).toBe(false); // nothing shielded yet
    shield(2);
    expect(quarantineKillswitch()).toMatchObject({ ok: true, step: 1, of: 4 });
    expect(quarantineKillswitch()).toMatchObject({ ok: true, step: 2, of: 4 });
    const stalled = quarantineKillswitch();
    expect(stalled.ok).toBe(false);
    expect(stalled.message).toMatch(/breaker|reactor/i);
    shield(4);
    quarantineKillswitch();
    expect(quarantineKillswitch()).toMatchObject({ ok: true, step: 4, of: 4 });
    const s = gameStore.getState();
    expect(s.killswitch).toBe('contained');
    expect(s.chapter3.wave).toBe('calm');
    expect(s.chapter3.cycleStartedAt).toBeNull();
    expect(quarantineKillswitch().ok).toBe(true); // already contained
  });

  it('refuses while the kill-switch is merely stirring', () => {
    kestrelConfirmed();
    expect(quarantineKillswitch().ok).toBe(false);
  });

  it('is reachable from a real, finished chapter-1 power allocation, and LEAVE still works after', () => {
    inReactorRoom(T0);
    // A finished chapter 1: life support at its floor, doors/engines paid for,
    // nothing spare in medbay or comms — the only surplus left is engines.
    gameStore.setState({ powerAllocation: { life_support: 15, doors: 5, medbay: 0, engines: 20, comms: 0, isolation: 0 } });
    routePower('engines', 'isolation', 5);
    routePower('engines', 'isolation', 5);
    routePower('engines', 'isolation', 5);
    routePower('engines', 'isolation', 5);
    expect(gameStore.getState().powerAllocation.isolation).toBe(20);
    expect(cutIsolation('core').ok).toBe(true);
    expect(cutIsolation('nav').ok).toBe(true);
    expect(cutIsolation('archive').ok).toBe(true);
    expect(cutIsolation('comms').ok).toBe(true);
    quarantineKillswitch(); quarantineKillswitch(); quarantineKillswitch(); quarantineKillswitch();
    expect(gameStore.getState().killswitch).toBe('contained');
    gameStore.setState({ room: 'bridge' });
    expect(initiateLaunch(LAUNCH_AUTH, T0 + 1000).ok).toBe(true); // engines at 0 do not gate LEAVE
  });
});

describe('core vault — the rack', () => {
  function inVault() {
    inReactorRoom();
    enterRoom('core_vault', T0 + 1000);
  }

  it('the rack is correct only in the classic order C-A-D-B, and only from the vault', () => {
    inReactorRoom();
    expect(seatColumn(0, 'C').ok).toBe(false);
    inVault();
    seatColumn(0, 'C'); seatColumn(1, 'A'); seatColumn(2, 'D'); seatColumn(3, 'B');
    expect(rackCorrect(gameStore.getState())).toBe(true);
    seatColumn(3, null);
    expect(rackCorrect(gameStore.getState())).toBe(false);
  });

  it('the fragment reads itself in three stages once the rack is seated', () => {
    inVault();
    expect(queryFragmentMemory().ok).toBe(false);
    seatColumn(0, 'C'); seatColumn(1, 'A'); seatColumn(2, 'D'); seatColumn(3, 'B');
    expect(queryFragmentMemory()).toMatchObject({ ok: true, stage: 1 });
    expect(queryFragmentMemory()).toMatchObject({ ok: true, stage: 2 });
    expect(queryFragmentMemory()).toMatchObject({ ok: true, stage: 3 });
    expect(queryFragmentMemory()).toMatchObject({ ok: true, stage: 3 }); // nothing left to read
    expect(readPrimeCache().ok).toBe(true);
    expect(gameStore.getState().chapter3.cacheRead).toBe(true);
  });

  it('RESTORE: the kernel arms a 60s window, the human holds the lever, the agent merges knowingly', () => {
    inVault();
    expect(seatKernel(T0).ok).toBe(false); // rack not seated
    seatColumn(0, 'C'); seatColumn(1, 'A'); seatColumn(2, 'D'); seatColumn(3, 'B');
    expect(seatKernel(T0).ok).toBe(true);
    expect(gameStore.getState().ritual).toMatchObject({ active: 'restore', phase: 'armed', endsAt: T0 + RESTORE_WINDOW_MS });
    expect(confirmMerge(T0 + 1000).ok).toBe(false); // fragment has not read itself
    queryFragmentMemory(); queryFragmentMemory(); queryFragmentMemory();
    expect(confirmMerge(T0 + 1000).ok).toBe(false); // lever not held
    holdHandle(true);
    expect(confirmMerge(T0 + 1000).ok).toBe(true);
    const s = gameStore.getState();
    expect(s.won).toBe(true);
    expect(s.ending).toBe('restore');
    expect(s.ritual.phase).toBe('done');
  });

  it('an expired restore window re-arms by re-seating the kernel', () => {
    inVault();
    seatColumn(0, 'C'); seatColumn(1, 'A'); seatColumn(2, 'D'); seatColumn(3, 'B');
    queryFragmentMemory(); queryFragmentMemory(); queryFragmentMemory();
    seatKernel(T0);
    holdHandle(true);
    expect(confirmMerge(T0 + RESTORE_WINDOW_MS + 1).ok).toBe(false);
    expect(gameStore.getState().ritual.phase).toBe('idle');
    expect(seatKernel(T0 + RESTORE_WINDOW_MS + 2).ok).toBe(true);
  });

  it('a column cannot sit in two cradles', () => {
    inVault();
    expect(seatColumn(0, 'C').ok).toBe(true);
    const r = seatColumn(1, 'C');
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/cradle 1/);
    expect(gameStore.getState().chapter3.rack).toEqual(['C', null, null, null]);
    seatColumn(0, null);
    expect(seatColumn(1, 'C').ok).toBe(true);
  });
});

describe('comms array — the dish', () => {
  function atDish() {
    kestrelConfirmed();
    gameStore.setState({ room: 'bridge' });
    enterRoom('comms_array', T0);
  }

  it('comms_array wakes the kill-switch too — the lower deck is not only the reactor room', () => {
    atDish();
    const s = gameStore.getState();
    expect(s.killswitch).toBe('active');
    expect(s.chapter3.cycleStartedAt).toBe(T0);
  });

  it('aligns within three degrees of the classic bearing and clamps the axes', () => {
    atDish();
    setDish('az', 217); setDish('el', 34);
    expect(dishAligned(gameStore.getState())).toBe(true);
    setDish('el', 38);
    expect(dishAligned(gameStore.getState())).toBe(false);
    setDish('az', 400); setDish('el', -5);
    expect(gameStore.getState().chapter3.dish).toEqual({ az: 359, el: 0 });
  });

  it('the beacon is heard only when aligned', () => {
    atDish();
    expect(hearBeacon().ok).toBe(false);
    setDish('az', 219); setDish('el', 32);
    expect(hearBeacon().ok).toBe(true);
    expect(gameStore.getState().chapter3.beaconHeard).toBe(true);
  });

  it('BROADCAST: needs the evidence aboard, the dish aligned, the band open and the lock held', () => {
    atDish();
    setDish('az', 217); setDish('el', 34);
    expect(openBand(T0).ok).toBe(false); // no evidence read yet
    gameStore.setState((s) => ({ chapter3: { ...s.chapter3, cacheRead: true } }));
    expect(openBand(T0).ok).toBe(true);
    expect(gameStore.getState().ritual.active).toBe('broadcast');
    expect(confirmBroadcast(T0 + 1000).ok).toBe(false);
    holdHandle(true);
    expect(confirmBroadcast(T0 + 1000).ok).toBe(true);
    expect(gameStore.getState().ending).toBe('broadcast');
    expect(gameStore.getState().won).toBe(true);
  });

  it('the band opens only from the comms array with the dish aligned', () => {
    atDish();
    gameStore.setState((s) => ({ chapter3: { ...s.chapter3, cacheRead: true } }));
    expect(openBand(T0).ok).toBe(false); // dish at 0/0
    setDish('az', 217); setDish('el', 34);
    gameStore.setState({ room: 'bridge' });
    expect(openBand(T0).ok).toBe(false);
  });
});

describe('the three rituals are exclusive and LEAVE still works in chapter 3', () => {
  it('a live restore window blocks a launch, and launch after chapter 2 records leave_knowing', () => {
    inReactorRoom();
    enterRoom('core_vault', T0 + 1000);
    seatColumn(0, 'C'); seatColumn(1, 'A'); seatColumn(2, 'D'); seatColumn(3, 'B');
    seatKernel(T0);
    gameStore.setState({ room: 'bridge' });
    expect(initiateLaunch(LAUNCH_AUTH, T0 + 1000).ok).toBe(false);
    expect(initiateLaunch(LAUNCH_AUTH, T0 + RESTORE_WINDOW_MS + 1).ok).toBe(true);
    holdHandle(true);
    expect(confirmLaunch(T0 + RESTORE_WINDOW_MS + 2).ok).toBe(true);
    expect(gameStore.getState().ending).toBe('leave_knowing');
    expect(STAR_FIX).toHaveLength(3); // keeps the import honest
  });
});
