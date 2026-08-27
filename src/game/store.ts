import { createStore } from 'zustand/vanilla';
import type { ActionResult, BreakerId, DoorId, FuseRating, GameState, RoomId, SubsystemId } from './types';
import { AUTH_CODE, BREAKER_SEQUENCE, DOORS_REQUIRED, INITIAL_ALLOCATION, LAUNCH_AUTH, LAUNCH_WINDOW_MS, LIFE_SUPPORT_MIN, STAR_FIX } from './content';

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
  return {
    ok: true,
    message:
      `Magnetic lock released: ${door}. The door is open, but nothing more happens until the crew member ` +
      'physically walks through it — deeper systems come online only when they step into the next compartment. ' +
      'Tell them to walk through now.',
  };
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

export function takeStarFix(): void {
  gameStore.setState({ starFixTaken: true });
}

export function holdHandle(held: boolean): void {
  gameStore.setState((s) => ({ launch: { ...s.launch, handleHeld: held } }));
}

export function computeTrajectory(symbols: string[]): ActionResult {
  const s = gameStore.getState();
  if (s.room !== 'bridge') return { ok: false, message: 'Navigation console is on the bridge.' };
  if (!s.starFixTaken) {
    return { ok: false, message: 'No optical fix logged. The viewport reticle must be aligned by hand first — that is crew work, not yours.' };
  }
  const given = symbols.map((x) => String(x).trim().toUpperCase()).join('-');
  if (given !== STAR_FIX.join('-')) {
    return { ok: false, message: 'Star fix does not resolve. Those symbols point us into a gas giant. Re-check the viewport.' };
  }
  gameStore.setState({ trajectorySet: true });
  return { ok: true, message: 'Escape trajectory locked. Pod two is pointed somewhere survivable.' };
}

export function initiateLaunch(auth: string, now: number = Date.now()): ActionResult {
  const s = gameStore.getState();
  if (s.room !== 'bridge') {
    return { ok: false, message: 'Two-operator rule: the crew member must be on the bridge, hand within reach of the confirm handle. They are below decks. Initiation refused.' };
  }
  if (!s.trajectorySet) return { ok: false, message: 'No trajectory locked. Launching blind is technically possible and universally fatal.' };
  if (String(auth).trim().toUpperCase() !== LAUNCH_AUTH) {
    return { ok: false, message: 'Launch authorization rejected.' };
  }
  const expired =
    s.launch.phase === 'countdown' && s.launch.countdownEndsAt !== null && now > s.launch.countdownEndsAt;
  if (s.launch.phase !== 'idle' && !expired) {
    return {
      ok: false,
      message: s.launch.phase === 'launched' ? 'Pod two is already away.' : 'Launch sequence already in progress.',
    };
  }
  gameStore.setState({ launch: { ...s.launch, phase: 'countdown', countdownEndsAt: now + LAUNCH_WINDOW_MS } });
  return { ok: true, message: `Sequence initiated. Two-operator rule in effect: the human must HOLD the confirm handle; then call confirm_launch within ${LAUNCH_WINDOW_MS / 1000}s.` };
}

export function confirmLaunch(now: number = Date.now()): ActionResult {
  const s = gameStore.getState();
  if (s.launch.phase !== 'countdown') return { ok: false, message: 'No launch sequence armed.' };
  if (s.launch.countdownEndsAt !== null && now > s.launch.countdownEndsAt) {
    gameStore.setState({ launch: { ...s.launch, phase: 'idle', countdownEndsAt: null } });
    return { ok: false, message: 'Launch window elapsed. Sequence reset. Take a breath and initiate again.' };
  }
  if (!s.launch.handleHeld) {
    return { ok: false, message: 'Two-operator rule: confirm refused — the physical handle is not being held. Ask your human to grab it.' };
  }
  gameStore.setState({ launch: { ...s.launch, phase: 'launched' }, won: true });
  return { ok: true, message: 'Pod two away. Nice flying — both of you.' };
}
