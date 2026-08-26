import { beforeEach, describe, expect, it } from 'vitest';
import {
  gameStore, resetGame, computeTrajectory, initiateLaunch, confirmLaunch, holdHandle, takeStarFix,
} from './store';
import { LAUNCH_AUTH, LAUNCH_WINDOW_MS, STAR_FIX } from './content';

const T0 = 1_000_000;

beforeEach(() => {
  resetGame();
  gameStore.setState({ room: 'bridge', act: 3 });
});

describe('computeTrajectory', () => {
  it('refuses without an optical fix taken at the viewport', () => {
    expect(computeTrajectory([...STAR_FIX]).ok).toBe(false);
    expect(gameStore.getState().trajectorySet).toBe(false);
  });

  it('rejects a wrong star fix', () => {
    takeStarFix();
    expect(computeTrajectory(['KAV', 'KAV', 'KAV']).ok).toBe(false);
    expect(gameStore.getState().trajectorySet).toBe(false);
  });

  it('accepts the correct star fix regardless of case', () => {
    takeStarFix();
    expect(computeTrajectory([...STAR_FIX].map((x) => x.toLowerCase())).ok).toBe(true);
    expect(gameStore.getState().trajectorySet).toBe(true);
  });
});

describe('launch sequence', () => {
  function ready() {
    takeStarFix();
    computeTrajectory([...STAR_FIX]);
  }

  it('refuses to initiate without a trajectory', () => {
    expect(initiateLaunch(LAUNCH_AUTH, T0).ok).toBe(false);
  });

  it('refuses to initiate while the crew member is off the bridge', () => {
    ready();
    gameStore.setState({ room: 'engineering' });
    expect(initiateLaunch(LAUNCH_AUTH, T0).ok).toBe(false);
    expect(gameStore.getState().launch.phase).toBe('idle');
  });

  it('re-arms after an expired window instead of refusing forever', () => {
    ready();
    initiateLaunch(LAUNCH_AUTH, T0);
    const later = T0 + LAUNCH_WINDOW_MS + 1;
    const r = initiateLaunch(LAUNCH_AUTH, later);
    expect(r.ok).toBe(true);
    expect(gameStore.getState().launch.countdownEndsAt).toBe(later + LAUNCH_WINDOW_MS);
  });

  it('still refuses a second initiate while the window is live', () => {
    ready();
    initiateLaunch(LAUNCH_AUTH, T0);
    expect(initiateLaunch(LAUNCH_AUTH, T0 + 1000).ok).toBe(false);
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
