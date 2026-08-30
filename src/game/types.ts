export type RoomId =
  | 'cryo_bay' | 'engineering' | 'bridge'
  | 'medbay' | 'crew_quarters' | 'hydroponics' | 'cargo_bay'
  | 'reactor_room' | 'core_vault' | 'comms_array';
export type SubsystemId = 'life_support' | 'doors' | 'medbay' | 'engines' | 'comms';
export type DoorId = 'cryo_exit' | 'engineering_exit';
export type FuseRating = '5A' | '10A' | '15A';
export type BreakerId = 'A' | 'B' | 'C';

export interface ActionResult {
  ok: boolean;
  message: string;
}

export type ChapterId = 1 | 2 | 3;
export type EndingId = 'leave_unknowing' | 'leave_knowing';

export type RitualId = 'launch';
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

export type KillswitchState = 'dormant' | 'stirring';

export interface Chapter2State {
  medbandExamined: boolean;
  commandTraced: boolean;
  safeOpened: boolean;
  recorderPlayed: boolean;
  privateLogDecrypted: boolean;
  irrigation: [number, number, number];
  irrigationSolved: boolean;
  spikeRetrieved: boolean;
  craneAt: { row: number; col: number };
  crateLifted: boolean;
  sampleAnalyzed: boolean;
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
}
