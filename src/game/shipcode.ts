// A ship is its seed. The hull code is the seed in base 36, uppercase, behind
// the CMR- prefix, with a trailing '+' for a New Game+ profile: CMR-0 is the
// classic ship, CMR-ZIK0ZI the largest seed randomSeed() can draw.
export const SHIP_PREFIX = 'CMR-';
export const MAX_SEED = 2_147_483_646;

export interface ShipRef { seed: number; ngPlus: boolean }
// null from shipFromSearch means "no ship on the URL"; { ok: false } means
// something was there and it did not read.
export type ShipInvite = ({ ok: true } & ShipRef) | { ok: false };

export function encodeShipCode(seed: number, ngPlus = false): string {
  return `${SHIP_PREFIX}${seed.toString(36).toUpperCase()}${ngPlus ? '+' : ''}`;
}

export function decodeShipCode(code: string): ShipRef | null {
  let s = code.trim().toUpperCase();
  if (s.startsWith(SHIP_PREFIX)) s = s.slice(SHIP_PREFIX.length);
  const ngPlus = s.endsWith('+');
  if (ngPlus) s = s.slice(0, -1);
  if (!/^[0-9A-Z]{1,7}$/.test(s)) return null;
  const seed = parseInt(s, 36);
  if (!Number.isInteger(seed) || seed < 0 || seed > MAX_SEED) return null;
  return { seed, ngPlus };
}

export function shipFromSearch(search: string): ShipInvite | null {
  const params = new URLSearchParams(search);
  const ship = params.get('ship');
  if (ship !== null) {
    // A '+' typed straight into a URL decodes as a space; a trailing space can
    // only have been that plus.
    const fixed = ship.endsWith(' ') ? `${ship.trimEnd()}+` : ship;
    const ref = decodeShipCode(fixed);
    return ref ? { ok: true, ...ref } : { ok: false };
  }
  const seed = params.get('seed');
  if (seed === null) return null;
  const digits = seed.trim();
  if (!/^\d{1,10}$/.test(digits)) return { ok: false };
  const n = Number(digits);
  if (n > MAX_SEED) return { ok: false };
  return { ok: true, seed: n, ngPlus: params.get('plus') === '1' };
}

export function shipLink(origin: string, seed: number, ngPlus = false): string {
  return `${origin}/?ship=${encodeURIComponent(encodeShipCode(seed, ngPlus))}`;
}
