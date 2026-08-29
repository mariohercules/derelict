import { createStore } from 'zustand/vanilla';
import type { ActionResult, BreakerId, DoorId, FuseRating, GameState, RoomId, SubsystemId } from './types';
import { DOORS_REQUIRED, INITIAL_ALLOCATION, LIFE_SUPPORT_MIN } from './content';
import { randomSeed, secretsFor } from './secrets';
import { IDLE_RITUAL, RITUALS, armRitual, confirmRitual } from './ritual';
import { edgeBetween, roomStatus } from './rooms';

export function initialState(seed: number = randomSeed()): GameState {
  return {
    seed,
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
    ritual: { ...IDLE_RITUAL },
    toolCalls: 0,
    won: false,
    chapter: 1,
    sealedLogRead: false,
    ending: null,
    checkpoint: null,
  };
}

export const gameStore = createStore<GameState>(() => initialState());

export function resetGame(seed?: number): void {
  gameStore.setState(initialState(seed), true);
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
  const sequence = secretsFor(s.seed).breakerSequence;
  const expected = sequence.slice(0, flipped.length);
  if (flipped.join('') !== expected.join('')) {
    gameStore.setState({ breakersFlipped: [] }); // master relay trips
    return;
  }
  gameStore.setState({
    breakersFlipped: flipped,
    auxPower: flipped.length === sequence.length,
  });
}

export function unlockDoor(door: DoorId, code?: string): ActionResult {
  const s = gameStore.getState();
  if (s.doors[door]) return { ok: true, message: 'Door is already unlocked.' };
  if (door === 'cryo_exit') {
    if (!s.auxPower) return { ok: false, message: 'Door servos unpowered. Auxiliary power is offline.' };
    if (code !== secretsFor(s.seed).authCode) return { ok: false, message: 'Authorization code rejected by door controller.' };
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

export function enterRoom(room: RoomId): ActionResult {
  const s = gameStore.getState();
  const status = roomStatus(s, room);
  if (status === 'sealed') {
    return { ok: false, message: `${room} is sealed. Whatever is behind that bulkhead belongs to a later chapter of this ship.` };
  }
  if (status === 'locked') {
    return edgeBetween(s.room, room)
      ? { ok: false, message: `The way to ${room} is sealed.` }
      : { ok: false, message: `There is no direct passage from ${s.room} to ${room}. The Cormorant is crossed compartment by compartment.` };
  }
  const act = room === 'bridge' ? 3 : room === 'engineering' ? (Math.max(s.act, 2) as 2 | 3) : s.act;
  const checkpoint = room === 'bridge' && s.checkpoint === null ? { chapter: s.chapter, room } : s.checkpoint;
  gameStore.setState({ room, act, checkpoint });
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

export function breakSeal(): ActionResult {
  const s = gameStore.getState();
  if (s.room !== 'bridge') return { ok: false, message: 'The sealed log is on the bridge, wedged behind the launch console.' };
  if (!s.trajectorySet) return { ok: false, message: 'The pre-launch check has not run yet. Nothing has surfaced.' };
  if (s.sealedLogRead) return { ok: true, message: 'The seal is already broken.' };
  gameStore.setState({ sealedLogRead: true });
  return { ok: true, message: 'Seal broken. The log is addressed to you by name.' };
}

export function holdHandle(held: boolean): void {
  gameStore.setState((s) => ({ ritual: { ...s.ritual, held } }));
}

export function computeTrajectory(symbols: string[]): ActionResult {
  const s = gameStore.getState();
  if (s.room !== 'bridge') return { ok: false, message: 'Navigation console is on the bridge.' };
  if (!s.starFixTaken) {
    return { ok: false, message: 'No optical fix logged. The viewport reticle must be aligned by hand first — that is crew work, not yours.' };
  }
  const given = symbols.map((x) => String(x).trim().toUpperCase()).join('-');
  if (given !== secretsFor(s.seed).starFix.join('-')) {
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
  if (String(auth).trim().toUpperCase() !== secretsFor(s.seed).launchAuth) {
    return { ok: false, message: 'Launch authorization rejected.' };
  }
  if (s.ritual.phase === 'done') return { ok: false, message: 'Pod two is already away.' };
  const { next, result } = armRitual(s.ritual, 'launch', now);
  if (!result.ok) return { ok: false, message: 'Launch sequence already in progress.' };
  gameStore.setState({ ritual: next });
  return {
    ok: true,
    message: `Sequence initiated. Two-operator rule in effect: the human must HOLD the confirm handle; then call confirm_launch within ${RITUALS.launch.windowMs / 1000}s.`,
  };
}

export function confirmLaunch(now: number = Date.now()): ActionResult {
  const s = gameStore.getState();
  const { next, result } = confirmRitual(s.ritual, 'launch', now);
  if (!result.ok) {
    gameStore.setState({ ritual: next });
    return result;
  }
  gameStore.setState({ ritual: next, won: true, ending: s.sealedLogRead ? 'leave_knowing' : 'leave_unknowing' });
  return { ok: true, message: 'Pod two away. Nice flying — both of you.' };
}
