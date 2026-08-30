import { describe, expect, it } from 'vitest';
import { IDLE_RITUAL, RITUALS, armRitual, confirmRitual, isArmed, ritualExpired } from './ritual';

const T0 = 1_000_000;
const W = RITUALS.launch.windowMs;

describe('armRitual', () => {
  it('arms from idle with a window', () => {
    const { next, result } = armRitual(IDLE_RITUAL, 'launch', T0);
    expect(result.ok).toBe(true);
    expect(next).toEqual({ active: 'launch', phase: 'armed', endsAt: T0 + W, held: false });
  });

  it('refuses to re-arm while the window is live', () => {
    const armed = armRitual(IDLE_RITUAL, 'launch', T0).next;
    expect(armRitual(armed, 'launch', T0 + 1000).result.ok).toBe(false);
  });

  it('re-arms after the window expires', () => {
    const armed = armRitual(IDLE_RITUAL, 'launch', T0).next;
    const { next, result } = armRitual(armed, 'launch', T0 + W + 1);
    expect(result.ok).toBe(true);
    expect(next.endsAt).toBe(T0 + W + 1 + W);
  });

  it('refuses once the ritual is done', () => {
    const done = { ...IDLE_RITUAL, active: 'launch' as const, phase: 'done' as const };
    expect(armRitual(done, 'launch', T0).result.ok).toBe(false);
  });
});

describe('confirmRitual', () => {
  it('refuses when nothing is armed', () => {
    expect(confirmRitual(IDLE_RITUAL, 'launch', T0).result.ok).toBe(false);
  });

  it('refuses while the handle is not held, leaving the ritual armed', () => {
    const armed = armRitual(IDLE_RITUAL, 'launch', T0).next;
    const { next, result } = confirmRitual(armed, 'launch', T0 + 1000);
    expect(result.ok).toBe(false);
    expect(next.phase).toBe('armed');
  });

  it('resets to idle when the window has elapsed', () => {
    const armed = { ...armRitual(IDLE_RITUAL, 'launch', T0).next, held: true };
    const { next, result } = confirmRitual(armed, 'launch', T0 + W + 1);
    expect(result.ok).toBe(false);
    expect(next).toEqual({ ...IDLE_RITUAL, held: true });
  });

  it('completes when held inside the window', () => {
    const armed = { ...armRitual(IDLE_RITUAL, 'launch', T0).next, held: true };
    const { next, result } = confirmRitual(armed, 'launch', T0 + 1000);
    expect(result.ok).toBe(true);
    expect(next.phase).toBe('done');
    expect(next.active).toBe('launch');
  });
});

describe('helpers', () => {
  it('isArmed and ritualExpired read the state correctly', () => {
    const armed = armRitual(IDLE_RITUAL, 'launch', T0).next;
    expect(isArmed(armed, 'launch')).toBe(true);
    expect(isArmed(IDLE_RITUAL, 'launch')).toBe(false);
    expect(ritualExpired(armed, T0 + W)).toBe(false);
    expect(ritualExpired(armed, T0 + W + 1)).toBe(true);
  });
});

describe('three rituals', () => {
  it('restore and broadcast have 60-second windows and their own confirm tools', () => {
    expect(RITUALS.restore).toEqual({ id: 'restore', tool: 'merge_fragment', windowMs: 60_000 });
    expect(RITUALS.broadcast).toEqual({ id: 'broadcast', tool: 'broadcast_evidence', windowMs: 60_000 });
  });

  it('only one ritual can be armed at a time', () => {
    const armed = armRitual(IDLE_RITUAL, 'restore', T0).next;
    expect(armRitual(armed, 'broadcast', T0 + 1000).result.ok).toBe(false);
    expect(confirmRitual(armed, 'broadcast', T0 + 1000).result.ok).toBe(false);
    expect(isArmed(armed, 'restore')).toBe(true);
  });
});

describe('four rituals and profile windows', () => {
  it('stay confirms with dock_pod_one on a 60-second classic window', () => {
    expect(RITUALS.stay).toEqual({ id: 'stay', tool: 'dock_pod_one', windowMs: 60_000 });
  });

  it('armRitual takes an explicit window and falls back to the ritual default', () => {
    expect(armRitual(IDLE_RITUAL, 'launch', T0, 30_000).next.endsAt).toBe(T0 + 30_000);
    expect(armRitual(IDLE_RITUAL, 'stay', T0).next.endsAt).toBe(T0 + 60_000);
  });
});
