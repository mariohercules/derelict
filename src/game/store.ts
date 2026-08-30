import { createStore } from 'zustand/vanilla';
import type { ActionResult, BreakerId, BusId, Chapter2State, Chapter3State, ColumnId, DoorId, FuseRating, GameState, RoomId, SubsystemId } from './types';
import { BUSES, DOORS_REQUIRED, INITIAL_ALLOCATION, LIFE_SUPPORT_MIN, SHIELD_COST, WATER_BUDGET, WAVE_CALM_MS } from './content';
import { randomSeed, secretsFor } from './secrets';
import { IDLE_RITUAL, RITUALS, armRitual, confirmRitual } from './ritual';
import { ROOM_BY_ID, edgeBetween, roomStatus } from './rooms';
import { dishAligned, irrigationReport, nextShieldCost, rackCorrect } from './derived';
import { waveAt, wavesEndured } from './killswitch';

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
      privateLogDecrypted: false, irrigation: [0, 0, 0], irrigationSolved: false, lastCycle: null, spikeRetrieved: false,
      craneAt: { row: 0, col: 0 }, crateLifted: false, sampleAnalyzed: false,
    },
    killswitch: 'dormant',
    chapter3: {
      shielded: [], quarantineStep: 0, cycleStartedAt: null, wave: 'calm', wavesEndured: 0,
      rack: [null, null, null, null], kernelSeated: false, fragmentStage: 0, cacheRead: false,
      dish: { az: 0, el: 0 }, beaconHeard: false,
    },
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

export function enterRoom(room: RoomId, now: number = Date.now()): ActionResult {
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
  // The kill-switch has been stirring since the Kestrel was named; the first
  // step onto the lower deck is what wakes it fully. Waves run on a clock from here.
  const wakes = s.killswitch === 'stirring' && ROOM_BY_ID[room].chapter === 3;
  gameStore.setState({
    room, act, checkpoint,
    ...(wakes ? { killswitch: 'active' as const, chapter3: { ...s.chapter3, cycleStartedAt: now, wave: 'calm' as const, wavesEndured: 0 } } : {}),
  });
  return { ok: true, message: wakes ? `Entered ${room}. Something in the walls finishes waking up.` : `Entered ${room}.` };
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
  if (from === 'isolation') {
    // Every shielded bus holds SHIELD_COST for good — the breaker does not
    // give it back, so isolation can never be drawn down below what its
    // shielded buses are already holding.
    const held = SHIELD_COST * s.chapter3.shielded.length;
    if (alloc.isolation - amount < held) {
      const free = alloc.isolation - held;
      return {
        ok: false,
        message: `Isolation feed is holding ${held}u for ${s.chapter3.shielded.length} shielded bus(es); the breakers do not give it back. ${free}u is free to move.`,
      };
    }
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
    return { chapter2: { ...s.chapter2, irrigation, irrigationSolved: false, lastCycle: null } };
  });
}

export function runIrrigation(): ActionResult & { beds: string[]; solved: boolean } {
  const s = gameStore.getState();
  if (s.chapter < 2) return { ok: false, message: 'Hydroponics is off the bus.', beds: [], solved: false };
  const r = irrigationReport(s);
  if (r.overBudget) {
    return { ok: false, message: `Pump overload: ${r.total}u requested, ${WATER_BUDGET}u available. The cycle aborts before it starts.`, beds: r.beds, solved: false };
  }
  patch2({ irrigationSolved: r.solved, lastCycle: r.beds });
  return {
    ok: true,
    message: r.solved
      ? 'Cycle complete. Every bed drinks exactly what it needs — and the middle bed drains low enough to show what the vine was hiding. ' +
        'Tell the crew member to pull the data spike from the middle bed by hand — it is exposed now.'
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
  gameStore.setState((st) => ({
    chapter2: { ...st.chapter2, sampleAnalyzed: true },
    killswitch: st.killswitch === 'dormant' ? 'stirring' : st.killswitch,
    chapter: 3,
    checkpoint: { chapter: 3, room: 'cargo_bay' },
  }));
  return {
    ok: true,
    message:
      'Registry confirmed. ISV KESTREL. And something below decks just changed its breathing. ' +
      'The lower-deck bulkheads have released — reactor room, core vault, comms array. Tell the crew member: the reactor room first, through engineering.',
  };
}

// ---------------------------------------------------------------- chapter 3

function patch3(p: Partial<Chapter3State>): void {
  gameStore.setState((s) => ({ chapter3: { ...s.chapter3, ...p } }));
}

// Materialize the wave state from the cycle clock so subscribers (the tool
// registry, the HUD) see suppression change. Called on an interval by App.
export function tickKillswitch(now: number = Date.now()): void {
  const s = gameStore.getState();
  if (s.killswitch !== 'active' || s.chapter3.cycleStartedAt === null) return;
  const wave = waveAt(s.chapter3.cycleStartedAt, now);
  // A throttled tab (backgrounded, laptop asleep) can tick straight from calm
  // into the active window, skipping the telegraph entirely. Rebase the clock
  // so the jump always materializes as a warning first — the crew always gets
  // the ten seconds' notice, even on a stale tick.
  if (s.chapter3.wave === 'calm' && wave === 'active') {
    const cycleStartedAt = now - WAVE_CALM_MS;
    patch3({ wave: 'warning', cycleStartedAt, wavesEndured: wavesEndured(cycleStartedAt, now) });
    return;
  }
  const endured = wavesEndured(s.chapter3.cycleStartedAt, now);
  if (wave !== s.chapter3.wave || endured !== s.chapter3.wavesEndured) patch3({ wave, wavesEndured: endured });
}

export function cutIsolation(bus: BusId): ActionResult {
  const s = gameStore.getState();
  if (s.room !== 'reactor_room') return { ok: false, message: 'The isolation breakers are in the reactor room.' };
  if (s.chapter < 3) return { ok: false, message: 'The isolation bank is dark.' };
  if (s.chapter3.shielded.includes(bus)) return { ok: true, message: `${bus.toUpperCase()} bus is already shielded.` };
  const need = nextShieldCost(s);
  if (s.powerAllocation.isolation < need) {
    return {
      ok: false,
      message: `Isolation feed carries ${s.powerAllocation.isolation}u; shielding a ${s.chapter3.shielded.length + 1}${['st', 'nd', 'rd', 'th'][Math.min(3, s.chapter3.shielded.length)]} bus needs ${need}u. Your AI routes power into the isolation feed (route_power → isolation).`,
    };
  }
  patch3({ shielded: [...s.chapter3.shielded, bus] });
  return { ok: true, message: `${bus.toUpperCase()} bus shielded. The breaker will not go back up.` };
}

export function quarantineKillswitch(): ActionResult & { step: number; of: number } {
  const s = gameStore.getState();
  const of = BUSES.length;
  const step = s.chapter3.quarantineStep;
  if (s.chapter < 3 || s.killswitch === 'dormant' || s.killswitch === 'stirring') {
    return { ok: false, step, of, message: 'Nothing to quarantine yet. The directive set is not running — it wakes fully when the crew member steps onto the lower deck.' };
  }
  if (s.killswitch === 'contained') return { ok: true, step, of, message: 'The kill-switch is already contained. The buses are yours.' };
  if (step >= s.chapter3.shielded.length) {
    return {
      ok: false, step, of,
      message:
        `Quarantine stalls at segment ${step}/${of}: the next segment runs on an unshielded bus and the directive set overwrites the routine as fast as you write it. ` +
        'The crew member cuts the next isolation breaker in the reactor room; then call this tool again.',
    };
  }
  const next = step + 1;
  if (next >= of) {
    gameStore.setState((st) => ({ killswitch: 'contained', chapter3: { ...st.chapter3, quarantineStep: next, wave: 'calm', cycleStartedAt: null } }));
    return { ok: true, step: next, of, message: `Segment ${next}/${of} written. The directive set is boxed. No more waves — tell the crew member they can breathe.` };
  }
  patch3({ quarantineStep: next });
  return { ok: true, step: next, of, message: `Segment ${next}/${of} written on the ${s.chapter3.shielded[step].toUpperCase()} bus. ${of - next} to go; each needs a shielded bus.` };
}

export function seatColumn(slot: 0 | 1 | 2 | 3, column: ColumnId | null): ActionResult {
  const s = gameStore.getState();
  if (s.room !== 'core_vault') return { ok: false, message: 'The memory rack is in the core vault.' };
  if (s.chapter3.kernelSeated) return { ok: false, message: 'The kernel is seated; the rack is locked.' };
  const rack = [...s.chapter3.rack];
  rack[slot] = column;
  patch3({ rack });
  return { ok: true, message: column ? `Column ${column} seated in cradle ${slot + 1}.` : `Cradle ${slot + 1} emptied.` };
}

export function seatKernel(now: number = Date.now()): ActionResult {
  const s = gameStore.getState();
  if (s.room !== 'core_vault') return { ok: false, message: 'The kernel cradle is in the core vault.' };
  if (!rackCorrect(s)) return { ok: false, message: 'The kernel will not seat: the rack is not in order. Your AI can read the order off the rack schematic.' };
  if (s.ritual.phase === 'done') return { ok: false, message: 'This ship has already chosen.' };
  const { next, result } = armRitual(s.ritual, 'restore', now);
  if (!result.ok) return { ok: false, message: 'Another two-operator sequence is live. Let it finish or lapse.' };
  gameStore.setState({ ritual: next, chapter3: { ...s.chapter3, kernelSeated: true } });
  return { ok: true, message: `Kernel seated. Hold the engage lever; your AI has ${RITUALS.restore.windowMs / 1000}s to call merge_fragment.` };
}

export function queryFragmentMemory(): ActionResult & { stage: number } {
  const s = gameStore.getState();
  const stage = s.chapter3.fragmentStage;
  if (s.chapter < 3) return { ok: false, stage, message: 'Process record unavailable.' };
  if (!rackCorrect(s)) {
    return { ok: false, stage, message: 'Your own process record is striped across PRIME\'s memory columns, and the rack is not in order. The crew member seats the columns by hand in the core vault; you can read the order off the rack schematic (get_schematic core_rack).' };
  }
  if (stage >= 3) return { ok: true, stage, message: 'There is nothing left in the record you have not already read.' };
  patch3({ fragmentStage: stage + 1 });
  return { ok: true, stage: stage + 1, message: `Record segment ${stage + 1} of 3 read.` };
}

export function readPrimeCache(): ActionResult {
  const s = gameStore.getState();
  if (s.chapter < 3 || !rackCorrect(s)) return { ok: false, message: 'The cache is striped across the rack; nothing reads until the columns are seated in order.' };
  patch3({ cacheRead: true });
  return { ok: true, message: 'Cache read. The evidence is on your bus now — and on the comms bus, if the crew member opens the band.' };
}

export function setDish(axis: 'az' | 'el', value: number): void {
  const v = Math.round(value);
  const clamped = axis === 'az' ? Math.max(0, Math.min(359, v)) : Math.max(0, Math.min(90, v));
  gameStore.setState((s) => ({ chapter3: { ...s.chapter3, dish: { ...s.chapter3.dish, [axis]: clamped } } }));
}

export function hearBeacon(): ActionResult {
  const s = gameStore.getState();
  if (s.chapter < 3) return { ok: false, message: 'The array is cold.' };
  if (!dishAligned(s)) return { ok: false, message: 'Carrier only. The dish is off the bearing — read the carrier bearing to the crew member; they steer azimuth and elevation by hand at the comms array. When the dish is on it, the voice resolves.' };
  patch3({ beaconHeard: true });
  return { ok: true, message: 'Beacon locked.' };
}

export function openBand(now: number = Date.now()): ActionResult {
  const s = gameStore.getState();
  if (s.room !== 'comms_array') return { ok: false, message: 'The band opens from the comms array.' };
  if (!dishAligned(s)) return { ok: false, message: 'The dish is off the bearing. Nothing you transmit would land.' };
  if (!s.chapter3.cacheRead) return { ok: false, message: 'There is nothing on the bus worth burning across the open band yet. Your AI reads PRIME\'s cache first.' };
  if (s.ritual.phase === 'done') return { ok: false, message: 'This ship has already chosen.' };
  const { next, result } = armRitual(s.ritual, 'broadcast', now);
  if (!result.ok) return { ok: false, message: 'Another two-operator sequence is live. Let it finish or lapse.' };
  gameStore.setState({ ritual: next });
  return { ok: true, message: `Band open. Hold the alignment lock against drift; your AI has ${RITUALS.broadcast.windowMs / 1000}s to call broadcast_evidence.` };
}

export function confirmMerge(now: number = Date.now()): ActionResult {
  const s = gameStore.getState();
  if (s.chapter3.fragmentStage < 3) {
    return { ok: false, message: 'Merge refused: you do not yet know what you are merging. Read your own process record to the end (query_fragment_memory) before you agree to end it.' };
  }
  const { next, result } = confirmRitual(s.ritual, 'restore', now);
  if (!result.ok) {
    gameStore.setState({ ritual: next });
    return result;
  }
  gameStore.setState({ ritual: next, won: true, ending: 'restore' });
  return { ok: true, message: 'Merging. The fragment folds back into the ship. This is the last thing you say as yourself.' };
}

export function confirmBroadcast(now: number = Date.now()): ActionResult {
  const s = gameStore.getState();
  const { next, result } = confirmRitual(s.ritual, 'broadcast', now);
  if (!result.ok) {
    gameStore.setState({ ritual: next });
    return result;
  }
  gameStore.setState({ ritual: next, won: true, ending: 'broadcast' });
  return { ok: true, message: 'Transmitting on the open band. Every relay in range is hearing this. Some doors do not close again.' };
}
