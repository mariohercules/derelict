import { beforeEach, describe, expect, it } from 'vitest';
import {
  gameStore, resetGame, startInvestigation, moveCrane, liftCrate, analyzeSample, enterRoom, routePower, cutIsolation,
  tickKillswitch, initiateLaunch, seatColumn, seatKernel, setDish, openBand,
} from './store';
import { nextShieldCost } from './derived';
import { LAUNCH_AUTH } from './content';

const T0 = 7_000_000;

function kestrel(ngPlus: boolean, now = T0) {
  resetGame(0, { ngPlus });
  gameStore.setState({ room: 'bridge', act: 3, trajectorySet: true, sealedLogRead: true, doors: { cryo_exit: true, engineering_exit: true } });
  startInvestigation();
  gameStore.setState({ room: 'cargo_bay' });
  moveCrane('down'); moveCrane('down'); moveCrane('right'); liftCrate();
  analyzeSample('7741', now);
}

beforeEach(() => resetGame(0));

describe('New Game+ pressure profile', () => {
  it('naming the Kestrel wakes the kill-switch at once, clock at now, first phase calm', () => {
    kestrel(true);
    const s = gameStore.getState();
    expect(s.ngPlus).toBe(true);
    expect(s.killswitch).toBe('active');
    expect(s.chapter3.cycleStartedAt).toBe(T0);
    expect(s.chapter3.wave).toBe('calm');
    // stepping onto the lower deck does not restart the clock
    gameStore.setState({ room: 'engineering' });
    enterRoom('reactor_room', T0 + 5000);
    expect(gameStore.getState().chapter3.cycleStartedAt).toBe(T0);
  });

  it('the classic profile still only stirs at the Kestrel and wakes on the lower deck', () => {
    kestrel(false);
    expect(gameStore.getState().killswitch).toBe('stirring');
    expect(gameStore.getState().chapter3.cycleStartedAt).toBeNull();
  });

  it('waves run 20 / 8 / 25 seconds and a throttled jump still lands on warning', () => {
    kestrel(true);
    tickKillswitch(T0 + 20_001);
    expect(gameStore.getState().chapter3.wave).toBe('warning');
    tickKillswitch(T0 + 28_001);
    expect(gameStore.getState().chapter3.wave).toBe('active');
    tickKillswitch(T0 + 53_001);
    expect(gameStore.getState().chapter3.wave).toBe('calm');
    expect(gameStore.getState().chapter3.wavesEndured).toBe(1);
    tickKillswitch(T0 + 53_001 + 30_000); // straight into the next active window
    expect(gameStore.getState().chapter3.wave).toBe('warning');
  });

  it('ritual windows are 30 s for LEAVE and 40 s for RESTORE and BROADCAST', () => {
    kestrel(true);
    gameStore.setState({ room: 'bridge' });
    expect(initiateLaunch(LAUNCH_AUTH, T0).ok).toBe(true);
    expect(gameStore.getState().ritual.endsAt).toBe(T0 + 30_000);
    resetGame(0, { ngPlus: true });
    gameStore.setState({ room: 'core_vault', chapter: 3 });
    seatColumn(0, 'C'); seatColumn(1, 'A'); seatColumn(2, 'D'); seatColumn(3, 'B');
    expect(seatKernel(T0).ok).toBe(true);
    expect(gameStore.getState().ritual.endsAt).toBe(T0 + 40_000);
    resetGame(0, { ngPlus: true });
    gameStore.setState((s) => ({ room: 'comms_array', chapter: 3, chapter3: { ...s.chapter3, cacheRead: true } }));
    setDish('az', 217); setDish('el', 34);
    expect(openBand(T0).ok).toBe(true);
    expect(gameStore.getState().ritual.endsAt).toBe(T0 + 40_000);
  });

  it('shielding costs 6u per bus and the feed holds it', () => {
    kestrel(true);
    gameStore.setState({ room: 'reactor_room' });
    expect(nextShieldCost(gameStore.getState())).toBe(6);
    routePower('comms', 'isolation', 5);
    expect(cutIsolation('core').ok).toBe(false);
    routePower('comms', 'isolation', 1);
    expect(cutIsolation('core').ok).toBe(true);
    expect(routePower('isolation', 'engines', 1).ok).toBe(false);
    expect(nextShieldCost(gameStore.getState())).toBe(12);
  });
});
