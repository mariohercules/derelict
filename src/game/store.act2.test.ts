import { beforeEach, describe, expect, it } from 'vitest';
import { gameStore, resetGame, routePower, installFuse, setValve } from './store';
import { enginesOnline, valvesCorrect, logsAvailable, doorsPowered } from './derived';
import { VALVE_TARGETS } from './content';

beforeEach(() => resetGame());

describe('routePower', () => {
  it('moves power between subsystems', () => {
    expect(routePower('comms', 'engines', 10).ok).toBe(true);
    const a = gameStore.getState().powerAllocation;
    expect(a.comms).toBe(0);
    expect(a.engines).toBe(10);
  });

  it('refuses to draw life support below the hard minimum', () => {
    const r = routePower('life_support', 'engines', 11); // 25 - 11 = 14 < 15
    expect(r.ok).toBe(false);
    expect(gameStore.getState().powerAllocation.life_support).toBe(25);
  });

  it('allows drawing life support down to exactly the minimum', () => {
    expect(routePower('life_support', 'engines', 10).ok).toBe(true);
  });

  it('refuses more than the source has', () => {
    expect(routePower('medbay', 'engines', 6).ok).toBe(false);
  });

  it('refuses non-positive and non-integer amounts', () => {
    expect(routePower('comms', 'engines', 0).ok).toBe(false);
    expect(routePower('comms', 'engines', 2.5).ok).toBe(false);
    expect(routePower('comms', 'comms', 5).ok).toBe(false);
  });
});

describe('engines online', () => {
  function powerUpEngines() {
    routePower('life_support', 'engines', 10);
    routePower('medbay', 'engines', 5);
    routePower('comms', 'engines', 5);
    routePower('comms', 'doors', 5);
  }

  it('requires 20u, the 10A fuse, and correct valves', () => {
    powerUpEngines();
    installFuse('10A');
    setValve(0, VALVE_TARGETS[0]); setValve(1, VALVE_TARGETS[1]); setValve(2, VALVE_TARGETS[2]);
    const s = gameStore.getState();
    expect(valvesCorrect(s)).toBe(true);
    expect(enginesOnline(s)).toBe(true);
    expect(doorsPowered(s)).toBe(true);
  });

  it('stays offline with a wrong fuse', () => {
    powerUpEngines();
    installFuse('15A');
    setValve(0, VALVE_TARGETS[0]); setValve(1, VALVE_TARGETS[1]); setValve(2, VALVE_TARGETS[2]);
    expect(enginesOnline(gameStore.getState())).toBe(false);
  });
});

describe('logsAvailable', () => {
  it('starts at 2 and reaches 5 once engines are online', () => {
    expect(logsAvailable(gameStore.getState())).toBe(2);
    routePower('life_support', 'engines', 10);
    routePower('medbay', 'engines', 5);
    routePower('comms', 'engines', 5);
    expect(logsAvailable(gameStore.getState())).toBe(3);
    setValve(0, VALVE_TARGETS[0]); setValve(1, VALVE_TARGETS[1]); setValve(2, VALVE_TARGETS[2]);
    expect(logsAvailable(gameStore.getState())).toBe(4);
    installFuse('10A');
    expect(logsAvailable(gameStore.getState())).toBe(5);
  });
});
