import { describe, expect, it } from 'vitest';
import { initialState } from '../game/store';
import { CORRECT_FUSE, ENGINES_REQUIRED } from '../game/content';
import { secretsFor } from '../game/secrets';
import { busSignal, machineryCue, threatPhase } from './machinery';

function engineering() {
  return { ...initialState(0), room: 'engineering' as const, auxPower: true };
}

describe('machinery presentation', () => {
  it('keeps protected buses lit while unprotected commands are blocked', () => {
    const s = engineering();
    s.killswitch = 'active';
    s.chapter3.wave = 'active';
    s.chapter3.shielded = ['core'];
    expect(busSignal(s, 'core')).toBe('shielded');
    expect(busSignal(s, 'nav')).toBe('suppressed');
    s.chapter3.wave = 'warning';
    expect(busSignal(s, 'nav')).toBe('exposed');
  });

  it('does not replay an old active wave after containment or victory', () => {
    const s = engineering();
    s.chapter3.wave = 'active';
    s.killswitch = 'contained';
    expect(threatPhase(s)).toBe('contained');
    expect(busSignal(s, 'nav')).toBe('exposed');
    s.killswitch = 'active';
    s.won = true;
    expect(threatPhase(s)).toBe('calm');
  });

  it('does not indicate an attack while the kill-switch is dormant', () => {
    const s = engineering();
    s.chapter3.wave = 'active';
    expect(threatPhase(s)).toBe('stirring');
    expect(busSignal(s, 'nav')).toBe('exposed');
  });
});

describe('material cues', () => {
  it('sounds the same for correct and wrong fuse insertions before startup', () => {
    const before = engineering();
    for (const fuseInstalled of ['5A', '10A', '15A'] as const) {
      expect(machineryCue({ ...before, fuseInstalled }, before)).toBe('fuse');
    }
  });

  it('sounds the same for gear and phase choices, without grading them', () => {
    const before = { ...engineering(), seed: 8 };
    for (const gear of [8, 12, 16]) {
      expect(machineryCue({ ...before, chapter1v: { ...before.chapter1v, gear } }, before)).toBe('gear');
    }
    expect(machineryCue({ ...before, chapter1v: { ...before.chapter1v, phases: [1, 0, 0] } }, before)).toBe('dial');
  });

  it('reserves the startup cue for the fully working engine', () => {
    const before = engineering();
    before.powerAllocation.engines = ENGINES_REQUIRED;
    before.fuseInstalled = CORRECT_FUSE;
    const after = { ...before, valveSettings: secretsFor(0).valveTargets };
    expect(machineryCue(after, before)).toBe('engine');
    expect(machineryCue({ ...after, valveSettings: [1, 0, 0] }, before)).toBe('valve');
  });

  it('ignores repeated state copies, room entry, new ships and ended runs', () => {
    const before = engineering();
    expect(machineryCue(structuredClone(before), before)).toBeNull();
    const after = { ...before, fuseInstalled: CORRECT_FUSE };
    expect(machineryCue({ ...after, room: 'reactor_room' }, before)).toBeNull();
    expect(machineryCue({ ...after, seed: 8 }, before)).toBeNull();
    expect(machineryCue({ ...after, won: true }, before)).toBeNull();
    expect(machineryCue({ ...after, auxPower: false }, before)).toBeNull();
  });

  it('does not bring local machinery sounds into other compartments', () => {
    const before = { ...engineering(), room: 'crew_quarters' as const };
    expect(machineryCue({ ...before, fuseInstalled: CORRECT_FUSE }, before)).toBeNull();
  });

  it('leaves wave onset, recovery and containment to the director, in every room', () => {
    const before = engineering();
    before.killswitch = 'active';
    before.chapter3.wave = 'warning';
    const active = { ...before, chapter3: { ...before.chapter3, wave: 'active' as const } };
    expect(machineryCue(active, before)).toBeNull();
    expect(machineryCue({ ...active, chapter3: { ...active.chapter3, wave: 'calm' } }, active)).toBeNull();
    const reactor = { ...engineering(), room: 'reactor_room' as const, killswitch: 'active' as const };
    reactor.chapter3.quarantineStep = 3;
    // The final segment still sounds as a quarantine step; containment itself is the director's.
    expect(machineryCue({ ...reactor, killswitch: 'contained', chapter3: { ...reactor.chapter3, quarantineStep: 4 } }, reactor)).toBe('quarantine');
  });
});
