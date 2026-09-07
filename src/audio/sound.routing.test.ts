import { afterEach, beforeEach, expect, it, vi } from 'vitest';

class AudioNodeStub {
  gain = { value: 1, setTargetAtTime: vi.fn() };
  connect = vi.fn((node: unknown) => node);
  disconnect = vi.fn();
}
class ContextStub {
  state = 'suspended';
  currentTime = 4;
  destination = {};
  gains: AudioNodeStub[] = [];
  createGain = () => { const node = new AudioNodeStub(); this.gains.push(node); return node; };
  resume = vi.fn(() => Promise.resolve());
  createMediaElementSource = vi.fn(() => new AudioNodeStub());
}
beforeEach(() => { vi.resetModules(); vi.stubGlobal('AudioContext', ContextStub); });
afterEach(() => vi.unstubAllGlobals());

it('applies saved mute and effect ducking before the first audio gesture', async () => {
  const sound = await import('./sound');
  sound.setMuted(true); sound.setEffectsLevel(.3);
  const context = sound.getAudioContext() as unknown as ContextStub;
  expect(context.gains[0].gain.value).toBe(0);
  expect(context.gains[1].gain.value).toBe(.3);
  sound.setMuted(false);
  expect(context.gains[0].gain.setTargetAtTime).toHaveBeenLastCalledWith(1, 4, .02);
  expect(context.gains[1].gain.value).toBe(.3);
});

it('routes voice to the muted master independently of ducked effects, and reuses its media source', async () => {
  const sound = await import('./sound');
  const audio = {} as HTMLMediaElement;
  const release = sound.routeVoice(audio);
  const context = sound.getAudioContext() as unknown as ContextStub;
  const voice = context.createMediaElementSource.mock.results[0].value;
  expect(voice.connect).toHaveBeenCalledWith(sound.getMaster());
  expect(context.resume).toHaveBeenCalledTimes(1);
  sound.setEffectsLevel(.3);
  expect(context.gains[1].gain.setTargetAtTime).toHaveBeenLastCalledWith(.3, 4, .15);
  expect(voice.gain.setTargetAtTime).not.toHaveBeenCalled();
  release();
  expect(voice.disconnect).toHaveBeenCalledTimes(1);
  sound.routeVoice(audio)();
  expect(context.createMediaElementSource).toHaveBeenCalledTimes(1);
});

it('allows the native recording path when Web Audio is unavailable', async () => {
  vi.stubGlobal('AudioContext', class { constructor() { throw new Error('unsupported'); } });
  const sound = await import('./sound');
  expect(() => sound.routeVoice({} as HTMLMediaElement)()).not.toThrow();
});
