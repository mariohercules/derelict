import type { ChapterId, DoorId, GameState, RoomId } from './types';

export interface RoomMeta {
  id: RoomId;
  chapter: ChapterId;
  requires: DoorId | null; // door that must be unlocked to enter
  x: number; // deck-map position (viewBox 400 x 140)
  y: number;
}

// Two decks. Upper: cryo → medbay → quarters → hydroponics → bridge.
// Lower: core vault → reactor → engineering → cargo → comms.
export const ROOMS: RoomMeta[] = [
  { id: 'cryo_bay', chapter: 1, requires: null, x: 60, y: 45 },
  { id: 'medbay', chapter: 2, requires: null, x: 130, y: 45 },
  { id: 'crew_quarters', chapter: 2, requires: null, x: 200, y: 45 },
  { id: 'hydroponics', chapter: 2, requires: null, x: 270, y: 45 },
  { id: 'bridge', chapter: 1, requires: 'engineering_exit', x: 345, y: 45 },
  { id: 'core_vault', chapter: 3, requires: null, x: 60, y: 100 },
  { id: 'reactor_room', chapter: 3, requires: null, x: 130, y: 100 },
  { id: 'engineering', chapter: 1, requires: 'cryo_exit', x: 200, y: 100 },
  { id: 'cargo_bay', chapter: 2, requires: null, x: 270, y: 100 },
  { id: 'comms_array', chapter: 3, requires: null, x: 345, y: 100 },
];

export const ROOM_IDS: RoomId[] = ROOMS.map((r) => r.id);
export const ROOM_BY_ID: Record<RoomId, RoomMeta> = Object.fromEntries(ROOMS.map((r) => [r.id, r])) as Record<RoomId, RoomMeta>;

export type RoomStatus = 'current' | 'open' | 'locked' | 'sealed';

export function roomStatus(s: GameState, id: RoomId): RoomStatus {
  const meta = ROOM_BY_ID[id];
  if (s.room === id) return 'current';
  if (meta.chapter > s.chapter) return 'sealed';
  if (meta.requires && !s.doors[meta.requires]) return 'locked';
  return 'open';
}
