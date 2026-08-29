import { beforeEach, describe, expect, it } from 'vitest';
import { gameStore, resetGame, removeGrate, flipBreaker, unlockDoor, enterRoom } from './store';
import { AUTH_CODE } from './content';

beforeEach(() => resetGame(0));

describe('aux power breakers', () => {
  it('turns aux power on for the correct sequence C, A, B', () => {
    flipBreaker('C'); flipBreaker('A'); flipBreaker('B');
    expect(gameStore.getState().auxPower).toBe(true);
  });

  it('resets flipped breakers on a wrong order', () => {
    flipBreaker('A');
    expect(gameStore.getState().breakersFlipped).toEqual([]);
    expect(gameStore.getState().auxPower).toBe(false);
  });

  it('ignores flips once aux power is on', () => {
    flipBreaker('C'); flipBreaker('A'); flipBreaker('B');
    flipBreaker('C');
    expect(gameStore.getState().auxPower).toBe(true);
  });
});

describe('cryo exit door', () => {
  it('refuses without aux power', () => {
    const r = unlockDoor('cryo_exit', AUTH_CODE);
    expect(r.ok).toBe(false);
    expect(gameStore.getState().doors.cryo_exit).toBe(false);
  });

  it('refuses a wrong auth code', () => {
    flipBreaker('C'); flipBreaker('A'); flipBreaker('B');
    expect(unlockDoor('cryo_exit', '9999').ok).toBe(false);
  });

  it('unlocks with aux power and the right code', () => {
    flipBreaker('C'); flipBreaker('A'); flipBreaker('B');
    expect(unlockDoor('cryo_exit', AUTH_CODE).ok).toBe(true);
    expect(gameStore.getState().doors.cryo_exit).toBe(true);
  });

  it('success message tells the agent the human must walk through', () => {
    // Playtest regression: agents unlocked the door and then waited for act-2
    // tools to appear, not knowing progression needs the human's physical step.
    flipBreaker('C'); flipBreaker('A'); flipBreaker('B');
    const r = unlockDoor('cryo_exit', AUTH_CODE);
    expect(r.message).toMatch(/walk|step/i);
  });
});

describe('room movement', () => {
  it('blocks engineering while cryo_exit is locked', () => {
    expect(enterRoom('engineering').ok).toBe(false);
    expect(gameStore.getState().room).toBe('cryo_bay');
  });

  it('enters engineering through an unlocked door and advances to act 2', () => {
    flipBreaker('C'); flipBreaker('A'); flipBreaker('B');
    unlockDoor('cryo_exit', AUTH_CODE);
    expect(enterRoom('engineering').ok).toBe(true);
    expect(gameStore.getState().room).toBe('engineering');
    expect(gameStore.getState().act).toBe(2);
  });

  it('refuses compartments sealed until a later chapter', () => {
    const r = enterRoom('medbay');
    expect(r.ok).toBe(false);
    expect(gameStore.getState().room).toBe('cryo_bay');
  });
});
