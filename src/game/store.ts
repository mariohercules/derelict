import { createStore } from 'zustand/vanilla';
import type { ActionResult, BreakerId, DoorId, FuseRating, GameState, RoomId, SubsystemId } from './types';
import { AUTH_CODE, BREAKER_SEQUENCE, DOORS_REQUIRED, INITIAL_ALLOCATION, LIFE_SUPPORT_MIN } from './content';

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

export function routePower(from: SubsystemId, to: SubsystemId, amount: number): ActionResult {
  const s = gameStore.getState();
  if (!Number.isInteger(amount) || amount <= 0) {
    return { ok: false, message: 'Power moves in whole positive units. This reactor is old, not imaginative.' };
  }
  if (from === to) return { ok: false, message: 'Source and destination are the same subsystem.' };
  const alloc = { ...s.powerAllocation };
  if (alloc[from] < amount) {
    return { ok: false, message: `${from} only holds ${alloc[from]}u.` };
  }
  alloc[from] -= amount;
  alloc[to] += amount;
  if (alloc.life_support < LIFE_SUPPORT_MIN) {
    return { ok: false, message: `Request denied: life support hard minimum is ${LIFE_SUPPORT_MIN}u. The relay does not negotiate.` };
  }
  gameStore.setState({ powerAllocation: alloc });
  return { ok: true, message: `Routed ${amount}u from ${from} to ${to}.` };
}

export function installFuse(rating: FuseRating): void {
  gameStore.setState({ fuseInstalled: rating });
}

export function setValve(index: 0 | 1 | 2, value: number): void {
  const v = Math.max(0, Math.min(9, Math.round(value)));
  gameStore.setState((s) => {
    const valveSettings = [...s.valveSettings] as [number, number, number];
    valveSettings[index] = v;
    return { valveSettings };
  });
}
