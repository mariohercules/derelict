import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startRecorderPlayback, type PlaybackStatus, type RecorderEnvironment } from './recorder';
import { narrationStore } from './narration';
import { EMPTY_PREFS, prefsStore } from '../game/prefs';

class Tape extends EventTarget {
  currentTime = 0;
  muted = false;
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn();
}
const sessions: ReturnType<typeof startRecorderPlayback>[] = [];
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
function setup() {
  const tape = new Tape();
  const statuses: PlaybackStatus[] = [];
  const release = vi.fn();
  const speech = { speak: vi.fn(), cancel: vi.fn() };
  const utterance = {} as SpeechSynthesisUtterance;
  const env: RecorderEnvironment = { route: vi.fn(() => release), speech: speech as unknown as SpeechSynthesis, utterance: () => utterance };
  const start = () => {
    const session = startRecorderPlayback(tape as unknown as HTMLAudioElement, 'word '.repeat(200), 'pt-BR', status => statuses.push(status), env);
    sessions.push(session); return session;
  };
  return { tape, statuses, release, speech, utterance, env, start };
}
beforeEach(() => { vi.useFakeTimers(); prefsStore.setState(EMPTY_PREFS, true); });
afterEach(() => { sessions.splice(0).forEach(s => s.dispose()); vi.useRealTimers(); });

describe('recorder sessions', () => {
  it('does not start either audio path or duck the ship when already muted', () => {
    prefsStore.setState({ muted: true });
    const t = setup(); t.start();
    expect(t.statuses).toEqual(['muted']);
    expect(t.tape.play).not.toHaveBeenCalled();
    expect(t.env.route).not.toHaveBeenCalled();
    expect(t.speech.speak).not.toHaveBeenCalled();
    expect(narrationStore.getState().active).toBe(false);
  });

  it('routes the recorded tape and releases focus and handlers when it ends', async () => {
    const t = setup(); t.start();
    expect(narrationStore.getState().active).toBe(true);
    await flush(); expect(t.statuses.at(-1)).toBe('playing');
    t.tape.dispatchEvent(new Event('ended'));
    expect(t.statuses.at(-1)).toBe('idle');
    expect(t.release).toHaveBeenCalledTimes(1);
    expect(narrationStore.getState().active).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    t.tape.dispatchEvent(new Event('error'));
    expect(t.speech.speak).not.toHaveBeenCalled();
  });

  it('mutes immediately and ignores a late rejected play promise', async () => {
    const t = setup(); let reject!: (e: Error) => void;
    t.tape.play.mockReturnValue(new Promise((_, no) => { reject = no; }));
    t.start(); prefsStore.setState({ muted: true });
    expect(t.tape.muted).toBe(true);
    expect(t.tape.pause).toHaveBeenCalled();
    reject(new Error('aborted')); await flush();
    expect(t.speech.speak).not.toHaveBeenCalled();
    expect(t.statuses.at(-1)).toBe('muted');
    expect(narrationStore.getState().active).toBe(false);
  });

  it('falls back only once when both media error and promise rejection fire', async () => {
    const t = setup(); t.tape.play.mockRejectedValue(new Error('missing'));
    t.start(); t.tape.dispatchEvent(new Event('error')); await flush();
    expect(t.speech.speak).toHaveBeenCalledTimes(1);
    expect(t.utterance.lang).toBe('pt-BR');
    expect(t.release).toHaveBeenCalledTimes(1);
  });

  it('cancels an active synthetic voice on mute without restarting on unmute', async () => {
    const t = setup(); t.tape.play.mockRejectedValue(new Error('missing'));
    t.start(); await flush();
    t.utterance.onstart?.({} as SpeechSynthesisEvent);
    prefsStore.setState({ muted: true });
    expect(t.speech.cancel).toHaveBeenCalledTimes(1);
    expect(t.statuses.at(-1)).toBe('muted');
    prefsStore.setState({ muted: false });
    expect(t.speech.speak).toHaveBeenCalledTimes(1);
    expect(narrationStore.getState().active).toBe(false);
  });

  it('lets synthetic narration finish even without word boundary events', async () => {
    const t = setup(); t.tape.play.mockRejectedValue(new Error('missing'));
    t.start(); await flush(); t.utterance.onstart?.({} as SpeechSynthesisEvent);
    vi.advanceTimersByTime(35_000);
    expect(t.statuses.at(-1)).toBe('playing');
    expect(narrationStore.getState().active).toBe(true);
    t.utterance.onend?.({} as SpeechSynthesisEvent);
    expect(t.statuses.at(-1)).toBe('idle');
    expect(narrationStore.getState().active).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('releases synthetic narration if the provider never reports completion', async () => {
    const t = setup(); t.tape.play.mockRejectedValue(new Error('missing'));
    t.start(); await flush(); t.utterance.onstart?.({} as SpeechSynthesisEvent);
    vi.advanceTimersByTime(120_000);
    expect(t.statuses.at(-1)).toBe('unavailable');
    expect(t.speech.cancel).toHaveBeenCalledTimes(1);
    expect(narrationStore.getState().active).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('disposal on room or language change prevents late callbacks and UI updates', async () => {
    const t = setup(); let resolve!: () => void;
    t.tape.play.mockReturnValue(new Promise(yes => { resolve = yes; }));
    const s = t.start(); const count = t.statuses.length;
    s.dispose(); resolve(); await flush();
    t.tape.dispatchEvent(new Event('playing')); t.tape.dispatchEvent(new Event('ended'));
    expect(t.statuses).toHaveLength(count);
    expect(narrationStore.getState().active).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('makes an unavailable fallback immediately replayable', async () => {
    const t = setup(); t.env.speech = undefined; t.tape.play.mockRejectedValue(new Error('missing'));
    t.start(); await flush();
    expect(t.statuses.at(-1)).toBe('unavailable');
    expect(narrationStore.getState().active).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps its idle deadline alive with real progress, then releases a stalled tape', async () => {
    const t = setup(); t.start(); await flush();
    vi.advanceTimersByTime(9000); t.tape.dispatchEvent(new Event('timeupdate'));
    vi.advanceTimersByTime(9000); expect(t.statuses.at(-1)).toBe('playing');
    vi.advanceTimersByTime(1001); expect(t.statuses.at(-1)).toBe('unavailable');
    expect(narrationStore.getState().active).toBe(false);
  });

  it('stops playback on demand and can start a fresh session afterwards', async () => {
    const t = setup(); const session = t.start(); await flush(); session.stop();
    expect(t.statuses.at(-1)).toBe('idle');
    t.start(); await flush(); expect(t.statuses.at(-1)).toBe('playing');
    expect(t.tape.play).toHaveBeenCalledTimes(2);
  });
});
