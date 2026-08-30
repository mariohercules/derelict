import { gameStore, initialState } from './store';
import type { GameState, RitualPhase, RitualState, RoomId, SubsystemId } from './types';
import { CLASSIC_SEED } from './secrets';
import { ROOM_IDS } from './rooms';

export const SAVE_KEY = 'derelict-save-v2';
export const LEGACY_SAVE_KEY = 'derelict-save-v1';

const SUBSYSTEMS: SubsystemId[] = ['life_support', 'doors', 'medbay', 'engines', 'comms'];
const PHASES: RitualPhase[] = ['idle', 'armed', 'done'];

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

// v1 saves (the challenge build) carried a `launch` countdown and no chapter data.
export function migrateV1(raw: Record<string, unknown>): Partial<GameState> {
  const { launch, ...rest } = raw;
  const l = (launch ?? {}) as Record<string, unknown>;
  const phase: RitualPhase = l.phase === 'countdown' ? 'armed' : l.phase === 'launched' ? 'done' : 'idle';
  const ritual: RitualState = {
    active: phase === 'idle' ? null : 'launch',
    phase,
    endsAt: isFiniteNumber(l.countdownEndsAt) ? l.countdownEndsAt : null,
    held: l.handleHeld === true,
  };
  const won = raw.won === true;
  return {
    ...(rest as Partial<GameState>),
    seed: isFiniteNumber(raw.seed) ? raw.seed : CLASSIC_SEED,
    ritual,
    chapter: 1,
    sealedLogRead: false,
    ending: won ? 'leave_unknowing' : null,
    checkpoint: raw.room === 'bridge' ? { chapter: 1, room: 'bridge' } : null,
  };
}

// A save that fails any of these checks is discarded whole: hydrating a
// half-valid save corrupts invariants the store never re-checks.
function validShape(p: Partial<GameState>): boolean {
  if (!isFiniteNumber(p.seed)) return false;
  if (typeof p.act !== 'number' || ![1, 2, 3].includes(p.act)) return false;
  if (p.chapter !== undefined && ![1, 2, 3].includes(p.chapter as number)) return false;
  if (typeof p.room !== 'string' || !ROOM_IDS.includes(p.room as RoomId)) return false;
  if (!p.doors || typeof p.doors !== 'object') return false;
  if (!p.ritual || typeof p.ritual !== 'object') return false;
  const ritual = p.ritual as unknown as Record<string, unknown>;
  if (!PHASES.includes(ritual.phase as RitualPhase)) return false;
  if (ritual.active !== null && ritual.active !== 'launch') return false;
  if (ritual.endsAt !== null && !isFiniteNumber(ritual.endsAt)) return false;
  if (p.ending !== undefined && p.ending !== null && !['leave_unknowing', 'leave_knowing'].includes(p.ending)) return false;
  if (p.checkpoint !== undefined && p.checkpoint !== null) {
    const c = p.checkpoint as unknown as Record<string, unknown>;
    if (![1, 2, 3].includes(c.chapter as number) || !ROOM_IDS.includes(c.room as RoomId)) return false;
  }
  if (p.killswitch !== undefined && !['dormant', 'stirring'].includes(p.killswitch as string)) return false;
  if (p.chapter2 !== undefined) {
    const c2 = p.chapter2 as unknown as Record<string, unknown>;
    if (!c2 || typeof c2 !== 'object') return false;
    if (!Array.isArray(c2.irrigation) || c2.irrigation.length !== 3 || !c2.irrigation.every(isFiniteNumber)) return false;
    const crane = c2.craneAt as Record<string, unknown> | undefined;
    if (!crane || !isFiniteNumber(crane.row) || !isFiniteNumber(crane.col)) return false;
  }
  if (!p.powerAllocation || typeof p.powerAllocation !== 'object') return false;
  const alloc = p.powerAllocation as Record<string, unknown>;
  if (!SUBSYSTEMS.every((k) => isFiniteNumber(alloc[k]))) return false;
  if (!Array.isArray(p.valveSettings) || p.valveSettings.length !== 3 || !p.valveSettings.every(isFiniteNumber)) {
    return false;
  }
  return true;
}

function readJson(key: string): Record<string, unknown> | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  const parsed = JSON.parse(raw) as unknown;
  return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
}

export function loadSavedState(): GameState | null {
  try {
    let parsed: Partial<GameState> | null = readJson(SAVE_KEY) as Partial<GameState> | null;
    if (!parsed) {
      const legacy = readJson(LEGACY_SAVE_KEY);
      parsed = legacy ? migrateV1(legacy) : null;
    }
    if (!parsed) return null;
    if (parsed.seed === undefined) parsed.seed = CLASSIC_SEED;
    if (!validShape(parsed)) return null;
    // Merge over initialState so old saves survive new fields
    const merged = { ...initialState(), ...parsed } as GameState;
    // Never resurrect an armed ritual: a reload mid-window must not restore a stale
    // deadline or a held handle nobody is actually holding.
    const ritual = { ...merged.ritual, held: false };
    if (ritual.phase === 'armed') {
      ritual.active = null;
      ritual.phase = 'idle';
      ritual.endsAt = null;
    }
    return { ...merged, ritual };
  } catch {
    return null;
  }
}

export function startPersisting(): () => void {
  return gameStore.subscribe((s) => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(s));
      localStorage.removeItem(LEGACY_SAVE_KEY);
    } catch {
      // Private mode / quota: play on without saves.
    }
  });
}
