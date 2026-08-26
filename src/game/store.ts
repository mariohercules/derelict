import { createStore } from 'zustand/vanilla';
import type { ActionResult, BreakerId, DoorId, GameState, RoomId } from './types';
import { AUTH_CODE, BREAKER_SEQUENCE, DOORS_REQUIRED, INITIAL_ALLOCATION } from './content';

export function initialState(): GameState {
  return {
    act: 1,
    room: 'cryo_bay',
    auxPower: false,
    grateRemoved: false,
    breakersFlipped: [],
    doors: { cryo_exit: false, engineering_exit: false },
    powerAllocation: { ...INITIAL_ALLOCATION },
    fuseInstalled: null,
    valveSettings: [0, 0, 0],
    starFixTaken: false,
    trajectorySet: false,
    launch: { phase: 'idle', countdownEndsAt: null, handleHeld: false },
    toolCalls: 0,
    won: false,
  };
}

export const gameStore = createStore<GameState>(() => initialState());

export function resetGame(): void {
  gameStore.setState(initialState(), true);
}

export function bumpToolCalls(): void {
  gameStore.setState((s) => ({ toolCalls: s.toolCalls + 1 }));
}

export function removeGrate(): void {
  gameStore.setState({ grateRemoved: true });
}

export function flipBreaker(id: BreakerId): void {
  const s = gameStore.getState();
  if (s.auxPower) return;
  const flipped = [...s.breakersFlipped, id];
  const expected = BREAKER_SEQUENCE.slice(0, flipped.length);
  if (flipped.join('') !== expected.join('')) {
    gameStore.setState({ breakersFlipped: [] }); // master relay trips
    return;
  }
  gameStore.setState({
    breakersFlipped: flipped,
    auxPower: flipped.length === BREAKER_SEQUENCE.length,
  });
}

export function unlockDoor(door: DoorId, code?: string): ActionResult {
  const s = gameStore.getState();
  if (s.doors[door]) return { ok: true, message: 'Door is already unlocked.' };
  if (door === 'cryo_exit') {
    if (!s.auxPower) return { ok: false, message: 'Door servos unpowered. Auxiliary power is offline.' };
    if (code !== AUTH_CODE) return { ok: false, message: 'Authorization code rejected by door controller.' };
  }
  if (door === 'engineering_exit') {
    if (s.powerAllocation.doors < DOORS_REQUIRED) {
      return { ok: false, message: `Door servos need ${DOORS_REQUIRED}u routed to the doors subsystem.` };
    }
  }
  gameStore.setState({ doors: { ...s.doors, [door]: true } });
  return { ok: true, message: `Magnetic lock released: ${door}.` };
}

const ROOM_REQUIRES: Record<RoomId, DoorId | null> = {
  cryo_bay: null,
  engineering: 'cryo_exit',
  bridge: 'engineering_exit',
};

export function enterRoom(room: RoomId): ActionResult {
  const s = gameStore.getState();
  const needed = ROOM_REQUIRES[room];
  if (needed && !s.doors[needed]) {
    return { ok: false, message: `The way to ${room} is sealed.` };
  }
  const act = room === 'bridge' ? 3 : room === 'engineering' ? Math.max(s.act, 2) as 2 | 3 : s.act;
  gameStore.setState({ room, act });
  return { ok: true, message: `Entered ${room}.` };
}
