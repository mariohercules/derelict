let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let effects: GainNode | null = null;
let effectsLevel = 1;
let muted = false;

function ensureCtx(): AudioContext | null {
  try {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 1;
      master.connect(ctx.destination);
      effects = ctx.createGain();
      effects.gain.value = effectsLevel;
      effects.connect(master);
    }
    return ctx;
  } catch {
    return null;
  }
}

// The mixer hangs its graph off the same master, so one mute silences everything.
export function getAudioContext(): AudioContext | null {
  return ensureCtx();
}

export function getMaster(): GainNode | null {
  ensureCtx();
  return master;
}

export function setEffectsLevel(level: number): void {
  effectsLevel = Math.max(0, Math.min(1, level));
  if (ctx && effects) effects.gain.setTargetAtTime(effectsLevel, ctx.currentTime, .15);
}

const mediaSources = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();
export function routeVoice(audio: HTMLMediaElement): () => void {
  const c = ensureCtx();
  if (!c || !master) return () => {}; // Native media still works without Web Audio.
  if (c.state === 'suspended') void c.resume().catch(() => {});
  let source = mediaSources.get(audio);
  if (!source) {
    source = c.createMediaElementSource(audio);
    mediaSources.set(audio, source);
  }
  source.connect(master);
  return () => source!.disconnect();
}

export function setMuted(next: boolean): void {
  muted = next;
  if (!ctx || !master) return;
  master.gain.setTargetAtTime(next ? 0 : 1, ctx.currentTime, 0.02);
}

export function isMuted(): boolean {
  return muted;
}

export function noiseBuffer(c: AudioContext, seconds: number): AudioBuffer {
  const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * seconds)), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function tone(freq: number, durationMs: number, type: OscillatorType, gainValue: number, delay = 0): void {
  const c = ensureCtx();
  if (!c || !master || !effects) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const start = c.currentTime + delay;
  gain.gain.setValueAtTime(gainValue, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + durationMs / 1000);
  osc.connect(gain).connect(effects);
  osc.start(start);
  osc.stop(start + durationMs / 1000);
}

// Material transients share the master/mute. Audio-clock scheduling keeps each
// impact together even when the browser is busy rendering the new room state.
function contactNoise(ms: number, hz: number, level: number, delay = 0): void {
  const c = ensureCtx();
  if (!c || !master || !effects) return;
  const source = c.createBufferSource();
  source.buffer = noiseBuffer(c, ms / 1000);
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = hz;
  filter.Q.value = 1.8;
  const envelope = c.createGain();
  const start = c.currentTime + delay;
  envelope.gain.setValueAtTime(level, start);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + ms / 1000);
  source.connect(filter).connect(envelope).connect(effects);
  source.start(start);
  source.stop(start + ms / 1000);
}

export function playGratePull(): void {
  contactNoise(320, 650, .09);
  tone(173, 240, 'triangle', .035, .13);
  tone(91, 220, 'sine', .045, .28);
}

export function playSwitchClick(): void {
  contactNoise(45, 2300, .07);
  tone(115, 75, 'triangle', .035);
}

export function playCableSeat(): void {
  contactNoise(35, 3400, .045);
  tone(720, 40, 'sine', .015, .02);
}

export function playRelayTrip(): void {
  contactNoise(130, 850, .07);
  tone(75, 160, 'sawtooth', .025);
}

export function playAuxPowerUp(): void {
  playSwitchClick();
  tone(110, 750, 'sine', .025, .08);
  tone(165, 650, 'sine', .015, .25);
  contactNoise(45, 1600, .04, .4);
}

export function playDoorRelease(): void {
  contactNoise(95, 600, .08);
  contactNoise(95, 700, .06, .14);
  tone(83, 400, 'triangle', .035, .2);
}

export function playMachineryCue(cue: import('../ui/machinery').MachineryCue): void {
  switch (cue) {
    case 'fuse': contactNoise(75, 2900, .06); tone(840, 55, 'triangle', .015); break;
    case 'gear': contactNoise(120, 740, .08); tone(142, 180, 'triangle', .035); break;
    case 'valve': contactNoise(65, 520, .045); break;
    case 'dial': contactNoise(30, 2000, .035); break;
    case 'route': contactNoise(65, 1250, .04); tone(190, 300, 'sine', .018, .06); break;
    case 'engine':
      contactNoise(190, 330, .07);
      tone(55, 1300, 'sine', .045, .12);
      tone(110, 850, 'triangle', .018, .3); break;
    case 'isolate': contactNoise(110, 600, .1); tone(120, 240, 'triangle', .035, .07); break;
    case 'quarantine': contactNoise(50, 1800, .04); tone(440, 170, 'sine', .02); break;
    case 'contained': tone(110, 900, 'sine', .03); tone(220, 1100, 'sine', .015, .25); break;
    case 'wave': contactNoise(650, 180, .075); tone(48, 950, 'triangle', .025); break;
    case 'recover': contactNoise(85, 950, .045); tone(165, 550, 'sine', .018, .15); break;
  }
}

export function playBlip(): void {
  tone(880, 90, 'square', 0.04);
}

export function playDirectedCue(cue: import('../presentation/director').DirectorCue): void {
  if (cue === 'warning') playKlaxon();
  else if (cue === 'impact') playMachineryCue('wave');
  else if (cue === 'release') playMachineryCue('recover');
  else if (cue === 'ritual') playAlarm();
  else { contactNoise(110, 700, .035); tone(220, 750, 'sine', .018, .1); }
}

export function playAlarm(): void {
  tone(440, 350, 'sawtooth', 0.05);
  setTimeout(() => tone(330, 350, 'sawtooth', 0.05), 380);
}

// Kill-switch wave warning: two rising sawtooth barks.
export function playKlaxon(): void {
  tone(220, 420, 'sawtooth', 0.06);
  setTimeout(() => tone(294, 420, 'sawtooth', 0.06), 460);
}

// RESTORE: a slow ascending triad, held — the ship coming back as one voice.
export function playMergeTheme(): void {
  tone(196, 1400, 'sine', 0.05);
  setTimeout(() => tone(247, 1200, 'sine', 0.05), 450);
  setTimeout(() => tone(294, 1800, 'sine', 0.06), 900);
}

// Pod one's beacon: a soft double ping.
export function playBeaconPing(): void {
  tone(1320, 70, 'sine', 0.035);
  setTimeout(() => tone(1320, 70, 'sine', 0.03), 160);
}

// A relay closing somewhere in the wall: the sound of the agent acting.
export function playRelayClick(): void {
  tone(1800, 25, 'square', 0.02);
}

// A bulkhead cycling: servo hiss, then the thunk of the leaves meeting.
export function playBulkhead(): void {
  const c = ensureCtx();
  if (!c || !master || !effects) return;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 0.4);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 900;
  const g = c.createGain();
  g.gain.setValueAtTime(0.05, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.4);
  src.connect(lp).connect(g).connect(effects);
  src.start();
  src.stop(c.currentTime + 0.4);
  setTimeout(() => tone(70, 220, 'sine', 0.08), 180);
}
