import { createStore } from 'zustand/vanilla';
import type { ActionResult, BreakerId, Chapter2State, DoorId, FuseRating, GameState, RoomId, SubsystemId } from './types';
import { DOORS_REQUIRED, INITIAL_ALLOCATION, LIFE_SUPPORT_MIN, WATER_BUDGET } from './content';
import { randomSeed, secretsFor } from './secrets';
import { IDLE_RITUAL, RITUALS, armRitual, confirmRitual } from './ritual';
import { edgeBetween, roomStatus } from './rooms';
import { irrigationReport } from './derived';

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
    chapter2: {
      medbandExamined: false, commandTraced: false, safeOpened: false, recorderPlayed: false,
      privateLogDecrypted: false, irrigation: [0, 0, 0], irrigationSolved: false, spikeRetrieved: false,
      craneAt: { row: 0, col: 0 }, crateLifted: false, sampleAnalyzed: false,
    },
    killswitch: 'dormant',
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

function patch2(p: Partial<Chapter2State>): void {
  gameStore.setState((s) => ({ chapter2: { ...s.chapter2, ...p } }));
}

export function startInvestigation(): ActionResult {
  const s = gameStore.getState();
  if (s.room !== 'bridge') return { ok: false, message: 'The decision to stay is made on the bridge, in front of the pod.' };
  if (!s.sealedLogRead) return { ok: false, message: 'Nothing has given you a reason to stay. Yet.' };
  if (s.chapter >= 2) return { ok: true, message: 'The investigation is already underway.' };
  gameStore.setState({ chapter: 2, checkpoint: { chapter: 2, room: 'bridge' } });
  return { ok: true, message: 'Pod two stays docked. Somewhere below, the mid-deck bulkheads release.' };
}

export function examineMedband(): void {
  patch2({ medbandExamined: true });
}

export function traceCommand(): ActionResult {
  const s = gameStore.getState();
  if (s.chapter < 2) return { ok: false, message: 'Telemetry archives are sealed until the investigation is underway.' };
  patch2({ commandTraced: true });
  return { ok: true, message: 'Command trace complete.' };
}

export function dialSafe(combo: [number, number, number]): ActionResult {
  const s = gameStore.getState();
  if (s.room !== 'crew_quarters') return { ok: false, message: 'The safe is in Vasquez\'s cabin.' };
  if (s.chapter2.safeOpened) return { ok: true, message: 'The safe is already open.' };
  const target = secretsFor(s.seed).safeCombo;
  if (combo.join('') !== target.join('')) return { ok: false, message: 'The dial clicks past. Nothing gives.' };
  patch2({ safeOpened: true });
  return { ok: true, message: 'The bolt slides. Inside: a private log drive, encrypted.' };
}

export function decryptPrivateLog(): ActionResult {
  const s = gameStore.getState();
  if (!s.chapter2.safeOpened) return { ok: false, message: 'No private log drive is on the bus. It is still inside a safe only the crew member can open.' };
  patch2({ privateLogDecrypted: true });
  return { ok: true, message: 'Private log decrypted.' };
}

export function playRecorder(): void {
  patch2({ recorderPlayed: true });
}

export function setIrrigation(index: 0 | 1 | 2, value: number): void {
  const v = Math.max(0, Math.min(9, Math.round(value)));
  gameStore.setState((s) => {
    const irrigation = [...s.chapter2.irrigation] as [number, number, number];
    irrigation[index] = v;
    return { chapter2: { ...s.chapter2, irrigation, irrigationSolved: false } };
  });
}

export function runIrrigation(): ActionResult & { beds: string[]; solved: boolean } {
  const s = gameStore.getState();
  if (s.chapter < 2) return { ok: false, message: 'Hydroponics is off the bus.', beds: [], solved: false };
  const r = irrigationReport(s);
  if (r.overBudget) {
    return { ok: false, message: `Pump overload: ${r.total}u requested, ${WATER_BUDGET}u available. The cycle aborts before it starts.`, beds: r.beds, solved: false };
  }
  patch2({ irrigationSolved: r.solved });
  return {
    ok: true,
    message: r.solved
      ? 'Cycle complete. Every bed drinks exactly what it needs — and the middle bed drains low enough to show what the vine was hiding.'
      : 'Cycle complete. Some beds are wrong; the crew member sets the valves by hand — read them the bed states.',
    beds: r.beds,
    solved: r.solved,
  };
}

export function retrieveSpike(): ActionResult {
  const s = gameStore.getState();
  if (!s.chapter2.irrigationSolved) return { ok: false, message: 'The vine is still swollen with water. Whatever is under it stays under it.' };
  patch2({ spikeRetrieved: true });
  return { ok: true, message: 'A data spike, wrapped in a ration bag. Okafor\'s handwriting on the tape.' };
}

export function moveCrane(dir: 'up' | 'down' | 'left' | 'right'): void {
  gameStore.setState((s) => {
    const { row, col } = s.chapter2.craneAt;
    const next = {
      row: Math.max(0, Math.min(2, row + (dir === 'down' ? 1 : dir === 'up' ? -1 : 0))),
      col: Math.max(0, Math.min(2, col + (dir === 'right' ? 1 : dir === 'left' ? -1 : 0))),
    };
    return { chapter2: { ...s.chapter2, craneAt: next } };
  });
}

export function liftCrate(): ActionResult {
  const s = gameStore.getState();
  if (s.room !== 'cargo_bay') return { ok: false, message: 'The crane controls are in the cargo bay.' };
  const slot = secretsFor(s.seed).quarantineSlot;
  if (s.chapter2.craneAt.row !== slot.row || s.chapter2.craneAt.col !== slot.col) {
    return { ok: false, message: 'The crane lifts an ordinary crate. Ration bars. Someone\'s spare boots. Not this one.' };
  }
  patch2({ crateLifted: true });
  return { ok: true, message: 'The quarantine container comes up. Inside: a slab of hull plate with a stencilled registry, half burned away.' };
}

export function analyzeSample(fragment: string): ActionResult {
  const s = gameStore.getState();
  if (!s.chapter2.crateLifted) return { ok: false, message: 'No sample is in the analyzer. The quarantine container is still in the bay stack — the crew member has to lift it.' };
  const given = String(fragment).replace(/\D/g, '').padStart(4, '0');
  if (given !== secretsFor(s.seed).registryFragment) {
    return { ok: false, message: 'Registry cross-check failed: that fragment matches no Combine hull. Have the crew member read the stencil again, digit by digit.' };
  }
  patch2({ sampleAnalyzed: true });
  gameStore.setState({ killswitch: 'stirring' });
  return { ok: true, message: 'Registry confirmed. ISV KESTREL. And something below decks just changed its breathing.' };
}
