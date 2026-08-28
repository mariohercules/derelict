export type RoomId = 'cryo_bay' | 'engineering' | 'bridge';
export type SubsystemId = 'life_support' | 'doors' | 'medbay' | 'engines' | 'comms';
export type DoorId = 'cryo_exit' | 'engineering_exit';
export type FuseRating = '5A' | '10A' | '15A';
export type BreakerId = 'A' | 'B' | 'C';
export type LaunchPhase = 'idle' | 'countdown' | 'launched';

export interface ActionResult {
  ok: boolean;
  message: string;
}

export interface LaunchState {
  phase: LaunchPhase;
  countdownEndsAt: number | null; // epoch ms
  handleHeld: boolean;
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
  launch: LaunchState;
  toolCalls: number;
  won: boolean;
}
