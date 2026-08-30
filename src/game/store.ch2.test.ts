import { beforeEach, describe, expect, it } from 'vitest';
import {
  gameStore, resetGame, startInvestigation, examineMedband, dialSafe, playRecorder, setIrrigation, runIrrigation,
  retrieveSpike, moveCrane, liftCrate, traceCommand, decryptPrivateLog, analyzeSample,
} from './store';
import { irrigationReport } from './derived';

function investigating() {
  resetGame(0);
  gameStore.setState({ room: 'bridge', act: 3, trajectorySet: true, sealedLogRead: true });
  startInvestigation();
}

beforeEach(() => resetGame(0));

describe('startInvestigation', () => {
  it('needs the bridge and the broken seal', () => {
    expect(startInvestigation().ok).toBe(false);
    gameStore.setState({ room: 'bridge', trajectorySet: true });
    expect(startInvestigation().ok).toBe(false);
    gameStore.setState({ sealedLogRead: true });
    expect(startInvestigation().ok).toBe(true);
    expect(gameStore.getState().chapter).toBe(2);
    expect(gameStore.getState().checkpoint).toEqual({ chapter: 2, room: 'bridge' });
  });
});

describe('medbay', () => {
  it('examining the band and tracing the command set their flags', () => {
    investigating();
    examineMedband();
    expect(traceCommand().ok).toBe(true);
    expect(gameStore.getState().chapter2.medbandExamined).toBe(true);
    expect(gameStore.getState().chapter2.commandTraced).toBe(true);
  });
});

describe('crew quarters', () => {
  it('the safe opens only on the classic combination 9-4-1', () => {
    investigating();
    gameStore.setState({ room: 'crew_quarters' });
    expect(dialSafe([1, 2, 3]).ok).toBe(false);
    expect(gameStore.getState().chapter2.safeOpened).toBe(false);
    expect(dialSafe([9, 4, 1]).ok).toBe(true);
    expect(gameStore.getState().chapter2.safeOpened).toBe(true);
  });

  it('the private log decrypts only after the safe is open', () => {
    investigating();
    expect(decryptPrivateLog().ok).toBe(false);
    gameStore.setState({ room: 'crew_quarters' });
    dialSafe([9, 4, 1]);
    expect(decryptPrivateLog().ok).toBe(true);
    playRecorder();
    expect(gameStore.getState().chapter2.recorderPlayed).toBe(true);
  });
});

describe('hydroponics', () => {
  it('reports dry/ok/flooded per bed and refuses an over-budget cycle', () => {
    investigating();
    setIrrigation(0, 9); setIrrigation(1, 9); setIrrigation(2, 9);
    const over = runIrrigation();
    expect(over.ok).toBe(false);
    setIrrigation(0, 2); setIrrigation(1, 3); setIrrigation(2, 5);
    const r = runIrrigation();
    expect(r.ok).toBe(true);
    expect(r.beds).toEqual(['dry', 'ok', 'flooded']);
    expect(r.solved).toBe(false);
  });

  it('solving the cycle reveals the spike', () => {
    investigating();
    expect(retrieveSpike().ok).toBe(false);
    setIrrigation(0, 4); setIrrigation(1, 3); setIrrigation(2, 3);
    expect(runIrrigation().solved).toBe(true);
    expect(irrigationReport(gameStore.getState()).solved).toBe(true);
    expect(retrieveSpike().ok).toBe(true);
    expect(gameStore.getState().chapter2.spikeRetrieved).toBe(true);
  });
});

describe('cargo bay', () => {
  it('the crane lifts the quarantine crate only at its slot', () => {
    investigating();
    gameStore.setState({ room: 'cargo_bay' });
    expect(liftCrate().ok).toBe(false); // A1 is an ordinary crate
    moveCrane('down'); moveCrane('down'); moveCrane('right');
    expect(gameStore.getState().chapter2.craneAt).toEqual({ row: 2, col: 1 });
    expect(liftCrate().ok).toBe(true);
    expect(gameStore.getState().chapter2.crateLifted).toBe(true);
  });

  it('the crane stays inside the 3x3 grid', () => {
    investigating();
    moveCrane('up'); moveCrane('left');
    expect(gameStore.getState().chapter2.craneAt).toEqual({ row: 0, col: 0 });
    for (let i = 0; i < 5; i++) { moveCrane('down'); moveCrane('right'); }
    expect(gameStore.getState().chapter2.craneAt).toEqual({ row: 2, col: 2 });
  });

  it('analyzing the right registry fragment names the Kestrel and wakes the kill-switch', () => {
    investigating();
    gameStore.setState({ room: 'cargo_bay' });
    expect(analyzeSample('7741').ok).toBe(false); // nothing lifted yet
    moveCrane('down'); moveCrane('down'); moveCrane('right'); liftCrate();
    expect(analyzeSample('0000').ok).toBe(false);
    expect(gameStore.getState().killswitch).toBe('dormant');
    expect(analyzeSample('7741').ok).toBe(true);
    expect(gameStore.getState().chapter2.sampleAnalyzed).toBe(true);
    expect(gameStore.getState().killswitch).toBe('stirring');
  });
});
