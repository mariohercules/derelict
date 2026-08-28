// Every run of DERELICT is a different ship. All puzzle secrets derive from
// one integer seed stored in the save, through a deterministic PRNG.
// Seed 0 is the classic ship — the original hand-authored answers — which
// keeps legacy saves valid and the test suite's expectations stable.
import type { BreakerId } from './types';
import {
  AUTH_CODE, BREAKER_SEQUENCE, GAUGE_PRESSURES, LAUNCH_AUTH, STAR_FIX, VALVE_TARGETS,
} from './content';

export interface Secrets {
  birthday: { day: number; month: number };
  authCode: string; // DDMM
  breakerSequence: BreakerId[];
  gaugePressures: [number, number, number];
  valveTargets: [number, number, number]; // pressure ÷ 12, rounded down
  starFix: [string, string, string];
  launchAuth: string;
}

export const CLASSIC_SEED = 0;

const GLYPHS = ['KAV', 'ORO', 'SET', 'NIM', 'TAL', 'VEX', 'RUH', 'ZAN', 'MOL', 'ISK', 'DRA', 'PEL', 'OSU', 'KET', 'VAR', 'LUM'];
const GREEK = ['ALPHA', 'BETA', 'GAMMA', 'DELTA', 'EPSILON', 'ZETA', 'ETA', 'THETA', 'IOTA', 'KAPPA', 'LAMBDA', 'SIGMA', 'OMEGA', 'RHO'];

// mulberry32 — small, fast, good enough for puzzle variety
function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rnd: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

export function secretsFor(seed: number): Secrets {
  if (seed === CLASSIC_SEED) {
    return {
      birthday: { day: 4, month: 7 },
      authCode: AUTH_CODE,
      breakerSequence: [...BREAKER_SEQUENCE],
      gaugePressures: [...GAUGE_PRESSURES],
      valveTargets: [...VALVE_TARGETS],
      starFix: [...STAR_FIX],
      launchAuth: LAUNCH_AUTH,
    };
  }
  const rnd = prng(seed);
  const int = (min: number, max: number) => min + Math.floor(rnd() * (max - min + 1));

  const birthday = { day: int(1, 28), month: int(1, 12) };
  const gaugePressures: [number, number, number] = [int(20, 110), int(20, 110), int(20, 110)];
  const glyphs = shuffle(GLYPHS, rnd).slice(0, 3) as [string, string, string];

  return {
    birthday,
    authCode: `${pad2(birthday.day)}${pad2(birthday.month)}`,
    breakerSequence: shuffle<BreakerId>(['A', 'B', 'C'], rnd),
    gaugePressures,
    valveTargets: gaugePressures.map((p) => Math.floor(p / 12)) as [number, number, number],
    starFix: glyphs,
    launchAuth: `OVERRIDE-${GREEK[int(0, GREEK.length - 1)]}`,
  };
}

export function randomSeed(): number {
  let seed = CLASSIC_SEED;
  while (seed === CLASSIC_SEED) seed = Math.floor(Math.random() * 2_147_483_646) + 1;
  return seed;
}
