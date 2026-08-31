import { beforeEach, describe, expect, it } from 'vitest';
import {
  gameStore, resetGame, plugCable, energize, seatGear, setPhase, takeStarFix, computeTrajectory,
  unlockDoor, enterRoom, routePower, breakSeal, initiateLaunch, confirmLaunch, holdHandle,
  startInvestigation, liftDrawing, turnSafeKey, dialSafe, decryptPrivateLog,
  setIrrigation, runIrrigation, retrieveSpike,
  moveCrane, liftCrate, lowerCrate, analyzeSample,
} from './store';
import { coilsCorrect, enginesOnline, gearCorrect, logsAvailable, valvesCorrect, sweepDeficitsFor } from './derived';
import { variantFor, variantSecretsFor, DRAWINGS, tiersFor } from './variants';
import { STAR_FIX } from './content';
import { secretsFor } from './secrets';

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

  it('normalizes drift-fix codes that lost their leading zero: an agent passing numbers still resolves', () => {
    resetGame(S_DV);
    gameStore.setState({ room: 'bridge', act: 3 });
    takeStarFix();
    // numbers lose their zeros ('08' -> 8); the store restores them before comparing
    const numeric = variantSecretsFor(S_DV).driftFix.map(Number) as unknown as string[];
    expect(computeTrajectory(numeric).ok).toBe(true);
    expect(gameStore.getState().trajectorySet).toBe(true);
  });
});

describe('chapter-1 full walk (seed 8: variant 1 in all three rooms)', () => {
  const SEED = 8;
  const T0 = 9_000_000;

  it('rolls variant 1 for cryo_bay, engineering, and bridge', () => {
    expect(variantFor(SEED, 'cryo_bay')).toBe(1);
    expect(variantFor(SEED, 'engineering')).toBe(1);
    expect(variantFor(SEED, 'bridge')).toBe(1);
  });

  it('walks the patch bay, coil drive, and drift fix through the store to a leave_knowing launch', () => {
    resetGame(SEED);

    // cryo bay: wire the patch bay and bring auxiliary power online
    const cableBuses = variantSecretsFor(SEED).cableBuses;
    plugCable(0, cableBuses[0]); plugCable(1, cableBuses[1]); plugCable(2, cableBuses[2]);
    expect(energize().ok).toBe(true);
    expect(gameStore.getState().auxPower).toBe(true);

    // walk through to engineering
    expect(unlockDoor('cryo_exit', secretsFor(SEED).authCode).ok).toBe(true);
    expect(enterRoom('engineering').ok).toBe(true);
    expect(gameStore.getState().act).toBe(2);

    // route power off the initial allocation: engines need 20u, doors need 5u
    expect(routePower('life_support', 'engines', 10).ok).toBe(true);
    expect(routePower('medbay', 'engines', 5).ok).toBe(true);
    expect(routePower('comms', 'engines', 5).ok).toBe(true);
    expect(routePower('comms', 'doors', 5).ok).toBe(true);
    expect(gameStore.getState().powerAllocation.engines).toBe(20);
    expect(gameStore.getState().powerAllocation.doors).toBe(5);

    // seat the coupling gear and dial in the coil phases
    const v = variantSecretsFor(SEED);
    expect(seatGear(v.gearTeeth.target).ok).toBe(true);
    setPhase(0, v.coilPhases[0]); setPhase(1, v.coilPhases[1]); setPhase(2, v.coilPhases[2]);
    expect(enginesOnline(gameStore.getState())).toBe(true);

    // walk through to the bridge
    expect(unlockDoor('engineering_exit').ok).toBe(true);
    expect(enterRoom('bridge').ok).toBe(true);
    expect(gameStore.getState().act).toBe(3);

    // bridge: drift fix, seal, launch
    takeStarFix();
    expect(computeTrajectory([...v.driftFix]).ok).toBe(true);
    expect(gameStore.getState().trajectorySet).toBe(true);
    expect(breakSeal().ok).toBe(true);

    expect(initiateLaunch(secretsFor(SEED).launchAuth, T0).ok).toBe(true);
    holdHandle(true);
    const conf = confirmLaunch(T0 + 1000);
    expect(conf.ok).toBe(true);
    expect(gameStore.getState().won).toBe(true);
    expect(gameStore.getState().ending).toBe('leave_knowing');
  });
});

// ---------------------------------------------------------------- chapter 2

const S_KS = findSeed((s) => variantFor(s, 'crew_quarters') === 1);
const S_HP = findSeed((s) => variantFor(s, 'hydroponics') === 1);
const S_SD = findSeed((s) => variantFor(s, 'cargo_bay') === 1);

function investigating(seed: number, room: 'crew_quarters' | 'hydroponics' | 'cargo_bay') {
  resetGame(seed);
  gameStore.setState({ room: 'bridge', act: 3, trajectorySet: true, sealedLogRead: true });
  startInvestigation();
  gameStore.setState({ room });
}

function driveTo(index: number) {
  for (let i = 0; i < 2; i++) { moveCrane('up'); moveCrane('left'); } // home
  for (let r = 0; r < Math.floor(index / 3); r++) moveCrane('down');
  for (let c = 0; c < index % 3; c++) moveCrane('right');
}

describe('keyed safe (crew quarters variant 1)', () => {
  it('exists only on a keyed ship, only in the crew quarters, and the wheels refuse there', () => {
    investigating(0, 'crew_quarters');
    expect(liftDrawing(0).ok).toBe(false);
    expect(turnSafeKey().ok).toBe(false);
    expect(dialSafe(secretsFor(0).safeCombo).ok).toBe(true); // the classic safe is untouched
    investigating(S_KS, 'hydroponics');
    expect(liftDrawing(0).ok).toBe(false);
    gameStore.setState({ room: 'crew_quarters' });
    expect(dialSafe(secretsFor(S_KS).safeCombo).ok).toBe(false);
    expect(dialSafe(secretsFor(S_KS).safeCombo).message).toMatch(/no wheels/);
    expect(gameStore.getState().chapter2.safeOpened).toBe(false);
  });

  it('a wrong drawing changes nothing; the right one yields the key; the key opens the safe and the log', () => {
    investigating(S_KS, 'crew_quarters');
    const at = variantSecretsFor(S_KS).keyDrawing;
    const wrong = (at + 1) % DRAWINGS.length;
    expect(turnSafeKey().ok).toBe(false); // no key yet
    const miss = liftDrawing(wrong as 0 | 1 | 2 | 3 | 4 | 5);
    expect(miss.ok).toBe(false);
    expect(miss.message).toContain(DRAWINGS[wrong]);
    expect(gameStore.getState().chapter2v.keyFound).toBe(false);
    expect(liftDrawing(at as 0 | 1 | 2 | 3 | 4 | 5).ok).toBe(true);
    expect(gameStore.getState().chapter2v.keyFound).toBe(true);
    expect(decryptPrivateLog().ok).toBe(false); // still locked
    expect(turnSafeKey().ok).toBe(true);
    expect(gameStore.getState().chapter2.safeOpened).toBe(true);
    expect(decryptPrivateLog().ok).toBe(true);
    expect(turnSafeKey().ok).toBe(true); // idempotent once open
  });
});

describe('moisture sweep (hydroponics variant 1)', () => {
  it('the classic ship never reports deficits', () => {
    investigating(0, 'hydroponics');
    const sweep = runIrrigation();
    expect(sweep).not.toHaveProperty('deficits');
    expect(sweep.message).not.toMatch(/reads closed lines only/);
  });

  it('closed lines read their deficit, open lines read null; the numbers then solve the manifold', () => {
    investigating(S_HP, 'hydroponics');
    const needs = secretsFor(S_HP).waterNeeds;
    const sweep = runIrrigation();
    expect(sweep.ok).toBe(true);
    expect(sweep.deficits).toEqual([...needs]);
    expect(sweep.beds).toEqual(['dry', 'dry', 'dry']);
    expect(sweep.solved).toBe(false);
    expect(sweep.message).toMatch(/Moisture sweep/);
    expect(gameStore.getState().chapter2.lastCycle).toEqual(['dry', 'dry', 'dry']);
    setIrrigation(0, needs[0]);
    const partial = runIrrigation();
    expect(partial.deficits).toEqual([null, needs[1], needs[2]]);
    expect(partial.beds[0]).toBe('ok');
    // all three valves open (non-zero, and wrong): no closed lines, so the probe steers back to valve 0
    const wrong = needs.map((n) => (n === 1 ? 2 : 1));
    setIrrigation(0, wrong[0]); setIrrigation(1, wrong[1]); setIrrigation(2, wrong[2]);
    const noClosed = runIrrigation();
    expect(noClosed.message).toMatch(/reads closed lines only/);
    setIrrigation(0, needs[0]);
    setIrrigation(1, needs[1]);
    setIrrigation(2, needs[2]);
    const done = runIrrigation();
    expect(done.solved).toBe(true);
    expect(done.deficits).toEqual([null, null, null]);
    expect(gameStore.getState().chapter2.irrigationSolved).toBe(true);
    expect(retrieveSpike().ok).toBe(true);
    expect(sweepDeficitsFor(S_HP, [0, needs[1], 0])).toEqual([needs[0], null, needs[2]]);
  });
});

describe('stacked bay (cargo variant 1)', () => {
  it('the classic crane has no LOWER and lifts straight from the slot', () => {
    investigating(0, 'cargo_bay');
    expect(lowerCrate().ok).toBe(false);
    expect(gameStore.getState().chapter2v.tiers).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1]);
    const q = secretsFor(0).quarantineSlot;
    driveTo(q.row * 3 + q.col);
    expect(liftCrate().ok).toBe(true);
    expect(gameStore.getState().chapter2.crateLifted).toBe(true);
  });

  it('pallet up, park it, come back, lift the container, name the Kestrel', () => {
    investigating(S_SD, 'cargo_bay');
    const q = secretsFor(S_SD).quarantineSlot;
    const qi = q.row * 3 + q.col;
    const { stackSlots } = variantSecretsFor(S_SD);
    expect(gameStore.getState().chapter2v.tiers).toEqual(tiersFor(S_SD));
    const single = tiersFor(S_SD).findIndex((t, i) => t === 1 && i !== qi);
    expect(lowerCrate().ok).toBe(false); // nothing on the hook
    driveTo(qi);
    const pallet = liftCrate();
    expect(pallet.ok).toBe(true);
    expect(gameStore.getState().chapter2.crateLifted).toBe(false);
    expect(gameStore.getState().chapter2v.held).toBe(true);
    expect(gameStore.getState().chapter2v.tiers[qi]).toBe(1);
    expect(liftCrate().ok).toBe(false); // one crate at a time
    expect(gameStore.getState().chapter2.crateLifted).toBe(false);
    driveTo(stackSlots[0]);
    expect(lowerCrate().ok).toBe(false); // that slot is already two high
    expect(gameStore.getState().chapter2v.held).toBe(true);
    driveTo(single);
    expect(lowerCrate().ok).toBe(true);
    expect(gameStore.getState().chapter2v.held).toBe(false);
    expect(gameStore.getState().chapter2v.tiers[single]).toBe(2);
    driveTo(qi);
    expect(liftCrate().ok).toBe(true);
    expect(gameStore.getState().chapter2.crateLifted).toBe(true);
    expect(analyzeSample(secretsFor(S_SD).registryFragment).ok).toBe(true);
    expect(gameStore.getState().chapter).toBe(3);
    expect(gameStore.getState().checkpoint).toEqual({ chapter: 3, room: 'cargo_bay' });
  });

  it('a decoy stack lifts and parks like any pallet; a single wrong crate is refused as before', () => {
    investigating(S_SD, 'cargo_bay');
    const q = secretsFor(S_SD).quarantineSlot;
    const qi = q.row * 3 + q.col;
    const { stackSlots } = variantSecretsFor(S_SD);
    const single = tiersFor(S_SD).findIndex((t, i) => t === 1 && i !== qi);
    driveTo(single);
    expect(liftCrate().ok).toBe(false); // ordinary crate, one high, wrong slot
    expect(gameStore.getState().chapter2v.held).toBe(false);
    driveTo(stackSlots[1]);
    expect(liftCrate().ok).toBe(true);
    expect(gameStore.getState().chapter2v.held).toBe(true);
    driveTo(qi);
    expect(lowerCrate().ok).toBe(false); // the quarantine slot is still two high
    driveTo(single);
    expect(lowerCrate().ok).toBe(true);
  });
});
