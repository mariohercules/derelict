import { beforeEach, describe, expect, it } from 'vitest';
import {
  gameStore, resetGame, computeTrajectory, initiateLaunch, confirmLaunch, holdHandle, takeStarFix, breakSeal, enterRoom,
} from './store';
import { LAUNCH_AUTH, LAUNCH_WINDOW_MS, STAR_FIX } from './content';

const T0 = 1_000_000;

beforeEach(() => {
  resetGame(0);
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
    expect(gameStore.getState().ritual.phase).toBe('idle');
  });

  it('re-arms after an expired window instead of refusing forever', () => {
    ready();
    initiateLaunch(LAUNCH_AUTH, T0);
    const later = T0 + LAUNCH_WINDOW_MS + 1;
    const r = initiateLaunch(LAUNCH_AUTH, later);
    expect(r.ok).toBe(true);
    expect(gameStore.getState().ritual.endsAt).toBe(later + LAUNCH_WINDOW_MS);
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
    const l = gameStore.getState().ritual;
    expect(l.phase).toBe('armed');
    expect(l.endsAt).toBe(T0 + LAUNCH_WINDOW_MS);
  });

  it('confirm fails while the handle is not held', () => {
    ready();
    initiateLaunch(LAUNCH_AUTH, T0);
    expect(confirmLaunch(T0 + 1000).ok).toBe(false);
    expect(gameStore.getState().ritual.phase).toBe('armed');
  });

  it('confirm succeeds while the handle is held inside the window — game won', () => {
    ready();
    initiateLaunch(LAUNCH_AUTH, T0);
    holdHandle(true);
    expect(confirmLaunch(T0 + 1000).ok).toBe(true);
    const s = gameStore.getState();
    expect(s.ritual.phase).toBe('done');
    expect(s.won).toBe(true);
  });

  it('an expired window resets the sequence to idle instead of hard-failing', () => {
    ready();
    initiateLaunch(LAUNCH_AUTH, T0);
    holdHandle(true);
    expect(confirmLaunch(T0 + LAUNCH_WINDOW_MS + 1).ok).toBe(false);
    expect(gameStore.getState().ritual.phase).toBe('idle');
  });

  it('keeps the handle held across an expired window, so a fresh arm+confirm succeeds without re-holding', () => {
    ready();
    initiateLaunch(LAUNCH_AUTH, T0);
    holdHandle(true);
    confirmLaunch(T0 + LAUNCH_WINDOW_MS + 1); // window elapsed; handle is still physically held
    initiateLaunch(LAUNCH_AUTH, T0 + LAUNCH_WINDOW_MS + 2);
    expect(confirmLaunch(T0 + LAUNCH_WINDOW_MS + 3).ok).toBe(true);
    expect(gameStore.getState().won).toBe(true);
  });
});

describe('chapter 1 hook: the sealed log', () => {
  it('cannot be opened before the pre-launch check (trajectory set)', () => {
    expect(breakSeal().ok).toBe(false);
    expect(gameStore.getState().sealedLogRead).toBe(false);
  });

  it('opens once the trajectory is locked, and only on the bridge', () => {
    takeStarFix();
    computeTrajectory([...STAR_FIX]);
    gameStore.setState({ room: 'engineering' });
    expect(breakSeal().ok).toBe(false);
    gameStore.setState({ room: 'bridge' });
    expect(breakSeal().ok).toBe(true);
    expect(gameStore.getState().sealedLogRead).toBe(true);
  });

  it('winning in chapter 1 records the "leave, unknowing" ending', () => {
    takeStarFix();
    computeTrajectory([...STAR_FIX]);
    initiateLaunch(LAUNCH_AUTH, T0);
    holdHandle(true);
    confirmLaunch(T0 + 1000);
    expect(gameStore.getState().ending).toBe('leave_unknowing');
    expect(gameStore.getState().chapter).toBe(1);
  });
});

describe('checkpoints', () => {
  it('reaching the bridge records the chapter 1 checkpoint', () => {
    resetGame(0);
    gameStore.setState({ doors: { cryo_exit: true, engineering_exit: true }, room: 'engineering', act: 2 });
    expect(gameStore.getState().checkpoint).toBeNull();
    enterRoom('bridge');
    expect(gameStore.getState().checkpoint).toEqual({ chapter: 1, room: 'bridge' });
  });
});
