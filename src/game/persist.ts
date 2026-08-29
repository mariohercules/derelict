import { gameStore, initialState } from './store';
import type { GameState, RitualPhase, RoomId, SubsystemId } from './types';
import { CLASSIC_SEED } from './secrets';

export const SAVE_KEY = 'derelict-save-v1';

const ROOMS: RoomId[] = ['cryo_bay', 'engineering', 'bridge'];
const SUBSYSTEMS: SubsystemId[] = ['life_support', 'doors', 'medbay', 'engines', 'comms'];
const PHASES: RitualPhase[] = ['idle', 'armed', 'done'];

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

// A save that fails any of these checks is discarded whole: hydrating a
// half-valid save corrupts invariants the store never re-checks (NaN power
// allocations, phantom launch phases, rooms that do not exist).
function validShape(p: Partial<GameState>): boolean {
  if (!isFiniteNumber(p.seed)) return false;
  if (typeof p.act !== 'number' || ![1, 2, 3].includes(p.act)) return false;
  if (typeof p.room !== 'string' || !ROOMS.includes(p.room as RoomId)) return false;
  if (!p.doors || typeof p.doors !== 'object') return false;
  if (!p.ritual || typeof p.ritual !== 'object') return false;
  const ritual = p.ritual as unknown as Record<string, unknown>;
  if (!PHASES.includes(ritual.phase as RitualPhase)) return false;
  if (ritual.active !== null && ritual.active !== 'launch') return false;
  if (ritual.endsAt !== null && !isFiniteNumber(ritual.endsAt)) return false;
  if (!p.powerAllocation || typeof p.powerAllocation !== 'object') return false;
  const alloc = p.powerAllocation as Record<string, unknown>;
  if (!SUBSYSTEMS.every((k) => isFiniteNumber(alloc[k]))) return false;
  if (!Array.isArray(p.valveSettings) || p.valveSettings.length !== 3 || !p.valveSettings.every(isFiniteNumber)) {
    return false;
  }
  return true;
}

export function loadSavedState(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GameState>;
    // Saves from before seeded ships are the classic ship.
    if (parsed.seed === undefined) parsed.seed = CLASSIC_SEED;
    if (!validShape(parsed)) return null;
    // Merge over initialState so old saves survive new fields
    const merged = { ...initialState(), ...parsed } as GameState;
    // Never resurrect an in-flight launch: a reload mid-countdown must not restore a stale
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
    } catch {
      // Private mode / quota: play on without saves.
    }
  });
}
