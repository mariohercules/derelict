import { beforeEach, describe, expect, it } from 'vitest';
import {
  gameStore, resetGame, computeTrajectory, initiateLaunch, confirmLaunch, holdHandle,
} from './store';
import { LAUNCH_AUTH, LAUNCH_WINDOW_MS, STAR_FIX } from './content';

const T0 = 1_000_000;

beforeEach(() => {
  resetGame();
  gameStore.setState({ room: 'bridge', act: 3 });
});

describe('computeTrajectory', () => {
  it('rejects a wrong star fix', () => {
    expect(computeTrajectory(['KAV', 'KAV', 'KAV']).ok).toBe(false);
    expect(gameStore.getState().trajectorySet).toBe(false);
  });

  it('accepts the correct star fix regardless of case', () => {
    expect(computeTrajectory([...STAR_FIX].map((x) => x.toLowerCase())).ok).toBe(true);
    expect(gameStore.getState().trajectorySet).toBe(true);
  });
});

describe('launch sequence', () => {
  function ready() {
    computeTrajectory([...STAR_FIX]);
  }

  it('refuses to initiate without a trajectory', () => {
    expect(initiateLaunch(LAUNCH_AUTH, T0).ok).toBe(false);
  });

  it('refuses a wrong authorization', () => {
    ready();
    expect(initiateLaunch('OVERRIDE-BETA', T0).ok).toBe(false);
  });

  it('starts the countdown with trajectory and auth', () => {
    ready();
    expect(initiateLaunch(LAUNCH_AUTH, T0).ok).toBe(true);
    const l = gameStore.getState().launch;
    expect(l.phase).toBe('countdown');
    expect(l.countdownEndsAt).toBe(T0 + LAUNCH_WINDOW_MS);
  });

  it('confirm fails while the handle is not held', () => {
    ready();
    initiateLaunch(LAUNCH_AUTH, T0);
    expect(confirmLaunch(T0 + 1000).ok).toBe(false);
    expect(gameStore.getState().launch.phase).toBe('countdown');
  });

  it('confirm succeeds while the handle is held inside the window — game won', () => {
    ready();
    initiateLaunch(LAUNCH_AUTH, T0);
    holdHandle(true);
    expect(confirmLaunch(T0 + 1000).ok).toBe(true);
    const s = gameStore.getState();
    expect(s.launch.phase).toBe('launched');
    expect(s.won).toBe(true);
  });

  it('an expired window resets the sequence to idle instead of hard-failing', () => {
    ready();
    initiateLaunch(LAUNCH_AUTH, T0);
    holdHandle(true);
    expect(confirmLaunch(T0 + LAUNCH_WINDOW_MS + 1).ok).toBe(false);
    expect(gameStore.getState().launch.phase).toBe('idle');
  });
});
