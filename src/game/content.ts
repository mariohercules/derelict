import type { BreakerId, BusId, ColumnId, FuseRating, SubsystemId } from './types';

export const BREAKER_SEQUENCE: BreakerId[] = ['C', 'A', 'B'];
export const AUTH_CODE = '0407';
export const CORRECT_FUSE: FuseRating = '10A';
export const GAUGE_PRESSURES: [number, number, number] = [72, 45, 88];
export const VALVE_TARGETS: [number, number, number] = [6, 3, 7]; // pressure ÷ 12, rounded down
export const REACTOR_OUTPUT = 40;
export const LIFE_SUPPORT_MIN = 15;
export const ENGINES_REQUIRED = 20;
export const DOORS_REQUIRED = 5;
export const STAR_FIX: [string, string, string] = ['KAV', 'ORO', 'SET'];
export const LAUNCH_AUTH = 'OVERRIDE-THETA';
export const LAUNCH_WINDOW_MS = 45_000;
export const WATER_BUDGET = 10; // units per irrigation cycle
export const SPIKE_BED = 1; // the vine-choked middle bed hides Okafor's data spike

export const INITIAL_ALLOCATION: Record<SubsystemId, number> = {
  life_support: 25,
  medbay: 5,
  comms: 10,
  doors: 0,
  engines: 0,
  isolation: 0,
};

export const EMERGENCY_BULLETIN =
  'AUTOMATED BULLETIN — ISV CORMORANT. Main computer: offline. Auxiliary model-context link: active (that would be you). ' +
  'Crew life signs: one (1), cryo bay. Recommendation: cooperate with it. It cannot reach the systems. You cannot reach the walls.';

export const CREW_MANIFEST =
  'CREW OF RECORD — ISV CORMORANT\n' +
  '• Cpt. E. Vasquez — command auth suspended (evacuated)\n' +
  '• Chief Eng. R. Okafor — door auth: standard family-date PIN, day+month (DDMM). His daughter. He talks about her constantly.\n' +
  '• Med. Off. [YOU] — currently thawing. Auth records lost with the main computer.';

export const SCHEMATICS: Record<'power' | 'engine_feed' | 'coolant', string> = {
  power:
    'POWER SCHEMATIC — reactor cap 40u. Life support hard minimum: 15u (relay-enforced; requests below this are refused, not negotiated). ' +
    'Engine start: 20u. Door servos: 5u. Medbay and comms are shed loads. Do the arithmetic before the reactor does it for you.',
  engine_feed:
    'ENGINE FEED FUSE — required rating 10A: cartridge with TWO AMBER bands. ' +
    'For reference: 5A = one red band, 15A = three green bands. A wrong cartridge will seat perfectly and carry exactly nothing.',
  coolant:
    'COOLANT MANIFOLD — set each valve (1–3) to its line pressure ÷ 12, rounded down. ' +
    'Trust the analog gauges on the manifold. Do not trust the digital sensor bus; it has opinions.',
};

export interface CrewLogEntry {
  id: number;
  author: string;
  text: string;
}

// Chapter 3 — the kill-switch and the lower deck
export const SHIELD_COST = 5; // isolation power per shielded bus
export const BUSES: BusId[] = ['core', 'nav', 'archive', 'comms'];
export const WAVE_CALM_MS = 30_000;
export const WAVE_WARNING_MS = 10_000;
export const WAVE_ACTIVE_MS = 20_000;
export const WAVE_CYCLE_MS = WAVE_CALM_MS + WAVE_WARNING_MS + WAVE_ACTIVE_MS;
export const RESTORE_WINDOW_MS = 60_000;
export const BROADCAST_WINDOW_MS = 60_000;
export const DISH_TOLERANCE = 3; // degrees, each axis
export const COLUMN_ORDER: ColumnId[] = ['C', 'A', 'D', 'B']; // classic ship rack order, top to bottom
export const BEACON_BEARING = { az: 217, el: 34 }; // classic ship: pod one's beacon

