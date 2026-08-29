import type { ChapterId, DoorId, GameState, RoomId } from './types';

export interface RoomMeta {
  id: RoomId;
  chapter: ChapterId;
  x: number; // deck-map position (viewBox 400 x 140)
  y: number;
}

export interface Edge {
  a: RoomId;
  b: RoomId;
  door?: DoorId; // a door that must be unlocked to pass
}

// Two decks. Upper: cryo → medbay → quarters → hydroponics → bridge.
// Lower: core vault → reactor → engineering → cargo → comms.
export const ROOMS: RoomMeta[] = [
  { id: 'cryo_bay', chapter: 1, x: 60, y: 45 },
  { id: 'medbay', chapter: 2, x: 130, y: 45 },
  { id: 'crew_quarters', chapter: 2, x: 200, y: 45 },
  { id: 'hydroponics', chapter: 2, x: 270, y: 45 },
  { id: 'bridge', chapter: 1, x: 345, y: 45 },
  { id: 'core_vault', chapter: 3, x: 60, y: 100 },
  { id: 'reactor_room', chapter: 3, x: 130, y: 100 },
  { id: 'engineering', chapter: 1, x: 200, y: 100 },
  { id: 'cargo_bay', chapter: 2, x: 270, y: 100 },
  { id: 'comms_array', chapter: 3, x: 345, y: 100 },
];

// Corridors. Movement happens only along these; a corridor with a door needs it unlocked.
export const EDGES: Edge[] = [
  { a: 'cryo_bay', b: 'engineering', door: 'cryo_exit' },
  { a: 'engineering', b: 'bridge', door: 'engineering_exit' },
  { a: 'cryo_bay', b: 'medbay' },
  { a: 'medbay', b: 'crew_quarters' },
  { a: 'crew_quarters', b: 'hydroponics' },
  { a: 'hydroponics', b: 'bridge' },
  { a: 'engineering', b: 'cargo_bay' },
  { a: 'engineering', b: 'reactor_room' },
  { a: 'reactor_room', b: 'core_vault' },
  { a: 'bridge', b: 'comms_array' },
];

export const ROOM_IDS: RoomId[] = ROOMS.map((r) => r.id);
export const ROOM_BY_ID: Record<RoomId, RoomMeta> = Object.fromEntries(ROOMS.map((r) => [r.id, r])) as Record<RoomId, RoomMeta>;

export function edgeBetween(a: RoomId, b: RoomId): Edge | undefined {
  return EDGES.find((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a));
}

export type RoomStatus = 'current' | 'open' | 'locked' | 'sealed';

export function roomStatus(s: GameState, id: RoomId): RoomStatus {
  const meta = ROOM_BY_ID[id];
  if (s.room === id) return 'current';
  if (meta.chapter > s.chapter) return 'sealed';
  const edge = edgeBetween(s.room, id);
  if (!edge) return 'locked';
  if (edge.door && !s.doors[edge.door]) return 'locked';
  return 'open';
}
