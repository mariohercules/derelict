let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

function ensureCtx(): AudioContext | null {
  try {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 1;
      master.connect(ctx.destination);
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

function tone(freq: number, durationMs: number, type: OscillatorType, gainValue: number): void {
  const c = ensureCtx();
  if (!c || !master) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(gainValue, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + durationMs / 1000);
  osc.connect(gain).connect(master);
  osc.start();
  osc.stop(c.currentTime + durationMs / 1000);
}

export function playBlip(): void {
  tone(880, 90, 'square', 0.04);
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
  if (!c || !master) return;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 0.4);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 900;
  const g = c.createGain();
  g.gain.setValueAtTime(0.05, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.4);
  src.connect(lp).connect(g).connect(master);
  src.start();
  src.stop(c.currentTime + 0.4);
  setTimeout(() => tone(70, 220, 'sine', 0.08), 180);
}
