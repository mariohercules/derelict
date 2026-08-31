// Which puzzle a ship rolled for each remixable room, and the secrets those
// variant puzzles use. Everything derives on a dedicated PRNG stream (seed XOR
// a per-use salt) so secretsFor's draw order stays frozen forever: adding
// variants can never shift a shipped ship's secrets.
import { CLASSIC_SEED, prng, secretsFor } from './secrets';

export type VariantRoom = 'cryo_bay' | 'engineering' | 'bridge' | 'crew_quarters' | 'hydroponics' | 'cargo_bay';

const ROOM_SALTS: Record<VariantRoom, number> = {
  cryo_bay: 0x1a2b3c4d,
  engineering: 0x5e6f7a8b,
  bridge: 0x0c9d1e2f,
  crew_quarters: 0x3d7e9a51,
  hydroponics: 0x92b4c6e8,
  cargo_bay: 0x4f81d2a7,
};
const SECRETS_SALT = 0x7f4a9c31;

// The six drawings on the crew-quarters wall, in display order. On a keyed
// ship the captain's spare key hides behind DRAWINGS[keyDrawing].
export const DRAWINGS = ['rocket', 'cake', 'cat', 'cormorant', 'sun', 'family'] as const;
export type Drawing = (typeof DRAWINGS)[number];

export function variantFor(seed: number, room: VariantRoom): 0 | 1 {
  if (seed === CLASSIC_SEED) return 0;
  return prng((seed ^ ROOM_SALTS[room]) >>> 0)() < 0.5 ? 0 : 1;
}

export interface VariantSecrets {
  cableBuses: [number, number, number]; // bus (1–3) for red, green, blue — a full permutation
  gearTeeth: { target: number; decoys: [number, number] }; // three distinct tooth counts, 13–29
  coilPhases: [number, number, number]; // 0–11 each
  driftFix: [string, string, string]; // three zero-padded two-digit codes
  keyDrawing: number; // 0–5: index into DRAWINGS (Plan F2)
  stackSlots: [number, number]; // two decoy two-tier slots, 0–8, distinct, never the quarantine slot (Plan F2)
}

export function variantSecretsFor(seed: number): VariantSecrets {
  const rnd = prng((seed ^ SECRETS_SALT) >>> 0);
  const int = (min: number, max: number) => min + Math.floor(rnd() * (max - min + 1));
  const buses = [1, 2, 3];
  for (let i = buses.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [buses[i], buses[j]] = [buses[j], buses[i]];
  }
  // The draw count varies per seed (a duplicate roll costs an extra draw), so
  // unlike secretsFor, positions here shift: any future field must be
  // appended AFTER the last draw in this function (stackSlots) — never
  // inserted mid-stream. Everything through driftFix shipped in Plan F and is
  // pinned by FROZEN_VARIANT_8.
  const teeth: number[] = [];
  while (teeth.length < 3) {
    const t = int(13, 29);
    if (!teeth.includes(t)) teeth.push(t);
  }
  let coilPhases: [number, number, number] = [int(0, 11), int(0, 11), int(0, 11)];
  // Guard the rare all-zero draw: a coil-drive ship whose phases are all 0 at
  // rest would need no player action to solve.
  while (coilPhases.every((p) => p === 0)) {
    coilPhases = [int(0, 11), int(0, 11), int(0, 11)];
  }
  const driftFix = [0, 1, 2].map(() => String(int(7, 99)).padStart(2, '0')) as [string, string, string];
  // ---- Plan F2 (chapter 2). Drawn strictly after driftFix.
  const keyDrawing = int(0, DRAWINGS.length - 1);
  const q = secretsFor(seed).quarantineSlot;
  const qIndex = q.row * 3 + q.col;
  const stackSlots: number[] = [];
  while (stackSlots.length < 2) {
    const i = int(0, 8);
    if (i !== qIndex && !stackSlots.includes(i)) stackSlots.push(i);
  }
  return {
    cableBuses: buses as [number, number, number],
    gearTeeth: { target: teeth[0], decoys: [teeth[1], teeth[2]] },
    coilPhases,
    driftFix,
    keyDrawing,
    stackSlots: stackSlots as [number, number],
  };
}

// Crates per slot on a ship's cargo deck, slot index = row*3 + col: two high at
// the quarantine slot and both decoy slots on a stacked ship, one high
// everywhere on every other ship (the classic ship included).
export function tiersFor(seed: number): number[] {
  const tiers: number[] = Array(9).fill(1);
  if (variantFor(seed, 'cargo_bay') !== 1) return tiers;
  const q = secretsFor(seed).quarantineSlot;
  for (const i of [q.row * 3 + q.col, ...variantSecretsFor(seed).stackSlots]) tiers[i] = 2;
  return tiers;
}
