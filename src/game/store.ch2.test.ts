import { beforeEach, describe, expect, it } from 'vitest';
import {
  gameStore, resetGame, startInvestigation, examineMedband, dialSafe, playRecorder, setIrrigation, runIrrigation,
  retrieveSpike, moveCrane, liftCrate, traceCommand, decryptPrivateLog, analyzeSample,
} from './store';
import { irrigationReport, irrigationReportFor } from './derived';

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

  it('remembers the last cycle the AI ran and forgets it when a valve moves', () => {
    investigating();
    expect(gameStore.getState().chapter2.lastCycle).toBeNull();
    setIrrigation(0, 2); setIrrigation(1, 3); setIrrigation(2, 5);
    runIrrigation();
    expect(gameStore.getState().chapter2.lastCycle).toEqual(['dry', 'ok', 'flooded']);
    setIrrigation(0, 4);
    expect(gameStore.getState().chapter2.lastCycle).toBeNull();
    setIrrigation(0, 9); setIrrigation(1, 9); setIrrigation(2, 9);
    runIrrigation(); // over budget: aborts before it starts
    expect(gameStore.getState().chapter2.lastCycle).toBeNull();
  });

  it('irrigationReportFor needs only the seed and the valves', () => {
    expect(irrigationReportFor(0, [4, 3, 3]).solved).toBe(true);
    expect(irrigationReportFor(0, [9, 9, 9]).overBudget).toBe(true);
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
    expect(gameStore.getState().chapter).toBe(3);
    expect(gameStore.getState().checkpoint).toEqual({ chapter: 3, room: 'cargo_bay' });
  });

  it('analyzeSample flips sampleAnalyzed and killswitch in a single, atomic update', () => {
    investigating();
    gameStore.setState({ room: 'cargo_bay' });
    moveCrane('down'); moveCrane('down'); moveCrane('right'); liftCrate();
    const seen: { sampleAnalyzed: boolean; killswitch: string }[] = [];
    const unsub = gameStore.subscribe((s) => seen.push({ sampleAnalyzed: s.chapter2.sampleAnalyzed, killswitch: s.killswitch }));
    analyzeSample('7741');
    unsub();
    // A subscriber must never observe sampleAnalyzed:true with killswitch still
    // 'dormant' — that half-updated state is exactly what two sequential
    // setState calls would let a listener see.
    expect(seen).toEqual([{ sampleAnalyzed: true, killswitch: 'stirring' }]);
  });
});

describe('wrong-room refusals', () => {
  it('dialSafe refuses outside crew quarters and leaves the safe closed', () => {
    investigating();
    gameStore.setState({ room: 'medbay' });
    expect(dialSafe([9, 4, 1]).ok).toBe(false);
    expect(gameStore.getState().chapter2.safeOpened).toBe(false);
  });

  it('liftCrate refuses outside the cargo bay and leaves the crate down', () => {
    investigating();
    gameStore.setState({ room: 'hydroponics' });
    expect(liftCrate().ok).toBe(false);
    expect(gameStore.getState().chapter2.crateLifted).toBe(false);
  });
});
