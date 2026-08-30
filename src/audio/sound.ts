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
