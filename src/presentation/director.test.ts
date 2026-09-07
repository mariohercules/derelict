import { afterEach, describe, expect, it, vi } from 'vitest';
import { createStore } from 'zustand/vanilla';
import { initialState } from '../game/store';
import { direct, EMPTY_DIRECTOR, nextDirectionAt } from './director';
import { directionStore, startDirector } from './runtime';
import { holdNarration } from '../audio/narration';

const base = () => ({ ...initialState(0), auxPower: true });
const active = () => { const s = base(); s.killswitch = 'active'; s.chapter3.wave = 'active'; return s; };
afterEach(() => vi.useRealTimers());

describe('presentation director', () => {
  it('resumes an active wave without replaying its impact or sound', () => {
    const s = active();
    const result = direct(EMPTY_DIRECTOR, s, s, 1000);
    expect(result.direction.beat).toBe('pressure');
    expect(result.cue).toBeNull();
  });

  it('gives a wave one impact, sustained pressure and a timed recovery', () => {
    const before = base(), s = active();
    const onset = direct(EMPTY_DIRECTOR, s, before, 1000);
    expect(onset.direction.beat).toBe('impact');
    expect(onset.cue).toBe('impact');
    expect(direct(onset.memory, s, s, 1500).cue).toBeNull();
    expect(direct(onset.memory, s, s, 2700).direction.beat).toBe('pressure');
    const calm = { ...s, chapter3: { ...s.chapter3, wave: 'calm' as const } };
    const recovery = direct(onset.memory, calm, s, 3000);
    expect(recovery.cue).toBe('release');
    expect(recovery.direction.ambience).toBeLessThan(1);
    expect(direct(recovery.memory, calm, calm, 9000).direction.beat).toBe('idle');
  });

  it('warns only on an actual transition and gives waves priority over rituals', () => {
    const s = active(); s.chapter3.wave = 'warning';
    s.ritual = { active: 'launch', phase: 'armed', endsAt: 5000, held: false };
    expect(direct(EMPTY_DIRECTOR, s, base(), 1000)).toMatchObject({ direction: { beat: 'warning' }, cue: 'warning' });
    expect(direct(EMPTY_DIRECTOR, s, s, 1000).cue).toBeNull();
  });

  it('expires rituals at their actual deadline without changing gameplay', () => {
    const before = base(), s = base();
    s.ritual = { active: 'launch', phase: 'armed', endsAt: 2000, held: false };
    expect(direct(EMPTY_DIRECTOR, s, before, 1000).cue).toBe('ritual');
    expect(direct(EMPTY_DIRECTOR, s, s, 2000).direction.beat).toBe('ritual');
    expect(nextDirectionAt(EMPTY_DIRECTOR, s, 1000)).toBe(2001);
    expect(direct(EMPTY_DIRECTOR, s, s, 2001).direction.beat).toBe('idle');
    expect(s.ritual.phase).toBe('armed');
  });

  it('leaves space between discoveries instead of stacking tool-call accents', () => {
    const before = base(), s = base(); s.chapter2.commandTraced = true;
    const first = direct(EMPTY_DIRECTOR, s, before, 1000);
    expect(first.cue).toBe('discovery');
    const second = { ...s, chapter2: { ...s.chapter2, privateLogDecrypted: true } };
    expect(direct(first.memory, second, s, 5000).cue).toBeNull();
    expect(direct(first.memory, second, second, 14_000).cue).toBeNull();
  });

  it('discards dramatic accents during speech and does not replay them afterwards', () => {
    const before = base(), s = active();
    const voice = direct(EMPTY_DIRECTOR, s, before, 1000, true);
    expect(voice).toMatchObject({ cue: null, direction: { beat: 'listening', ambience: .2, effects: .3, edge: 0 } });
    expect(direct(voice.memory, s, s, 3000)).toMatchObject({ cue: null, direction: { beat: 'pressure' } });
  });

  it('does not save a discovery for the end of a wave', () => {
    const before = active(), s = active(); s.chapter3.cacheRead = true;
    const during = direct(EMPTY_DIRECTOR, s, before, 1000);
    expect(during.cue).toBeNull();
    const calm = { ...s, chapter3: { ...s.chapter3, wave: 'calm' as const } };
    const release = direct(during.memory, calm, s, 2000);
    expect(direct(release.memory, calm, calm, 20_000).cue).toBeNull();
  });

  it('clears a previous room accent on arrival and stays still after victory', () => {
    const before = base(), s = { ...before, room: 'engineering' as const };
    const arrival = direct(EMPTY_DIRECTOR, s, before, 1000);
    expect(arrival.direction.beat).toBe('arrival');
    expect(arrival.cue).toBeNull();
    expect(direct(arrival.memory, { ...s, won: true }, s, 1500)).toMatchObject({ memory: EMPTY_DIRECTOR, direction: { beat: 'idle', edge: 0 } });
    expect(direct(arrival.memory, { ...s, seed: 8 }, s, 1500).direction.beat).toBe('idle');
  });

  it('does not encode dish alignment, hidden answers or carrier detection', () => {
    const before = base(), s = base();
    s.chapter3.dish = { az: 217, el: 34 }; s.chapter3.beaconHeard = true;
    s.valveSettings = [6, 3, 7]; s.chapter1v.phases = [3, 7, 9];
    expect(direct(EMPTY_DIRECTOR, s, before, 1000)).toEqual(direct(EMPTY_DIRECTOR, before, before, 1000));
  });

  it('removes the visual envelope in subtle mode while preserving the audible warning', () => {
    const s = active(); s.chapter3.wave = 'warning';
    expect(direct(EMPTY_DIRECTOR, s, base(), 1000, false, true)).toMatchObject({ cue: 'warning', direction: { beat: 'warning', edge: 0 } });
  });

  it('expires presentation without another game update and disposes its timers', () => {
    vi.useFakeTimers(); vi.setSystemTime(1000);
    const game = createStore(() => base());
    const cue = vi.fn(); const stop = startDirector(game, cue);
    game.setState(s => ({ chapter2: { ...s.chapter2, commandTraced: true } }));
    expect(directionStore.getState().beat).toBe('discovery');
    vi.advanceTimersByTime(3501);
    expect(directionStore.getState().beat).toBe('idle');
    expect(cue).toHaveBeenCalledTimes(1);
    stop(); expect(vi.getTimerCount()).toBe(0);
  });

  it('restores the ambient direction only after every narration lease ends', () => {
    const game = createStore(() => base()); const stop = startDirector(game);
    const a = holdNarration(), b = holdNarration();
    a(); expect(directionStore.getState().beat).toBe('listening');
    a(); expect(directionStore.getState().beat).toBe('listening');
    b(); expect(directionStore.getState().beat).toBe('idle');
    stop();
  });
});
