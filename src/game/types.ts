export type RoomId =
  | 'cryo_bay' | 'engineering' | 'bridge'
  | 'medbay' | 'crew_quarters' | 'hydroponics' | 'cargo_bay'
  | 'reactor_room' | 'core_vault' | 'comms_array';
export type SubsystemId = 'life_support' | 'doors' | 'medbay' | 'engines' | 'comms' | 'isolation';
export type DoorId = 'cryo_exit' | 'engineering_exit';
export type FuseRating = '5A' | '10A' | '15A';
export type BreakerId = 'A' | 'B' | 'C';

export interface ActionResult {
  ok: boolean;
  message: string;
}

export type ChapterId = 1 | 2 | 3;
export type EndingId = 'leave_unknowing' | 'leave_knowing' | 'restore' | 'broadcast' | 'stay';

export type RitualId = 'launch' | 'restore' | 'broadcast' | 'stay';
export type RitualPhase = 'idle' | 'armed' | 'done';

export interface RitualState {
  active: RitualId | null;
  phase: RitualPhase;
  endsAt: number | null; // epoch ms
  held: boolean;
}

export interface Checkpoint {
  chapter: ChapterId;
  room: RoomId;
}

export type KillswitchState = 'dormant' | 'stirring' | 'active' | 'contained';

// Chapter 3. Buses group the agent's tools; the human shields a bus by cutting
// its isolation breaker in the reactor room.
export type BusId = 'core' | 'nav' | 'archive' | 'comms';
export type WaveState = 'calm' | 'warning' | 'active';
export type ColumnId = 'A' | 'B' | 'C' | 'D';

export interface Chapter3State {
  shielded: BusId[];
  quarantineStep: number; // 0..4; 4 = contained
  cycleStartedAt: number | null; // epoch ms when the waves began
  wave: WaveState;
  wavesEndured: number;
  rack: (ColumnId | null)[]; // four cradles, top to bottom
  kernelSeated: boolean;
  fragmentStage: number; // 0..3 — how much of itself the fragment has read
  cacheRead: boolean;
  dish: { az: number; el: number }; // degrees
  beaconHeard: boolean;
}

export type BedState = 'dry' | 'ok' | 'flooded';

export interface Chapter2State {
  medbandExamined: boolean;
  commandTraced: boolean;
  safeOpened: boolean;
  recorderPlayed: boolean;
  privateLogDecrypted: boolean;
  irrigation: [number, number, number];
  irrigationSolved: boolean;
  lastCycle: BedState[] | null; // per-bed result of the last cycle the AI ran; null until one runs or a valve moves
  spikeRetrieved: boolean;
  craneAt: { row: number; col: number };
  crateLifted: boolean;
  sampleAnalyzed: boolean;
}

// Inputs of the chapter-1 variant puzzles (Plan F). Outcomes stay in the
// existing flags: auxPower, enginesOnline (derived), starFixTaken.
export interface Chapter1VariantState {
  sockets: [number | null, number | null, number | null]; // bus per cable: red, green, blue
  energized: boolean; // the last ENERGIZE press lit the panel
  gear: number | null; // seated coupling gear's tooth count
  phases: [number, number, number]; // coil phase dials, 0–11
}

// Inputs of the chapter-2 variant puzzles (Plan F2). Outcomes stay in the
// existing chapter2 flags: safeOpened, crateLifted, irrigationSolved/lastCycle.
export interface Chapter2VariantState {
  keyFound: boolean; // crew quarters: the captain's key is out from behind the drawing
  held: boolean; // cargo bay: the crane's hook carries a crate
  tiers: number[]; // cargo bay: crates per slot (row*3 + col), nine entries of 1 or 2
}

// Inputs of the chapter-3 variant puzzle (Plan F3). The outcome is rackCorrect
// (derived), and through it kernelSeated / fragmentStage / cacheRead as before.
export interface Chapter3VariantState {
  seated: ColumnId[]; // sequenced rack: the loading order so far, 0–4 distinct columns
}

export interface GameState {
  seed: number;
  act: 1 | 2 | 3;
  room: RoomId;
  auxPower: boolean;
  grateRemoved: boolean;
  breakersFlipped: BreakerId[];
  doors: Record<DoorId, boolean>;
  powerAllocation: Record<SubsystemId, number>;
  fuseInstalled: FuseRating | null;
  valveSettings: [number, number, number];
  starFixTaken: boolean;
  trajectorySet: boolean;
  ritual: RitualState;
  toolCalls: number;
  won: boolean;
  chapter: ChapterId;
  sealedLogRead: boolean;
  ending: EndingId | null;
  checkpoint: Checkpoint | null;
  chapter2: Chapter2State;
  killswitch: KillswitchState;
  chapter3: Chapter3State;
  ngPlus: boolean; // New Game+: the plus rules profile and a ship that remembers
  chapter1v: Chapter1VariantState;
  chapter2v: Chapter2VariantState;
  chapter3v: Chapter3VariantState;
}
