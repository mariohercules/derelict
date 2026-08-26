import type { BreakerId, FuseRating, SubsystemId } from './types';

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

export const INITIAL_ALLOCATION: Record<SubsystemId, number> = {
  life_support: 25,
  medbay: 5,
  comms: 10,
  doors: 0,
  engines: 0,
};

export const EMERGENCY_BULLETIN =
  'AUTOMATED BULLETIN — ISV CORMORANT. Main computer: offline. Auxiliary model-context link: active (that would be you). ' +
  'Crew life signs: one (1), cryo bay. Recommendation: cooperate with it. It cannot reach the systems. You cannot reach the walls.';

export const MAINTENANCE_LOG =
  'AUX POWER PANEL P-7 — bring breakers online in LOAD ORDER: C (life support), A (main bus), B (lighting). ' +
  'Any other order trips the master relay and resets the panel. Yes, someone labeled them out of order. No, we never found out who.';

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

export const CREW_LOGS: CrewLogEntry[] = [
  {
    id: 1,
    author: 'Cpt. Vasquez',
    text: 'Micrometeorite storm took out the ring section and the main computer. Ordering evacuation on pod one. Okafor refuses to board. I am logging my objection and, privately, my respect.',
  },
  {
    id: 2,
    author: 'Chief Eng. Okafor',
    text: 'Cryo cycles cannot be interrupted mid-thaw — moving the pod would have killed our medic. So I stayed. You do not leave a shipmate on ice. Amara would agree, loudly.',
  },
  {
    id: 3,
    author: 'Chief Eng. Okafor',
    text: 'Reactor stabilized at forty percent. Power rerouting works but the engine feed needs a manual fuse — I left notes in the schematics. Whoever reads this: I hope you have decent help.',
  },
  {
    id: 4,
    author: 'Chief Eng. Okafor',
    text: 'Coolant sensor bus fried in the storm. The analog gauges are fine. Eyes on the glass, math in the machine — that is the whole trick of this ship now.',
  },
  {
    id: 5,
    author: 'Chief Eng. Okafor',
    text: 'Nine weeks. Took the last shuttle — supplies were done. Escape pod two is flight-ready and yours. Launch authorization: OVERRIDE-THETA. Your AI has the con. Trust it. It is better company than most people I have shipped with.',
  },
];
