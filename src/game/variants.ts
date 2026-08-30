// Which puzzle a ship rolled for each chapter-1 room, and the secrets those
// variant puzzles use. Everything derives on a dedicated PRNG stream (seed XOR
// a per-use salt) so secretsFor's draw order stays frozen forever: adding
// variants can never shift a shipped ship's secrets.
import { CLASSIC_SEED, prng } from './secrets';

export type VariantRoom = 'cryo_bay' | 'engineering' | 'bridge';

const ROOM_SALTS: Record<VariantRoom, number> = {
  cryo_bay: 0x1a2b3c4d,
  engineering: 0x5e6f7a8b,
  bridge: 0x0c9d1e2f,
};
const SECRETS_SALT = 0x7f4a9c31;

export function variantFor(seed: number, room: VariantRoom): 0 | 1 {
  if (seed === CLASSIC_SEED) return 0;
  return prng((seed ^ ROOM_SALTS[room]) >>> 0)() < 0.5 ? 0 : 1;
}

export interface VariantSecrets {
  cableBuses: [number, number, number]; // bus (1–3) for red, green, blue — a full permutation
  gearTeeth: { target: number; decoys: [number, number] }; // three distinct tooth counts, 13–29
  coilPhases: [number, number, number]; // 0–11 each
  driftFix: [string, string, string]; // three zero-padded two-digit codes
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
  // appended AFTER driftFix — never inserted mid-stream.
  const teeth: number[] = [];
  while (teeth.length < 3) {
    const t = int(13, 29);
    if (!teeth.includes(t)) teeth.push(t);
  }
  let coilPhases: [number, number, number] = [int(0, 11), int(0, 11), int(0, 11)];
  // Guard the rare all-zero draw: a coil-drive ship whose phases are all 0 at
  // rest would need no player action to solve. Deterministic; variants are
  // unshipped, so changing a 1-in-1728 seed's phases is safe.
  while (coilPhases.every((p) => p === 0)) {
    coilPhases = [int(0, 11), int(0, 11), int(0, 11)];
  }
  const driftFix = [0, 1, 2].map(() => String(int(7, 99)).padStart(2, '0')) as [string, string, string];
  return {
    cableBuses: buses as [number, number, number],
    gearTeeth: { target: teeth[0], decoys: [teeth[1], teeth[2]] },
    coilPhases,
    driftFix,
  };
}
