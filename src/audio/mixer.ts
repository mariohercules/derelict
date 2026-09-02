// The ship's soundscape. Diegetic only: every layer is a sound the ship makes,
// generated from oscillators and filtered noise — no assets. mixFor() is the
// logic (pure, tested); startMixer() is the wiring (thin, untested).
import type { StoreApi } from 'zustand/vanilla';
import type { ChapterId, GameState, RoomId } from '../game/types';
import { ENGINES_REQUIRED } from '../game/content';
import { enginesOnline } from '../game/derived';
import { linkStore } from '../game/link';
import { prefsStore } from '../game/prefs';
import { getAudioContext, getMaster, noiseBuffer, playRelayClick, setMuted } from './sound';

export interface MixTargets {
  room: RoomId;
  bed: number; // 0 or 1 — the room layer's gain (0 once won)
  hum: { freq: number; gain: number };
  engineDrive: number; // 0..1 — engineering turbine pitch/level
  awake: number; // 0 dormant, 0.5 on aux power, 1 with the engines online — the ship settling
  lowpassHz: number; // ambience filter at rest opens by chapter (8000/10000/12000); 2400 warning, 400 active wave
  tremoloHz: number; // 0 off; 6 during an active wave
  reactorPulseHz: number; // 0.8 calm, 1.6 warning, 2.4 active, 0.6 contained
  vaultCharged: boolean; // the core vault's whine once the kernel is seated
  ritualTick: boolean; // armed, unconfirmed, and the window still open
}

// Never reads chapter3.dish or chapter3.beaconHeard: on a dead-encoder ship
// the agent is the meter, and a carrier the human could hear would solve
// the puzzle by ear.
// The ambience at rest: the ship grows more present the deeper the crew goes.
const REST_LOWPASS_HZ: Record<ChapterId, number> = { 1: 8000, 2: 10000, 3: 12000 };

export function mixFor(s: GameState, now: number = Date.now()): MixTargets {
  const allocated = Object.values(s.powerAllocation).reduce((a, b) => a + b, 0);
  const engines = enginesOnline(s);
  const wave = s.killswitch === 'active' && !s.won ? s.chapter3.wave : 'calm';
  return {
    room: s.room,
    bed: s.won ? 0 : 1,
    hum: { freq: engines ? 58 : 55, gain: s.auxPower ? 0.012 + 0.0004 * allocated : 0.004 },
    engineDrive: Math.min(1, s.powerAllocation.engines / ENGINES_REQUIRED + (engines ? 0.3 : 0)),
    awake: engines ? 1 : s.auxPower ? 0.5 : 0,
    lowpassHz: wave === 'active' ? 400 : wave === 'warning' ? 2400 : REST_LOWPASS_HZ[s.chapter],
    tremoloHz: wave === 'active' ? 6 : 0,
    reactorPulseHz: s.killswitch === 'contained' ? 0.6 : wave === 'active' ? 2.4 : wave === 'warning' ? 1.6 : 0.8,
    vaultCharged: s.chapter3.kernelSeated,
    // `ritual.phase` outlives `endsAt`: the store never rewrites it when a window
    // lapses, so the tick is gated on the clock as well as on the phase.
    ritualTick: s.ritual.phase === 'armed' && !s.won && (s.ritual.endsAt === null || now <= s.ritual.endsAt),
  };
}

// ---- wiring ---------------------------------------------------------------

interface Layer {
  out: GainNode;
  update(t: MixTargets): void;
  stop(): void;
}

const CROSSFADE_S = 1.5;

function osc(c: AudioContext, type: OscillatorType, freq: number): OscillatorNode {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  o.start();
  return o;
}
// One 2 s buffer per context, shared by every room layer that loops hiss.
const noiseCache = new WeakMap<AudioContext, AudioBuffer>();
function noise(c: AudioContext): AudioBufferSourceNode {
  let buf = noiseCache.get(c);
  if (!buf) {
    buf = noiseBuffer(c, 2);
    noiseCache.set(c, buf);
  }
  const n = c.createBufferSource();
  n.buffer = buf;
  n.loop = true;
  n.start();
  return n;
}
function filter(c: AudioContext, type: BiquadFilterType, freq: number, q = 1): BiquadFilterNode {
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}
function gain(c: AudioContext, value: number): GainNode {
  const g = c.createGain();
  g.gain.value = value;
  return g;
}
// An LFO into an AudioParam: the param keeps its base value, the oscillator adds ±depth.
function lfo(c: AudioContext, rateHz: number, depth: number, target: AudioParam): OscillatorNode {
  const o = osc(c, 'sine', rateHz);
  const g = gain(c, depth);
  o.connect(g);
  g.connect(target);
  return o;
}
// A one-shot into a layer, with a decaying envelope.
function burst(c: AudioContext, into: AudioNode, source: AudioNode, level: number, ms: number): void {
  const g = c.createGain();
  g.gain.setValueAtTime(level, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + ms / 1000);
  source.connect(g).connect(into);
}
function ping(c: AudioContext, into: AudioNode, freq: number, ms: number, level: number, type: OscillatorType = 'sine'): void {
  const o = osc(c, type, freq);
  burst(c, into, o, level, ms);
  o.stop(c.currentTime + ms / 1000);
}
function creak(c: AudioContext, into: AudioNode, freq: number, q: number, ms: number, level: number): void {
  const n = c.createBufferSource();
  n.buffer = noiseBuffer(c, ms / 1000);
  const f = filter(c, 'bandpass', freq, q);
  n.connect(f);
  burst(c, into, f, level, ms);
  n.start();
  n.stop(c.currentTime + ms / 1000);
}
// Repeats fn at a random interval in [minMs, maxMs]; returns a stopper. The
// randomness is texture only — nothing here touches gameplay.
function every(minMs: number, maxMs: number, fn: () => void): () => void {
  let timer = 0;
  let live = true;
  const next = () => minMs + Math.random() * (maxMs - minMs);
  const tick = () => {
    if (!live) return;
    fn();
    timer = window.setTimeout(tick, next());
  };
  timer = window.setTimeout(tick, next());
  return () => {
    live = false;
    window.clearTimeout(timer);
  };
}

type LayerFactory = (c: AudioContext) => Layer;

const LAYERS: Record<RoomId, LayerFactory> = {
  cryo_bay: (c) => {
    // the compressor: a near-steady hiss with a mechanical cycle — a pneumatic
    // puff, then the tick — that settles once the ship has power again. (A deep
    // slow swell here read as surf, not machinery.)
    const out = gain(c, 1);
    const n = noise(c);
    const f = filter(c, 'bandpass', 2000, 0.7);
    const g = gain(c, 0.02);
    const flutter = lfo(c, 0.15, 0.002, g.gain); // a tenth of the level: texture, not tide
    n.connect(f).connect(g).connect(out);
    let level = 0.02;
    const puff = () => {
      const now = c.currentTime;
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(level, now);
      g.gain.linearRampToValueAtTime(level * 2.2, now + 1);
      g.gain.setTargetAtTime(level, now + 1, 0.7);
      window.setTimeout(() => ping(c, out, 1200, 30, 0.015, 'square'), 1400);
    };
    let settled = false;
    let stopPuffs = every(8000, 14000, puff);
    return {
      out,
      update(t) {
        level = 0.02 * (1 - 0.6 * t.awake);
        g.gain.setTargetAtTime(level, c.currentTime, 1.5);
        f.frequency.setTargetAtTime(2000 - 800 * t.awake, c.currentTime, 1.5);
        // with power back the puffs spread out
        const calm = t.awake >= 0.5;
        if (calm !== settled) {
          settled = calm;
          stopPuffs();
          stopPuffs = calm ? every(14000, 24000, puff) : every(8000, 14000, puff);
        }
      },
      stop() { stopPuffs(); n.stop(); flutter.stop(); },
    };
  },
  engineering: (c) => {
    // the turbine: two detuned saws through a lowpass that opens with engine drive
    const out = gain(c, 1);
    const a = osc(c, 'sawtooth', 110);
    const b = osc(c, 'sawtooth', 111.5);
    const f = filter(c, 'lowpass', 300, 2);
    const g = gain(c, 0.01);
    a.connect(f);
    b.connect(f);
    f.connect(g).connect(out);
    return {
      out,
      update(t) {
        f.frequency.setTargetAtTime(300 + 1200 * t.engineDrive, c.currentTime, 0.4);
        g.gain.setTargetAtTime(0.01 + 0.03 * t.engineDrive, c.currentTime, 0.4);
      },
      stop() { a.stop(); b.stop(); },
    };
  },
  bridge: (c) => {
    // near silence: a high hiss and a relay every few seconds
    const out = gain(c, 1);
    const n = noise(c);
    const f = filter(c, 'highpass', 6000);
    const g = gain(c, 0.006);
    n.connect(f).connect(g).connect(out);
    const stopClicks = every(5000, 8000, () => ping(c, out, 1800, 25, 0.02, 'square'));
    return { out, update() {}, stop() { stopClicks(); n.stop(); } };
  },
  medbay: (c) => {
    // the player's own monitor, and a fan
    const out = gain(c, 1);
    const n = noise(c);
    const f = filter(c, 'lowpass', 500);
    const g = gain(c, 0.015);
    n.connect(f).connect(g).connect(out);
    const stopBeeps = every(1200, 1200, () => ping(c, out, 880, 60, 0.02));
    return {
      out,
      update(t) { g.gain.setTargetAtTime(0.015 * (1 - 0.3 * t.awake), c.currentTime, 1.5); },
      stop() { stopBeeps(); n.stop(); },
    };
  },
  crew_quarters: (c) => {
    // the quietest room: a vent, and the hull settling
    const out = gain(c, 1);
    const n = noise(c);
    const f = filter(c, 'lowpass', 300);
    const g = gain(c, 0.012);
    n.connect(f).connect(g).connect(out);
    const stopCreaks = every(9000, 18000, () => creak(c, out, 700, 12, 250, 0.04));
    return {
      out,
      update(t) { g.gain.setTargetAtTime(0.012 * (1 - 0.3 * t.awake), c.currentTime, 1.5); },
      stop() { stopCreaks(); n.stop(); },
    };
  },
  hydroponics: (c) => {
    // a fan with a wobble, and drips into a wet room
    const out = gain(c, 1);
    const n = noise(c);
    const f = filter(c, 'lowpass', 800);
    const g = gain(c, 0.015);
    const whir = lfo(c, 0.3, 200, f.frequency);
    n.connect(f).connect(g).connect(out);
    const delay = c.createDelay(1);
    delay.delayTime.value = 0.18;
    const fb = gain(c, 0.35);
    delay.connect(fb).connect(delay);
    delay.connect(out);
    const stopDrips = every(700, 2200, () => ping(c, delay, 800 + Math.random() * 600, 40, 0.03));
    return {
      out,
      update(t) { g.gain.setTargetAtTime(0.015 * (1 - 0.3 * t.awake), c.currentTime, 1.5); },
      stop() { stopDrips(); n.stop(); whir.stop(); },
    };
  },
  cargo_bay: (c) => {
    // a big cold room: rumble and metal
    const out = gain(c, 1);
    const o = osc(c, 'sawtooth', 45);
    const f = filter(c, 'lowpass', 120);
    const g = gain(c, 0.02);
    o.connect(f).connect(g).connect(out);
    const stopCreaks = every(6000, 14000, () => creak(c, out, 300, 10, 400, 0.05));
    return { out, update() {}, stop() { stopCreaks(); o.stop(); } };
  },
  reactor_room: (c) => {
    // the pulse: 40 Hz, throbbing faster as the waves come
    const out = gain(c, 1);
    const o = osc(c, 'sine', 40);
    const g = gain(c, 0.025);
    const pulse = lfo(c, 0.8, 0.02, g.gain);
    o.connect(g).connect(out);
    return {
      out,
      update(t) { pulse.frequency.setTargetAtTime(t.reactorPulseHz, c.currentTime, 0.2); },
      stop() { o.stop(); pulse.stop(); },
    };
  },
  core_vault: (c) => {
    // mains hum with harmonics; a whine climbs once the kernel is seated
    const out = gain(c, 1);
    const parts = [[60, 0.012], [120, 0.005], [180, 0.003]].map(([freq, level]) => {
      const o = osc(c, 'sine', freq);
      o.connect(gain(c, level)).connect(out);
      return o;
    });
    const whine = osc(c, 'sine', 900);
    const wg = gain(c, 0);
    whine.connect(wg).connect(out);
    return {
      out,
      update(t) {
        wg.gain.setTargetAtTime(t.vaultCharged ? 0.008 : 0, c.currentTime, 1.5);
        whine.frequency.setTargetAtTime(t.vaultCharged ? 1400 : 900, c.currentTime, 3);
      },
      stop() { parts.forEach((o) => o.stop()); whine.stop(); },
    };
  },
  comms_array: (c) => {
    // static only. Nothing here reads the dish or the beacon: on a dead-encoder ship the agent is the meter.
    const out = gain(c, 1);
    const n = noise(c);
    const f = filter(c, 'bandpass', 1500, 0.5);
    const g = gain(c, 0.02);
    const drift = lfo(c, 0.2, 0.006, g.gain);
    n.connect(f).connect(g).connect(out);
    return { out, update() {}, stop() { n.stop(); drift.stop(); } };
  },
};

let running: (() => void) | null = null;

// Builds the graph on the same master as the cues, follows the game store, and
// returns a disposer. Idempotent: a second call returns the live disposer.
export function startMixer(store: StoreApi<GameState>): () => void {
  if (running) return running;
  const c = getAudioContext();
  const master = getMaster();
  if (!c || !master) return () => {};

  // ambience bus: room layer → lowpass → tremolo → bed → master
  const bed = gain(c, 1);
  const trem = gain(c, 1);
  const tremLfo = osc(c, 'sine', 0);
  const tremDepth = gain(c, 0);
  tremLfo.connect(tremDepth);
  tremDepth.connect(trem.gain);
  const lp = filter(c, 'lowpass', 12000, 0.7);
  lp.connect(trem).connect(bed).connect(master);

  // the hum: the reactor through the deck plates
  const hum = osc(c, 'sine', 55);
  const humGain = gain(c, 0.004);
  hum.connect(humGain).connect(master);

  let current: { room: RoomId; layer: Layer } | null = null;
  let tickTimer = 0;

  function swapLayer(old: { room: RoomId; layer: Layer } | null, room: RoomId): { room: RoomId; layer: Layer } {
    const now = c!.currentTime;
    const layer = LAYERS[room](c!);
    layer.out.gain.setValueAtTime(0, now);
    layer.out.connect(lp);
    layer.out.gain.setTargetAtTime(1, now, CROSSFADE_S / 3);
    if (old) {
      old.layer.out.gain.setTargetAtTime(0, now, CROSSFADE_S / 3);
      window.setTimeout(() => {
        old.layer.stop();
        old.layer.out.disconnect();
      }, CROSSFADE_S * 1000 + 200);
    }
    return { room, layer };
  }

  function apply(t: MixTargets): void {
    const now = c!.currentTime;
    bed.gain.setTargetAtTime(t.bed, now, 0.8);
    lp.frequency.setTargetAtTime(t.lowpassHz, now, 0.6);
    tremLfo.frequency.setTargetAtTime(t.tremoloHz, now, 0.1);
    tremDepth.gain.setTargetAtTime(t.tremoloHz > 0 ? 0.5 : 0, now, 0.1);
    hum.frequency.setTargetAtTime(t.hum.freq, now, 0.5);
    humGain.gain.setTargetAtTime(t.hum.gain, now, 0.5);
    if (!current || current.room !== t.room) current = swapLayer(current, t.room);
    current.layer.update(t);
    // The interval re-evaluates its own reason to exist: a window closing is a
    // clock event, not a store change, so nothing else would ever stop it.
    if (t.ritualTick && tickTimer === 0) {
      tickTimer = window.setInterval(() => {
        if (!mixFor(store.getState()).ritualTick) {
          window.clearInterval(tickTimer);
          tickTimer = 0;
          return;
        }
        playRelayClick();
      }, 1000);
    }
    if (!t.ritualTick && tickTimer !== 0) {
      window.clearInterval(tickTimer);
      tickTimer = 0;
    }
  }

  apply(mixFor(store.getState()));
  const unsubGame = store.subscribe((s) => apply(mixFor(s)));
  const unsubLink = linkStore.subscribe((s, prev) => {
    const last = s.events[s.events.length - 1];
    if (last && last !== prev.events[prev.events.length - 1] && last.kind === 'call') playRelayClick();
  });
  setMuted(prefsStore.getState().muted);
  const unsubPrefs = prefsStore.subscribe((p) => setMuted(p.muted));

  running = () => {
    unsubGame();
    unsubLink();
    unsubPrefs();
    if (tickTimer !== 0) window.clearInterval(tickTimer);
    current?.layer.stop();
    hum.stop();
    tremLfo.stop();
    running = null;
  };
  return running;
}
