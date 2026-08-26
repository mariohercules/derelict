let ctx: AudioContext | null = null;

function ensureCtx(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, durationMs: number, type: OscillatorType, gainValue: number): void {
  const c = ensureCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(gainValue, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + durationMs / 1000);
  osc.connect(gain).connect(c.destination);
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

export function startAmbience(): void {
  const c = ensureCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.value = 55; // low ship hum
  gain.gain.value = 0.015;
  osc.connect(gain).connect(c.destination);
  osc.start();
}
