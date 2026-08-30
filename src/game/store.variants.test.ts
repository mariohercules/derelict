import { beforeEach, describe, expect, it } from 'vitest';
import { gameStore, resetGame, plugCable, energize, seatGear, setPhase, takeStarFix, computeTrajectory } from './store';
import { coilsCorrect, enginesOnline, gearCorrect, logsAvailable, valvesCorrect } from './derived';
import { variantFor, variantSecretsFor } from './variants';
import { STAR_FIX } from './content';

function findSeed(pred: (seed: number) => boolean): number {
  for (let seed = 1; seed < 5000; seed++) if (pred(seed)) return seed;
  throw new Error('no seed found');
}
const S_PB = findSeed((s) => variantFor(s, 'cryo_bay') === 1);
const S_GC = findSeed((s) => variantFor(s, 'engineering') === 1 && variantSecretsFor(s).coilPhases.some((p) => p !== 0));
const S_DV = findSeed((s) => variantFor(s, 'bridge') === 1);

beforeEach(() => resetGame(0));

describe('patch bay (cryo variant 1)', () => {
  it('exists only on a patch-bay ship and only in the cryo bay', () => {
    expect(energize().ok).toBe(false); // classic ship: no patch bay
    resetGame(S_PB);
    gameStore.setState({ room: 'engineering', doors: { cryo_exit: true, engineering_exit: false }, act: 2 });
    expect(plugCable(0, 1).ok).toBe(false);
  });

  it('one line per bus; ENERGIZE refuses a half-made circuit and wrong wiring, lights on the right one', () => {
    resetGame(S_PB);
    const target = variantSecretsFor(S_PB).cableBuses;
    expect(plugCable(0, 1).ok).toBe(true);
    expect(plugCable(1, 1).ok).toBe(false); // bus 1 taken
    expect(energize().ok).toBe(false); // cables missing
    // deliberately wrong full wiring: rotate the target assignment
    plugCable(0, target[1]); plugCable(1, target[2]); plugCable(2, target[0]);
    expect(energize().ok).toBe(false);
    expect(gameStore.getState().auxPower).toBe(false);
    expect(gameStore.getState().chapter1v.energized).toBe(false);
    // unplug and rewire correctly
    plugCable(0, null); plugCable(1, null); plugCable(2, null);
    plugCable(0, target[0]); plugCable(1, target[1]); plugCable(2, target[2]);
    expect(energize().ok).toBe(true);
    expect(gameStore.getState().auxPower).toBe(true);
    expect(gameStore.getState().chapter1v.energized).toBe(true);
  });
});

describe('coils and gear (engineering variant 1)', () => {
  function inEngineering() {
    resetGame(S_GC);
    gameStore.setState((s) => ({
      room: 'engineering', act: 2, auxPower: true, doors: { cryo_exit: true, engineering_exit: false },
      powerAllocation: { ...s.powerAllocation, engines: 20, life_support: 15, comms: 0, medbay: 5, doors: 0 },
    }));
  }

  it('the tray holds three gears; only the schematic\'s count couples; phases finish the job', () => {
    inEngineering();
    const v = variantSecretsFor(S_GC);
    expect(seatGear(99).ok).toBe(false); // no such gear
    expect(seatGear(v.gearTeeth.decoys[0]).ok).toBe(true); // seats, but wrong
    setPhase(0, v.coilPhases[0]); setPhase(1, v.coilPhases[1]); setPhase(2, v.coilPhases[2]);
    expect(gearCorrect(gameStore.getState())).toBe(false);
    expect(enginesOnline(gameStore.getState())).toBe(false);
    seatGear(v.gearTeeth.target);
    expect(gearCorrect(gameStore.getState())).toBe(true);
    expect(coilsCorrect(gameStore.getState())).toBe(true);
    expect(enginesOnline(gameStore.getState())).toBe(true);
    setPhase(1, (v.coilPhases[1] + 1) % 12);
    expect(enginesOnline(gameStore.getState())).toBe(false);
  });

  it('a coil-drive ship has no valves puzzle: valvesCorrect is true, logs key off the coils', () => {
    inEngineering();
    expect(valvesCorrect(gameStore.getState())).toBe(true);
    const v = variantSecretsFor(S_GC);
    const before = logsAvailable(gameStore.getState());
    setPhase(0, v.coilPhases[0]); setPhase(1, v.coilPhases[1]); setPhase(2, v.coilPhases[2]);
    expect(logsAvailable(gameStore.getState())).toBe(before + 1);
  });

  it('the gear tray exists only on a coil-drive ship', () => {
    resetGame(0);
    gameStore.setState({ room: 'engineering', act: 2 });
    expect(seatGear(17).ok).toBe(false);
  });
});

describe('drift correction (bridge variant 1)', () => {
  it('the trajectory accepts the drift fix, not the glyphs, on a drift ship — and the classic ship is untouched', () => {
    resetGame(S_DV);
    gameStore.setState({ room: 'bridge', act: 3 });
    takeStarFix();
    expect(computeTrajectory([...STAR_FIX]).ok).toBe(false);
    const fix = variantSecretsFor(S_DV).driftFix;
    expect(computeTrajectory([...fix]).ok).toBe(true);
    expect(gameStore.getState().trajectorySet).toBe(true);
    resetGame(0);
    gameStore.setState({ room: 'bridge', act: 3 });
    takeStarFix();
    expect(computeTrajectory([...STAR_FIX]).ok).toBe(true);
  });
});
