import type { GameState } from '../game/types';

export type Beat = 'idle' | 'arrival' | 'discovery' | 'warning' | 'impact' | 'pressure' | 'release' | 'ritual' | 'listening';
type Accent = 'idle' | 'arrival' | 'discovery' | 'impact' | 'release';
export type DirectorCue = 'warning' | 'impact' | 'release' | 'discovery' | 'ritual';
export interface DirectorMemory { accent: Accent; until: number; quietUntil: number }
export interface Direction { beat: Beat; ambience: number; effects: number; edge: number }
export const EMPTY_DIRECTOR: DirectorMemory = { accent: 'idle', until: 0, quietUntil: 0 };
export const IDLE_DIRECTION: Direction = { beat: 'idle', ambience: 1, effects: 1, edge: 0 };

const wave = (s: GameState) => !s.won && s.killswitch === 'active' ? s.chapter3.wave : 'calm';
const ritualLive = (s: GameState, now: number) => !s.won && s.ritual.phase === 'armed'
  && (s.ritual.endsAt === null || now <= s.ritual.endsAt);

// Only completed, already-disclosed story events. Never inspect secret values,
// partial puzzle correctness, dish bearing or whether a carrier can be heard.
function discovered(s: GameState, p: GameState): boolean {
  return (!p.chapter2.commandTraced && s.chapter2.commandTraced)
    || (!p.chapter2.privateLogDecrypted && s.chapter2.privateLogDecrypted)
    || (!p.chapter2.sampleAnalyzed && s.chapter2.sampleAnalyzed)
    || s.chapter3.fragmentStage > p.chapter3.fragmentStage
    || (!p.chapter3.cacheRead && s.chapter3.cacheRead);
}

export function direct(memory: DirectorMemory, s: GameState, before: GameState, now: number,
  listening = false, reduced = false): { memory: DirectorMemory; direction: Direction; cue: DirectorCue | null } {
  let next = memory.until > now ? memory : { ...memory, accent: 'idle' as const, until: 0 };
  const fresh = s.seed !== before.seed || s.chapter < before.chapter || (!s.auxPower && before.auxPower);
  const accent = (kind: Accent, ms: number): DirectorMemory => ({ accent: kind, until: now + ms, quietUntil: now + 12_000 });
  if (fresh || s.won) next = { ...EMPTY_DIRECTOR };
  else if (listening) next = { accent: 'idle', until: 0, quietUntil: now + 5000 };
  else if (s.room !== before.room) next = accent('arrival', 2400);
  else if (wave(s) === 'active' && wave(before) !== 'active') next = accent('impact', 1600);
  else if (wave(s) !== 'calm' || ritualLive(s, now)) {
    // Keep only the onset of the current wave; do not queue discoveries under it.
    if (next.accent !== 'impact' || wave(s) !== 'active') next = { accent: 'idle', until: 0, quietUntil: now + 5000 };
  } else if ((s.killswitch === 'contained' && before.killswitch !== 'contained') || wave(before) === 'active') {
    next = accent('release', 6000);
  } else if (now >= next.quietUntil && discovered(s, before)) next = accent('discovery', 3500);

  const beat: Beat = s.won ? 'idle' : listening ? 'listening'
    : wave(s) === 'active' ? next.accent === 'impact' ? 'impact' : 'pressure'
    : wave(s) === 'warning' ? 'warning' : ritualLive(s, now) ? 'ritual' : next.accent;
  let cue: DirectorCue | null = null;
  if (!fresh && !s.won && !listening && s.room === before.room) {
    if (beat === 'warning' && wave(before) !== 'warning') cue = 'warning';
    else if (beat === 'ritual' && (!ritualLive(before, now) || s.ritual.endsAt !== before.ritual.endsAt || s.ritual.active !== before.ritual.active)) cue = 'ritual';
    else if ((beat === 'impact' || beat === 'release' || beat === 'discovery') && next.until !== memory.until) cue = beat;
  }
  const levels: Record<Beat, [number, number, number]> = {
    idle: [1, 1, 0], arrival: [.8, 1, .10], discovery: [.6, .85, .12],
    warning: [.75, 1, .14], impact: [.5, 1, .22], pressure: [.9, 1, .10],
    release: [.65, .85, .08], ritual: [.6, .9, .12], listening: [.2, .3, 0],
  };
  const [ambience, effects, edge] = levels[beat];
  return { memory: next, direction: { beat, ambience, effects, edge: reduced ? 0 : edge }, cue };
}

// The only timed changes are presentation expiry and the existing ritual deadline.
export function nextDirectionAt(memory: DirectorMemory, s: GameState, now: number): number | null {
  const times = [memory.until, ritualLive(s, now) && s.ritual.endsAt !== null ? s.ritual.endsAt + 1 : 0].filter(t => t > now);
  return times.length ? Math.min(...times) : null;
}
