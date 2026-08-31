# Remixed Ships, Chapter 2 — Plan F2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each chapter-2 puzzle room a second puzzle chosen by seed — a keyed safe with the key behind one of Amara's drawings, a hydroponics manifold whose need tags are corroded and whose numbers only the agent's moisture sweep can read, a re-racked cargo bay where the quarantine container sits under a pallet — while the classic ship (seed 0), every chapter-1 variant draw, and the agent's tool contract stay byte-for-byte identical.

**Architecture:** `src/game/variants.ts` grows three rooms (new salts) and two secrets appended strictly after `driftFix` on the existing dedicated PRNG stream, plus a `tiersFor(seed)` layout helper. One new persisted slice `chapter2v` (`keyFound`, `held`, `tiers`) holds the variant puzzles' inputs; outcomes land in the existing flags (`safeOpened`, `crateLifted`, `irrigationSolved`/`lastCycle`), so every downstream gate — `decrypt_private_log`, `analyze_sample`, the atomic chapter-3 transition — is untouched. Scenes swap only the puzzle panel (`variantFor(seed, room) === 1 ? <KeyedSafe/> : <Safe/>`); tools keep their names, schemas and descriptions — only the content they read (crew manifest, cargo manifest, the irrigation report) follows the ship.

**Tech Stack:** React 19 + TypeScript + Vite, Zustand, Vitest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-30-derelict-remixed-ships-chapter2-design.md` (§3 derivation, §4 state + actions, §5 puzzles, §6 agent surface, §7 scenes, §8 persistence, §9 testing). Base: `directors-cut` @ `fe4118f` (= `main` `0fc559f` + the spec; 253 tests, 31 tools).

## Global Constraints

- **The classic ship is untouchable:** `variantFor(0, room) === 0` for all six rooms; with variant 0 every action, tool response, scene and test behaves exactly as shipped. `secretsFor` is not edited at all. `FROZEN_1234` (secrets) and the new `FROZEN_VARIANT_8` (variants) stay green.
- **Chapter-1 variant draws are frozen:** every new `variantSecretsFor` field is drawn **after `driftFix`**; `stackSlots` is the last draw, and any future field appends after it.
- **No tool contract change:** no new tools, no schema or description edits, `buildTools()` stays 31; a snapshot test pins names, descriptions and input schemas. Machine values (slot label, deficits, `tier`) identical across locales.
- Variant derivation and secrets live only in `src/game/variants.ts`, on their own PRNG stream; they are defined for every seed (including 0).
- `chapter2v` is persisted; `validShape` validates it by shape when present (`keyFound`/`held` booleans, `tiers` exactly 9 ints each 1 or 2); a save without it is filled with `tiersFor(seed)` after validation.
- **Premium graphics standard (non-negotiable):** every new graphic is an SVG instrument — bezels and inset faces, deterministic geometry (no randomness at render; wear keyed on index), palette tokens (`--steel*`, `--face*`, `--brass*`, `--parchment`, semantic tokens; scene-material colours may be literal like hydroponics' soil), transitions only (the global reduced-motion rule covers them), defs prefixes `ks-`/`dw-`/`sd-` (hydroponics reuses `hy-`), `role="img"` + `aria-label` from strings on instruments, real `<button>` controls with aria-labels and visible focus. The scene never reads a secret before the puzzle reveals it (the key's drawing only after `keyFound`; the quarantine slot only after `crateLifted`).
- All player-facing text in both locales in `src/ui/strings.ts`; agent-facing text English, in-fiction, anti-deflection conventions (no imaginary keypads; the refusal names the human's next physical step).
- Branch `directors-cut`; merge to `main` + prod deploy in Task 7 only after Mario's preview playthrough and explicit "aprovado".
- Commit messages end with a blank line then `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Verification gate for every commit: `npx vitest run && npm run build` both exit 0 (judge on exit codes, not on output text).

---

### Task 1: Three more rooms, two more secrets, `tiersFor`, the `chapter2v` slice, and persistence

**Files:**
- Modify: `src/game/variants.ts` (whole file replaced below), `src/game/types.ts`, `src/game/store.ts` (imports + `initialState` only), `src/game/persist.ts`
- Test: `src/game/variants.test.ts` (extend), `src/game/persist.test.ts` (append)

**Interfaces:**
- Consumes: `prng`, `CLASSIC_SEED`, `secretsFor` from `src/game/secrets.ts` (unchanged).
- Produces: `VariantRoom` (six rooms); `DRAWINGS = ['rocket','cake','cat','cormorant','sun','family'] as const` and `type Drawing`; `VariantSecrets.keyDrawing: number` (0–5) and `.stackSlots: [number, number]`; `tiersFor(seed): number[]` (9 entries, 1 or 2); `Chapter2VariantState { keyFound: boolean; held: boolean; tiers: number[] }`; `GameState.chapter2v`; `initialState(seed).chapter2v = { keyFound: false, held: false, tiers: tiersFor(seed) }`; persist validation + fill.

- [ ] **Step 1: Failing tests**

Replace the top of `src/game/variants.test.ts` (the import lines and the `ROOMS` constant) with:

```ts
import { describe, expect, it } from 'vitest';
import { DRAWINGS, tiersFor, variantFor, variantSecretsFor } from './variants';
import type { VariantRoom } from './variants';
import { secretsFor } from './secrets';

const ROOMS: VariantRoom[] = ['cryo_bay', 'engineering', 'bridge', 'crew_quarters', 'hydroponics', 'cargo_bay'];

// Frozen from the Plan F build (variantSecretsFor(8) before Plan F2 appended
// keyDrawing/stackSlots). If this fails, a draw landed before driftFix — move it after.
const FROZEN_VARIANT_8 = {
  cableBuses: [3, 1, 2],
  gearTeeth: { target: 16, decoys: [13, 28] },
  coilPhases: [0, 7, 3],
  driftFix: ['57', '16', '38'],
};
```

The four existing `describe('variantFor')` tests now cover six rooms through `ROOMS` — leave their bodies as they are. Append inside `describe('variantSecretsFor', …)`, after the `is deterministic` test:

```ts
  it('keeps every chapter-1 variant draw of a seeded ship unchanged', () => {
    const v = variantSecretsFor(8);
    expect({ cableBuses: v.cableBuses, gearTeeth: v.gearTeeth, coilPhases: v.coilPhases, driftFix: v.driftFix }).toEqual(FROZEN_VARIANT_8);
  });

  it('draws a key drawing and two decoy stacks that never hide the quarantine slot', () => {
    for (let seed = 0; seed <= 400; seed++) {
      const v = variantSecretsFor(seed);
      expect(v.keyDrawing).toBeGreaterThanOrEqual(0);
      expect(v.keyDrawing).toBeLessThan(DRAWINGS.length);
      const q = secretsFor(seed).quarantineSlot;
      const qIndex = q.row * 3 + q.col;
      expect(v.stackSlots).toHaveLength(2);
      expect(v.stackSlots[0]).not.toBe(v.stackSlots[1]);
      for (const i of v.stackSlots) {
        expect(i).toBeGreaterThanOrEqual(0);
        expect(i).toBeLessThanOrEqual(8);
        expect(i).not.toBe(qIndex);
      }
    }
  });
```

Append a new describe at the end of the file:

```ts
describe('tiersFor', () => {
  it('is nine single-tier slots on every unstacked ship, the classic ship included', () => {
    expect(tiersFor(0)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1]);
    for (let seed = 1; seed <= 200; seed++) {
      if (variantFor(seed, 'cargo_bay') === 0) expect(tiersFor(seed)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1]);
    }
  });

  it('stacks exactly the quarantine slot and the two decoys on a stacked ship', () => {
    for (let seed = 1; seed <= 200; seed++) {
      if (variantFor(seed, 'cargo_bay') !== 1) continue;
      const tiers = tiersFor(seed);
      const q = secretsFor(seed).quarantineSlot;
      const expected = new Set([q.row * 3 + q.col, ...variantSecretsFor(seed).stackSlots]);
      expect(tiers).toHaveLength(9);
      tiers.forEach((tier, i) => expect(tier).toBe(expected.has(i) ? 2 : 1));
    }
  });
});
```

Append to `src/game/persist.test.ts`, inside `describe('persistence', …)` right after the `fills chapter1v defaults…` test:

```ts
  it('fills chapter2v for an older save from the seed and rejects malformed shapes', () => {
    const older = { ...initialState(0) } as Record<string, unknown>;
    delete older.chapter2v;
    storage.set(SAVE_KEY, JSON.stringify(older));
    expect(loadSavedState()?.chapter2v).toEqual({ keyFound: false, held: false, tiers: [1, 1, 1, 1, 1, 1, 1, 1, 1] });
    // a pre-F2 save of a ship that now rolls a stacked bay gets the bay's layout, not a flat one
    let stacked = 1;
    while (variantFor(stacked, 'cargo_bay') !== 1) stacked++;
    const olderStacked = { ...initialState(stacked) } as Record<string, unknown>;
    delete olderStacked.chapter2v;
    storage.set(SAVE_KEY, JSON.stringify(olderStacked));
    expect(loadSavedState()?.chapter2v.tiers).toEqual(tiersFor(stacked));
    expect(loadSavedState()?.chapter2v.tiers.filter((t) => t === 2)).toHaveLength(3);
    const c2v = initialState(0).chapter2v;
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), chapter2v: { ...c2v, tiers: [1, 1, 1, 1, 1, 1, 1, 1] } }));
    expect(loadSavedState()).toBeNull();
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), chapter2v: { ...c2v, tiers: [1, 1, 1, 1, 3, 1, 1, 1, 1] } }));
    expect(loadSavedState()).toBeNull();
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), chapter2v: { ...c2v, held: 'yes' } }));
    expect(loadSavedState()).toBeNull();
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), chapter2v: { ...c2v, keyFound: true } }));
    expect(loadSavedState()?.chapter2v.keyFound).toBe(true);
  });
```

and extend the persist test imports:

```ts
import { tiersFor, variantFor } from './variants';
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/game/variants.test.ts src/game/persist.test.ts`
Expected: FAIL — `DRAWINGS`/`tiersFor` are not exported; `keyDrawing`/`stackSlots`/`chapter2v` do not exist.

- [ ] **Step 3: Replace `src/game/variants.ts` with the full module**

```ts
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
```

- [ ] **Step 4: The state type**

In `src/game/types.ts`, after the `Chapter1VariantState` interface add:

```ts
// Inputs of the chapter-2 variant puzzles (Plan F2). Outcomes stay in the
// existing chapter2 flags: safeOpened, crateLifted, irrigationSolved/lastCycle.
export interface Chapter2VariantState {
  keyFound: boolean; // crew quarters: the captain's key is out from behind the drawing
  held: boolean; // cargo bay: the crane's hook carries a crate
  tiers: number[]; // cargo bay: crates per slot (row*3 + col), nine entries of 1 or 2
}
```

and add the field at the end of `GameState`, after `chapter1v`:

```ts
  chapter2v: Chapter2VariantState;
```

- [ ] **Step 5: `initialState` and the store imports**

In `src/game/store.ts`:

- Extend the type import on line 2 to include `Chapter2VariantState` (alphabetical, after `Chapter1VariantState`).
- Change the variants import (line 12) to `import { tiersFor, variantFor, variantSecretsFor } from './variants';`
- In `initialState`, after the `chapter1v: { … }` line, add:

```ts
    chapter2v: { keyFound: false, held: false, tiers: tiersFor(seed) },
```

- [ ] **Step 6: Persistence**

In `src/game/persist.ts`:

- Add `import { tiersFor } from './variants';` after the `ROOM_IDS` import.
- In `validShape`, after the `chapter1v` block and before the `powerAllocation` check:

```ts
  if (p.chapter2v !== undefined) {
    const c2v = p.chapter2v as unknown as Record<string, unknown>;
    if (!c2v || typeof c2v !== 'object') return false;
    if (typeof c2v.keyFound !== 'boolean' || typeof c2v.held !== 'boolean') return false;
    if (!Array.isArray(c2v.tiers) || c2v.tiers.length !== 9 || !c2v.tiers.every((t) => isIntInRange(t, 1, 2))) return false;
  }
```

- In `loadSavedState`, replace the two lines

```ts
    if (!validShape(parsed)) return null;
    // Merge over initialState so old saves survive new fields
    const merged = { ...initialState(), ...parsed } as GameState;
```

with

```ts
    if (!validShape(parsed)) return null;
    // Pre-F2 saves predate chapter2v; the deck layout follows the (now validated) seed.
    if (parsed.chapter2v === undefined) parsed.chapter2v = { keyFound: false, held: false, tiers: tiersFor(parsed.seed as number) };
    // Merge over initialState so old saves survive new fields
    const merged = { ...initialState(), ...parsed } as GameState;
```

- [ ] **Step 7: Run the whole gate**

Run: `npx vitest run && npm run build`
Expected: both exit 0. Test count 253 → 258 (five new: the frozen guard, the key/stack draws, two `tiersFor`, the persist test; the `variantFor` suite still counts as four while now covering six rooms).

- [ ] **Step 8: Commit**

```bash
git add src/game/variants.ts src/game/variants.test.ts src/game/types.ts src/game/store.ts src/game/persist.ts src/game/persist.test.ts
git commit -m "feat: chapter-2 variant rooms, key and stack draws, the chapter2v slice

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Store actions — the keyed safe, the moisture sweep, the stacked crane

**Files:**
- Modify: `src/game/store.ts` (`dialSafe`, `runIrrigation`, `liftCrate`, plus a new chapter-2 variants block at the end), `src/game/derived.ts` (one new pure helper)
- Test: `src/game/store.variants.test.ts` (append)

**Interfaces:**
- Consumes: `Chapter2VariantState`, `GameState.chapter2v`, `variantFor`, `variantSecretsFor(seed).keyDrawing/.stackSlots`, `DRAWINGS`, `tiersFor` (Task 1); `secretsFor(seed).quarantineSlot/.waterNeeds`, `slotLabel`, `irrigationReport`, `patch2` (existing).
- Produces: `liftDrawing(index: 0|1|2|3|4|5): ActionResult`; `turnSafeKey(): ActionResult`; `lowerCrate(): ActionResult`; `liftCrate()` variant branch; `dialSafe()` refuses on a keyed ship; `runIrrigation()` return type gains optional `deficits: (number | null)[]` (present only on a hydroponics-variant ship); `sweepDeficitsFor(seed, irrigation): (number | null)[]` in `derived.ts`.

- [ ] **Step 1: Failing tests**

Append to `src/game/store.variants.test.ts`. First extend its imports:

```ts
import {
  startInvestigation, liftDrawing, turnSafeKey, dialSafe, decryptPrivateLog,
  setIrrigation, runIrrigation, retrieveSpike,
  moveCrane, liftCrate, lowerCrate, analyzeSample,
} from './store';
import { sweepDeficitsFor } from './derived';
import { DRAWINGS, tiersFor } from './variants';
```

(keep the existing `import { gameStore, resetGame, … } from './store'` line; the new names may be merged into it instead — one import statement per module is the repo style.)

Then append at the end of the file:

```ts
// ---------------------------------------------------------------- chapter 2

const S_KS = findSeed((s) => variantFor(s, 'crew_quarters') === 1);
const S_HP = findSeed((s) => variantFor(s, 'hydroponics') === 1);
const S_SD = findSeed((s) => variantFor(s, 'cargo_bay') === 1);

function investigating(seed: number, room: 'crew_quarters' | 'hydroponics' | 'cargo_bay') {
  resetGame(seed);
  gameStore.setState({ room: 'bridge', act: 3, trajectorySet: true, sealedLogRead: true });
  startInvestigation();
  gameStore.setState({ room });
}

function driveTo(index: number) {
  for (let i = 0; i < 2; i++) { moveCrane('up'); moveCrane('left'); } // home
  for (let r = 0; r < Math.floor(index / 3); r++) moveCrane('down');
  for (let c = 0; c < index % 3; c++) moveCrane('right');
}

describe('keyed safe (crew quarters variant 1)', () => {
  it('exists only on a keyed ship, only in the crew quarters, and the wheels refuse there', () => {
    investigating(0, 'crew_quarters');
    expect(liftDrawing(0).ok).toBe(false);
    expect(turnSafeKey().ok).toBe(false);
    expect(dialSafe(secretsFor(0).safeCombo).ok).toBe(true); // the classic safe is untouched
    investigating(S_KS, 'hydroponics');
    expect(liftDrawing(0).ok).toBe(false);
    gameStore.setState({ room: 'crew_quarters' });
    expect(dialSafe(secretsFor(S_KS).safeCombo).ok).toBe(false);
    expect(dialSafe(secretsFor(S_KS).safeCombo).message).toMatch(/no wheels/);
    expect(gameStore.getState().chapter2.safeOpened).toBe(false);
  });

  it('a wrong drawing changes nothing; the right one yields the key; the key opens the safe and the log', () => {
    investigating(S_KS, 'crew_quarters');
    const at = variantSecretsFor(S_KS).keyDrawing;
    const wrong = (at + 1) % DRAWINGS.length;
    expect(turnSafeKey().ok).toBe(false); // no key yet
    const miss = liftDrawing(wrong as 0 | 1 | 2 | 3 | 4 | 5);
    expect(miss.ok).toBe(false);
    expect(miss.message).toContain(DRAWINGS[wrong]);
    expect(gameStore.getState().chapter2v.keyFound).toBe(false);
    expect(liftDrawing(at as 0 | 1 | 2 | 3 | 4 | 5).ok).toBe(true);
    expect(gameStore.getState().chapter2v.keyFound).toBe(true);
    expect(decryptPrivateLog().ok).toBe(false); // still locked
    expect(turnSafeKey().ok).toBe(true);
    expect(gameStore.getState().chapter2.safeOpened).toBe(true);
    expect(decryptPrivateLog().ok).toBe(true);
    expect(turnSafeKey().ok).toBe(true); // idempotent once open
  });
});

describe('moisture sweep (hydroponics variant 1)', () => {
  it('the classic ship never reports deficits', () => {
    investigating(0, 'hydroponics');
    expect(runIrrigation()).not.toHaveProperty('deficits');
  });

  it('closed lines read their deficit, open lines read null; the numbers then solve the manifold', () => {
    investigating(S_HP, 'hydroponics');
    const needs = secretsFor(S_HP).waterNeeds;
    const sweep = runIrrigation();
    expect(sweep.ok).toBe(true);
    expect(sweep.deficits).toEqual([...needs]);
    expect(sweep.beds).toEqual(['dry', 'dry', 'dry']);
    expect(sweep.solved).toBe(false);
    expect(sweep.message).toMatch(/Moisture sweep/);
    expect(gameStore.getState().chapter2.lastCycle).toEqual(['dry', 'dry', 'dry']);
    setIrrigation(0, needs[0]);
    const partial = runIrrigation();
    expect(partial.deficits).toEqual([null, needs[1], needs[2]]);
    expect(partial.beds[0]).toBe('ok');
    setIrrigation(1, needs[1]);
    setIrrigation(2, needs[2]);
    const done = runIrrigation();
    expect(done.solved).toBe(true);
    expect(done.deficits).toEqual([null, null, null]);
    expect(gameStore.getState().chapter2.irrigationSolved).toBe(true);
    expect(retrieveSpike().ok).toBe(true);
    expect(sweepDeficitsFor(S_HP, [0, needs[1], 0])).toEqual([needs[0], null, needs[2]]);
  });
});

describe('stacked bay (cargo variant 1)', () => {
  it('the classic crane has no LOWER and lifts straight from the slot', () => {
    investigating(0, 'cargo_bay');
    expect(lowerCrate().ok).toBe(false);
    expect(gameStore.getState().chapter2v.tiers).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1]);
    const q = secretsFor(0).quarantineSlot;
    driveTo(q.row * 3 + q.col);
    expect(liftCrate().ok).toBe(true);
    expect(gameStore.getState().chapter2.crateLifted).toBe(true);
  });

  it('pallet up, park it, come back, lift the container, name the Kestrel', () => {
    investigating(S_SD, 'cargo_bay');
    const q = secretsFor(S_SD).quarantineSlot;
    const qi = q.row * 3 + q.col;
    const { stackSlots } = variantSecretsFor(S_SD);
    expect(gameStore.getState().chapter2v.tiers).toEqual(tiersFor(S_SD));
    const single = tiersFor(S_SD).findIndex((t, i) => t === 1 && i !== qi);
    expect(lowerCrate().ok).toBe(false); // nothing on the hook
    driveTo(qi);
    const pallet = liftCrate();
    expect(pallet.ok).toBe(true);
    expect(gameStore.getState().chapter2.crateLifted).toBe(false);
    expect(gameStore.getState().chapter2v.held).toBe(true);
    expect(gameStore.getState().chapter2v.tiers[qi]).toBe(1);
    expect(liftCrate().ok).toBe(false); // one crate at a time
    expect(gameStore.getState().chapter2.crateLifted).toBe(false);
    driveTo(stackSlots[0]);
    expect(lowerCrate().ok).toBe(false); // that slot is already two high
    expect(gameStore.getState().chapter2v.held).toBe(true);
    driveTo(single);
    expect(lowerCrate().ok).toBe(true);
    expect(gameStore.getState().chapter2v.held).toBe(false);
    expect(gameStore.getState().chapter2v.tiers[single]).toBe(2);
    driveTo(qi);
    expect(liftCrate().ok).toBe(true);
    expect(gameStore.getState().chapter2.crateLifted).toBe(true);
    expect(analyzeSample(secretsFor(S_SD).registryFragment).ok).toBe(true);
    expect(gameStore.getState().chapter).toBe(3);
    expect(gameStore.getState().checkpoint).toEqual({ chapter: 3, room: 'cargo_bay' });
  });

  it('a decoy stack lifts and parks like any pallet; a single wrong crate is refused as before', () => {
    investigating(S_SD, 'cargo_bay');
    const q = secretsFor(S_SD).quarantineSlot;
    const qi = q.row * 3 + q.col;
    const { stackSlots } = variantSecretsFor(S_SD);
    const single = tiersFor(S_SD).findIndex((t, i) => t === 1 && i !== qi);
    driveTo(single);
    expect(liftCrate().ok).toBe(false); // ordinary crate, one high, wrong slot
    expect(gameStore.getState().chapter2v.held).toBe(false);
    driveTo(stackSlots[1]);
    expect(liftCrate().ok).toBe(true);
    expect(gameStore.getState().chapter2v.held).toBe(true);
    driveTo(qi);
    expect(lowerCrate().ok).toBe(false); // the quarantine slot is still two high
    driveTo(single);
    expect(lowerCrate().ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/game/store.variants.test.ts`
Expected: FAIL — `liftDrawing`, `turnSafeKey`, `lowerCrate`, `sweepDeficitsFor` are not exported.

- [ ] **Step 3: The sweep helper in `src/game/derived.ts`**

After `irrigationReport(s)` add:

```ts
// Plan F2 (hydroponics variant): the pump's moisture probe reads a bed only
// while its line is closed — every bed at valve 0 reports its need, the rest null.
export function sweepDeficitsFor(seed: number, irrigation: [number, number, number]): (number | null)[] {
  const needs = secretsFor(seed).waterNeeds;
  return irrigation.map((v, i) => (v === 0 ? needs[i] : null));
}
```

- [ ] **Step 4: `dialSafe` refuses on a keyed ship**

In `src/game/store.ts`, `dialSafe`, insert directly after the room check:

```ts
  if (variantFor(s.seed, 'crew_quarters') === 1) return { ok: false, message: 'This safe has no wheels. It wants a key; the wall has six drawings.' };
```

- [ ] **Step 5: `runIrrigation` reports deficits on a probe ship**

Replace the whole `runIrrigation` function with:

```ts
const IRRIGATION_SOLVED =
  'Cycle complete. Every bed drinks exactly what it needs — and the middle bed drains low enough to show what the vine was hiding. ' +
  'Tell the crew member to pull the data spike from the middle bed by hand — it is exposed now.';
const IRRIGATION_WRONG = 'Cycle complete. Some beds are wrong; the crew member sets the valves by hand — read them the bed states.';

export function runIrrigation(): ActionResult & { beds: string[]; solved: boolean; deficits?: (number | null)[] } {
  const s = gameStore.getState();
  if (s.chapter < 2) return { ok: false, message: 'Hydroponics is off the bus.', beds: [], solved: false };
  const r = irrigationReport(s);
  if (r.overBudget) {
    return { ok: false, message: `Pump overload: ${r.total}u requested, ${WATER_BUDGET}u available. The cycle aborts before it starts.`, beds: r.beds, solved: false };
  }
  patch2({ irrigationSolved: r.solved, lastCycle: r.beds });
  if (variantFor(s.seed, 'hydroponics') === 1) {
    // The need tags on this ship are corroded; the probe reads closed lines only.
    const deficits = sweepDeficitsFor(s.seed, s.chapter2.irrigation);
    const closed = deficits.flatMap((d, i) => (d === null ? [] : [`bed ${i + 1} reads −${d}`]));
    const message = r.solved
      ? IRRIGATION_SOLVED
      : closed.length === 3
        ? `Moisture sweep: ${closed.join(', ')}. The tags are gone — you are the tags now. Read the crew member the numbers, have them set the valves by hand, then run this cycle again.`
        : `${IRRIGATION_WRONG}${closed.length ? ` Probe on the closed lines: ${closed.join(', ')}.` : ''}`;
    return { ok: true, message, beds: r.beds, solved: r.solved, deficits };
  }
  return { ok: true, message: r.solved ? IRRIGATION_SOLVED : IRRIGATION_WRONG, beds: r.beds, solved: r.solved };
}
```

and extend the derived import at the top of `store.ts` to include `sweepDeficitsFor`, and the secrets import to include `slotLabel` (used in Step 7).

- [ ] **Step 6: `liftCrate` gains the stacked branch**

Replace the whole `liftCrate` function with:

```ts
export function liftCrate(): ActionResult {
  const s = gameStore.getState();
  if (s.room !== 'cargo_bay') return { ok: false, message: 'The crane controls are in the cargo bay.' };
  const slot = secretsFor(s.seed).quarantineSlot;
  if (variantFor(s.seed, 'cargo_bay') === 1) {
    // A re-racked bay: the quarantine container is under a pallet, and the hook takes one crate at a time.
    if (s.chapter2.crateLifted) return { ok: true, message: 'The quarantine container is already up.' };
    if (s.chapter2v.held) return { ok: false, message: 'The crane holds one crate. Lower it onto a single-tier slot first.' };
    const at = s.chapter2.craneAt.row * 3 + s.chapter2.craneAt.col;
    if (s.chapter2v.tiers[at] === 2) {
      const tiers = [...s.chapter2v.tiers];
      tiers[at] = 1;
      patch2v({ tiers, held: true });
      return { ok: true, message: 'Ration pallet on the hook. Park it on any single-tier slot before lifting anything else.' };
    }
  }
  if (s.chapter2.craneAt.row !== slot.row || s.chapter2.craneAt.col !== slot.col) {
    return { ok: false, message: 'The crane lifts an ordinary crate. Ration bars. Someone\'s spare boots. Not this one.' };
  }
  patch2({ crateLifted: true });
  return { ok: true, message: 'The quarantine container comes up. Inside: a slab of hull plate with a stencilled registry, half burned away.' };
}
```

(`patch2v` is defined in Step 7; function declarations hoist, so the order in the file does not matter.)

- [ ] **Step 7: The chapter-2 variants block**

Append at the end of `src/game/store.ts`:

```ts
// ---------------------------------------------------------- chapter-2 variants

function patch2v(p: Partial<Chapter2VariantState>): void {
  gameStore.setState((s) => ({ chapter2v: { ...s.chapter2v, ...p } }));
}

export function liftDrawing(index: 0 | 1 | 2 | 3 | 4 | 5): ActionResult {
  const s = gameStore.getState();
  if (variantFor(s.seed, 'crew_quarters') !== 1) return { ok: false, message: 'This safe has wheels, not a key. The drawings are just drawings.' };
  if (s.room !== 'crew_quarters') return { ok: false, message: 'The drawings are on the wall of Okafor\'s cabin.' };
  if (s.chapter2v.keyFound) return { ok: true, message: 'The key is already in your hand.' };
  if (index !== variantSecretsFor(s.seed).keyDrawing) {
    return { ok: false, message: `Nothing behind the ${DRAWINGS[index]}. The tape on the back is old and empty.` };
  }
  patch2v({ keyFound: true });
  return { ok: true, message: `A brass key, taped to the back of the ${DRAWINGS[index]}.` };
}

export function turnSafeKey(): ActionResult {
  const s = gameStore.getState();
  if (variantFor(s.seed, 'crew_quarters') !== 1) return { ok: false, message: 'This safe has wheels, not a key.' };
  if (s.room !== 'crew_quarters') return { ok: false, message: 'The safe is in Vasquez\'s cabin.' };
  if (s.chapter2.safeOpened) return { ok: true, message: 'The safe is already open.' };
  if (!s.chapter2v.keyFound) return { ok: false, message: 'No key. The lock wants one; the wall has six drawings.' };
  patch2({ safeOpened: true });
  return { ok: true, message: 'The bolt slides. Inside: a private log drive, encrypted.' };
}

export function lowerCrate(): ActionResult {
  const s = gameStore.getState();
  if (variantFor(s.seed, 'cargo_bay') !== 1) return { ok: false, message: 'This crane has no LOWER control; nothing in this bay is stacked.' };
  if (s.room !== 'cargo_bay') return { ok: false, message: 'The crane controls are in the cargo bay.' };
  if (!s.chapter2v.held) return { ok: false, message: 'Nothing on the hook.' };
  const at = s.chapter2.craneAt.row * 3 + s.chapter2.craneAt.col;
  if (s.chapter2v.tiers[at] !== 1) return { ok: false, message: 'That slot is already two high. Park it on a single-tier slot.' };
  const tiers = [...s.chapter2v.tiers];
  tiers[at] = 2;
  patch2v({ tiers, held: false });
  return { ok: true, message: `Crate parked at ${slotLabel(s.chapter2.craneAt)}. The hook is free.` };
}
```

and extend the variants import at the top of `store.ts` to `import { DRAWINGS, tiersFor, variantFor, variantSecretsFor } from './variants';`.

- [ ] **Step 8: Run the whole gate**

Run: `npx vitest run && npm run build`
Expected: both exit 0; 258 → 265 tests. Every pre-existing chapter-2 test (`store.ch2.test.ts`) is untouched and green — the classic path is byte-identical.

- [ ] **Step 9: Commit**

```bash
git add src/game/store.ts src/game/derived.ts src/game/store.variants.test.ts
git commit -m "feat: keyed safe, moisture sweep, stacked crane — chapter-2 variant actions

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: A manifest and a pump report that follow the ship — contract pinned

**Files:**
- Modify: `src/game/narrative.ts` (`crewManifestEn/Pt`, `cargoManifestEn/Pt`, `getCrewManifest`, `getCargoManifest`), `src/mcp/tools.ts` (`query_manifest` handler only)
- Test: `src/mcp/tools.test.ts` (append), `src/game/i18n.test.ts` (append); the snapshot file `src/mcp/__snapshots__/tools.test.ts.snap` (created by the first run, committed)

**Interfaces:**
- Consumes: `variantFor`, `variantSecretsFor(seed).keyDrawing`, `DRAWINGS`, `Drawing` (Task 1); `runIrrigation().deficits` (Task 2); `getLocale`, `secretsFor`, `slotLabel` (existing).
- Produces: `getCrewManifest(seed)` names the key's drawing on a keyed ship; `getCargoManifest(seed)` describes the lower tier on a stacked ship; `query_manifest` adds `tier: 'lower'` on a stacked ship only. No tool name, description or schema changes.

- [ ] **Step 1: Failing tests**

Append to `src/mcp/tools.test.ts`, at the end of the file:

```ts
describe('remixed ships, chapter 2 — the surface follows the ship, the contract does not move', () => {
  function findSeed(pred: (seed: number) => boolean): number {
    for (let seed = 1; seed < 5000; seed++) if (pred(seed)) return seed;
    throw new Error('no seed found');
  }
  const S_KS = findSeed((s) => variantFor(s, 'crew_quarters') === 1);
  const S_HP = findSeed((s) => variantFor(s, 'hydroponics') === 1);
  const S_SD = findSeed((s) => variantFor(s, 'cargo_bay') === 1);

  it('the crew manifest points at the drawing on a keyed ship, at the combination otherwise', async () => {
    resetGame(S_KS);
    gameStore.setState({ auxPower: true });
    const keyed = JSON.stringify(await call('access_crew_manifest'));
    expect(keyed).toMatch(/quartermaster/);
    expect(keyed.toLowerCase()).toContain(DRAWINGS[variantSecretsFor(S_KS).keyDrawing]);
    expect(keyed).not.toMatch(/last three/);
    resetGame(0);
    gameStore.setState({ auxPower: true });
    expect(JSON.stringify(await call('access_crew_manifest'))).toMatch(/last three/);
  });

  it('run_irrigation carries the sweep on a probe ship and nothing extra on the classic one', async () => {
    resetGame(S_HP);
    gameStore.setState({ chapter: 2 });
    const sweep = await call('run_irrigation');
    expect(sweep.deficits).toEqual([...secretsFor(S_HP).waterNeeds]);
    expect(sweep.beds).toEqual(['dry', 'dry', 'dry']);
    resetGame(0);
    gameStore.setState({ chapter: 2 });
    const classic = await call('run_irrigation');
    expect(classic).not.toHaveProperty('deficits');
    expect(classic.beds).toHaveLength(3);
  });

  it('query_manifest names the lower tier on a stacked ship only', async () => {
    resetGame(S_SD);
    gameStore.setState({ chapter: 2 });
    const stacked = await call('query_manifest');
    expect(stacked.tier).toBe('lower');
    expect(stacked.manifest).toContain('LOWER tier');
    expect(stacked.quarantine_slot).toBe(slotLabel(secretsFor(S_SD).quarantineSlot));
    resetGame(0);
    gameStore.setState({ chapter: 2 });
    const classic = await call('query_manifest');
    expect(classic).not.toHaveProperty('tier');
    expect(classic.quarantine_slot).toBe('C2');
  });

  it('the tool contract is pinned: names, descriptions and input schemas', () => {
    const contract = buildTools().map((t) => ({ name: t.name, description: t.definition.description, inputSchema: t.definition.inputSchema }));
    expect(contract).toHaveLength(31);
    expect(contract).toMatchSnapshot();
  });
});
```

and extend the test file's imports: add `DRAWINGS` to the `../game/variants` import, and add

```ts
import { secretsFor, slotLabel } from '../game/secrets';
```

Append to `src/game/i18n.test.ts`, inside `describe('localized narrative', …)` after the `variant sheets keep their machine codes in pt-BR` test:

```ts
  it('chapter-2 variant content keeps its machine values in pt-BR', () => {
    const S_KS = (() => { for (let s = 1; s < 5000; s++) if (variantFor(s, 'crew_quarters') === 1) return s; throw new Error('none'); })();
    const S_SD = (() => { for (let s = 1; s < 5000; s++) if (variantFor(s, 'cargo_bay') === 1) return s; throw new Error('none'); })();
    const slot = slotLabel(secretsFor(S_SD).quarantineSlot);
    setLocale('pt-BR');
    expect(getCrewManifest(S_KS)).toContain('intendência');
    expect(getCrewManifest(S_KS)).not.toContain('três últimos');
    expect(getCrewManifest(S_KS)).toContain(secretsFor(S_KS).commissionNumber);
    expect(getCargoManifest(S_SD)).toContain('INFERIOR');
    expect(getCargoManifest(S_SD)).toContain(slot);
    setLocale('en');
    expect(getCargoManifest(S_SD)).toContain('LOWER tier');
    expect(getCargoManifest(S_SD)).toContain(slot);
    expect(getCrewManifest(0)).toContain('last three');
  });
```

and change its secrets import to `import { secretsFor, slotLabel } from './secrets';`.

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/mcp/tools.test.ts src/game/i18n.test.ts`
Expected: FAIL — the keyed manifest still says "last three"; `tier` is undefined; the pt-BR manifest has no "intendência". (The snapshot test passes on first run by writing the snapshot — that is expected.)

- [ ] **Step 3: The narrative getters**

In `src/game/narrative.ts`:

- Extend the variants import to `import { DRAWINGS, variantFor, variantSecretsFor } from './variants';` and add `import type { Drawing } from './variants';`.
- Replace `crewManifestEn` and `crewManifestPt` with:

```ts
const DRAWING_NAMES_EN: Record<Drawing, string> = {
  rocket: 'the rocket', cake: 'the birthday cake', cat: 'the cat', cormorant: 'the Cormorant', sun: 'the sun', family: 'her family',
};
const DRAWING_NAMES_PT: Record<Drawing, string> = {
  rocket: 'o foguete', cake: 'o bolo de aniversário', cat: 'o gato', cormorant: 'a Cormorant', sun: 'o sol', family: 'a família',
};

function crewManifestEn(commission: string, keyDrawing: Drawing | null): string {
  const safe = keyDrawing === null
    ? 'Cabin safe keyed to its last three, per a regulation nobody follows but her.'
    : `Cabin safe is a mechanical lock; her spare key is logged with the quartermaster — taped behind Amara's drawing of ${DRAWING_NAMES_EN[keyDrawing]}.`;
  return (
    'CREW OF RECORD — ISV CORMORANT\n' +
    `• Cpt. E. Vasquez — command auth suspended (evacuated). Commission ${commission}. ${safe}\n` +
    '• Chief Eng. R. Okafor — door auth: standard family-date PIN, day+month (DDMM). His daughter. He talks about her constantly.\n' +
    '• Med. Off. [YOU] — currently thawing. Auth records lost with the main computer.'
  );
}
function crewManifestPt(commission: string, keyDrawing: Drawing | null): string {
  const safe = keyDrawing === null
    ? 'Cofre da cabine chaveado nos três últimos dígitos, por um regulamento que só ela segue.'
    : `Cofre da cabine é fechadura mecânica; a chave reserva está registrada na intendência — colada atrás do desenho da Amara: ${DRAWING_NAMES_PT[keyDrawing]}.`;
  return (
    'TRIPULAÇÃO DE REGISTRO — ISV CORMORANT\n' +
    `• Cap. E. Vasquez — autorização de comando suspensa (evacuada). Comissão ${commission}. ${safe}\n` +
    '• Eng.-Chefe R. Okafor — senha de porta: PIN padrão de data familiar, dia+mês (DDMM). A filha dele. Ele fala dela o tempo todo.\n' +
    '• Of. Médico [VOCÊ] — em descongelamento. Registros de autorização perdidos com o computador principal.'
  );
}
```

- Replace `cargoManifestEn` and `cargoManifestPt` with:

```ts
function cargoManifestEn(slot: string, stacked: boolean): string {
  const where = stacked
    ? `Slot ${slot}, LOWER tier: QUARANTINE — re-racked after the storm with a ration pallet on top. The crane holds one crate; park the pallet on any single-tier slot first.`
    : `Slot ${slot}: QUARANTINE`;
  return (
    `CARGO MANIFEST — bay stack, slots A1–C3. Ration pallets, spares, one crew effects locker. ` +
    `${where} — logged as "survey drone recovery"; jettison order countermanded by Chief Eng. Do not open without a hull-registry cross-check.`
  );
}
function cargoManifestPt(slot: string, stacked: boolean): string {
  const where = stacked
    ? `Slot ${slot}, andar INFERIOR: QUARENTENA — re-empilhado depois da tempestade, com um palete de ração por cima. O guindaste segura um caixote por vez; estacione o palete em qualquer slot de um andar primeiro.`
    : `Slot ${slot}: QUARENTENA`;
  return (
    `MANIFESTO DE CARGA — pilha do porão, slots A1–C3. Paletes de ração, sobressalentes, um armário de pertences da tripulação. ` +
    `${where} — registrado como "recuperação de drone de pesquisa"; ordem de alijamento cancelada pelo Eng.-Chefe. Não abrir sem cruzamento de registro de casco.`
  );
}
```

(On the classic ship both strings are byte-identical to today's: `Slot C2: QUARANTINE — logged as …` — the existing i18n test `getCargoManifest(0)` contains `'C2'` still holds.)

- Replace the two getters:

```ts
export function getCrewManifest(seed: number): string {
  const c = secretsFor(seed).commissionNumber;
  const key = variantFor(seed, 'crew_quarters') === 1 ? DRAWINGS[variantSecretsFor(seed).keyDrawing] : null;
  return getLocale() === 'pt-BR' ? crewManifestPt(c, key) : crewManifestEn(c, key);
}
```

```ts
export function getCargoManifest(seed: number): string {
  const slot = slotLabel(secretsFor(seed).quarantineSlot);
  const stacked = variantFor(seed, 'cargo_bay') === 1;
  return getLocale() === 'pt-BR' ? cargoManifestPt(slot, stacked) : cargoManifestEn(slot, stacked);
}
```

- [ ] **Step 4: `query_manifest` adds `tier` on a stacked ship**

In `src/mcp/tools.ts`, replace the `query_manifest` handler body with:

```ts
      () => {
        const s = gameStore.getState();
        const stacked = variantFor(s.seed, 'cargo_bay') === 1;
        return {
          ok: true,
          manifest: getCargoManifest(s.seed),
          quarantine_slot: slotLabel(secretsFor(s.seed).quarantineSlot),
          ...(stacked ? { tier: 'lower' } : {}),
        };
      },
```

(`variantFor` is already imported in `tools.ts` for the diagnostics branch.) Nothing else in `tools.ts` changes — not the description, not `inChapter2`, not `readOnly`.

- [ ] **Step 5: Run the whole gate and inspect the snapshot**

Run: `npx vitest run && npm run build`
Expected: both exit 0; 265 → 270 tests. Open `src/mcp/__snapshots__/tools.test.ts.snap`: 31 entries, each with `name`, `description`, `inputSchema`. Nothing in it mentions a key, a sweep or a tier — the descriptions are exactly the shipped ones.

- [ ] **Step 6: Commit**

```bash
git add src/game/narrative.ts src/mcp/tools.ts src/mcp/tools.test.ts src/mcp/__snapshots__/tools.test.ts.snap src/game/i18n.test.ts
git commit -m "feat: manifests and the pump report follow the ship; tool contract pinned by snapshot

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: The keyed safe and the drawing wall — crew quarters swaps its panels

**Files:**
- Create: `src/scenes/KeyedSafe.tsx` (exports `KeyedSafe` and `DrawingWall`)
- Modify: `src/scenes/CrewQuarters.tsx` (the `CrewQuarters` component only), `src/ui/strings.ts` (`quarters` block, both locales + interface)

**Interfaces:**
- Consumes: `liftDrawing`, `turnSafeKey` (Task 2); `variantFor`, `variantSecretsFor(seed).keyDrawing`, `DRAWINGS`, `Drawing` (Task 1); `useGame`, `useStrings`.
- Produces: nothing downstream.

- [ ] **Step 1: Strings**

In `src/ui/strings.ts`, add at the top `import type { Drawing } from '../game/variants';` (next to the existing type imports). Extend the `quarters` entry of the `UIStrings` interface:

```ts
  quarters: {
    title: string; intro: string; safeTitle: string; safeDesc: string; wheelAria: (n: number) => string; tryHandle: string;
    safeOpen: string; safeShut: string; driveNote: string; recorderTitle: string; recorderDesc: string; play: string; playing: string;
    transcriptLabel: string; noSpeech: string; wallTitle: string; wallDesc: string;
    keyedDesc: string; keyedAria: string; keyedAriaKey: string; keyedAriaOpen: string; turnKey: string; noKey: string; keyInHand: string;
    wallKeyedDesc: string; wallAria: string; drawing: (d: Drawing) => string; drawingAria: (d: Drawing) => string;
    nothingBehind: (d: Drawing) => string; keyBehind: (d: Drawing) => string;
  };
```

Append to the `en.quarters` object (after `wallDesc`):

```ts
    keyedDesc: 'A mechanical lock, brass, the kind that wants a key and nothing else. There is no key in the desk. She would have kept a spare somewhere in these two cabins — and the ship\'s records would know where.',
    keyedAria: 'the desk safe: a keyed lock, no key',
    keyedAriaKey: 'the desk safe: a keyed lock with the brass key seated',
    keyedAriaOpen: 'the desk safe, open',
    turnKey: 'Turn the key',
    noKey: 'No key. Ask your AI where she logged the spare.',
    keyInHand: 'A brass key, warm from the tape. It fits.',
    wallKeyedDesc: 'Six drawings, taped at a child\'s height. Something is taped behind one of them; the ship\'s records say which. Lift a drawing to look.',
    wallAria: 'six of Amara\'s drawings taped to the cabin wall',
    drawing: (d) => ({ rocket: 'the rocket', cake: 'the birthday cake', cat: 'the cat', cormorant: 'the Cormorant', sun: 'the sun', family: 'her family' })[d],
    drawingAria: (d) => `lift the drawing of ${({ rocket: 'the rocket', cake: 'the birthday cake', cat: 'the cat', cormorant: 'the Cormorant', sun: 'the sun', family: 'her family' })[d]}`,
    nothingBehind: (d) => `Nothing behind ${({ rocket: 'the rocket', cake: 'the birthday cake', cat: 'the cat', cormorant: 'the Cormorant', sun: 'the sun', family: 'her family' })[d]}. Old tape, empty.`,
    keyBehind: (d) => `Behind ${({ rocket: 'the rocket', cake: 'the birthday cake', cat: 'the cat', cormorant: 'the Cormorant', sun: 'the sun', family: 'her family' })[d]}: a brass key, taped flat. Take it to the safe.`,
```

Append to the `ptBR.quarters` object (after `wallDesc`):

```ts
    keyedDesc: 'Uma fechadura mecânica, latão, do tipo que quer uma chave e nada mais. Não há chave na mesa. Ela guardaria uma reserva em algum lugar destas duas cabines — e os registros da nave saberiam onde.',
    keyedAria: 'o cofre da mesa: fechadura de chave, sem chave',
    keyedAriaKey: 'o cofre da mesa: fechadura de chave com a chave de latão encaixada',
    keyedAriaOpen: 'o cofre da mesa, aberto',
    turnKey: 'Girar a chave',
    noKey: 'Sem chave. Pergunte à sua IA onde ela registrou a reserva.',
    keyInHand: 'Uma chave de latão, morna da fita. Encaixa.',
    wallKeyedDesc: 'Seis desenhos, colados na altura de uma criança. Há algo colado atrás de um deles; os registros da nave dizem qual. Levante um desenho para olhar.',
    wallAria: 'seis desenhos da Amara colados na parede da cabine',
    drawing: (d) => ({ rocket: 'o foguete', cake: 'o bolo de aniversário', cat: 'o gato', cormorant: 'a Cormorant', sun: 'o sol', family: 'a família' })[d],
    drawingAria: (d) => `levantar o desenho: ${({ rocket: 'o foguete', cake: 'o bolo de aniversário', cat: 'o gato', cormorant: 'a Cormorant', sun: 'o sol', family: 'a família' })[d]}`,
    nothingBehind: (d) => `Nada atrás de ${({ rocket: 'o foguete', cake: 'o bolo de aniversário', cat: 'o gato', cormorant: 'a Cormorant', sun: 'o sol', family: 'a família' })[d]}. Fita velha, vazia.`,
    keyBehind: (d) => `Atrás de ${({ rocket: 'o foguete', cake: 'o bolo de aniversário', cat: 'o gato', cormorant: 'a Cormorant', sun: 'o sol', family: 'a família' })[d]}: uma chave de latão, colada rente. Leve ao cofre.`,
```

(The subject names repeat in four closures on purpose: `UIStrings` entries are plain functions, and the repo keeps each locale's object self-contained rather than hoisting shared tables.)

- [ ] **Step 2: Create `src/scenes/KeyedSafe.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import { useGame } from '../ui/useGame';
import { useStrings } from '../ui/useLocale';
import { liftDrawing, turnSafeKey } from '../game/store';
import { DRAWINGS, variantSecretsFor } from '../game/variants';
import type { Drawing } from '../game/variants';

// Scene-material colours for a child's crayons on parchment (like hydroponics' soil).
const CRAYON = { line: '#5a3d22', red: '#b3402e', blue: '#3a6a8a', yellow: '#d9a441', green: '#4f8a5c' };

export function KeyedSafe() {
  const opened = useGame((s) => s.chapter2.safeOpened);
  const keyFound = useGame((s) => s.chapter2v.keyFound);
  const t = useStrings();
  const aria = opened ? t.quarters.keyedAriaOpen : keyFound ? t.quarters.keyedAriaKey : t.quarters.keyedAria;
  return (
    <div className="panel">
      <h2>{t.quarters.safeTitle}</h2>
      <p className="status-dim">{t.quarters.keyedDesc}</p>
      <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <svg viewBox="0 0 200 170" width="200" role="img" aria-label={aria}>
          <defs>
            <linearGradient id="ks-bezel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brass-hi)" />
              <stop offset="50%" stopColor="var(--brass-lo)" />
              <stop offset="100%" stopColor="var(--brass-mid)" />
            </linearGradient>
            <linearGradient id="ks-key" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--brass-hi)" />
              <stop offset="100%" stopColor="var(--brass-mid)" />
            </linearGradient>
            <radialGradient id="ks-hole" cx="0.5" cy="0.4" r="0.7">
              <stop offset="0%" stopColor="var(--face-deep)" />
              <stop offset="100%" stopColor="var(--hull)" />
            </radialGradient>
          </defs>
          {/* bezel and inset door */}
          <rect x="2" y="2" width="196" height="166" rx="10" fill="url(#ks-bezel)" stroke="var(--brass-lo)" strokeWidth="3" />
          <rect x="12" y="12" width="176" height="118" rx="6" fill="var(--panel-solid)" stroke="var(--line)" strokeWidth="2" />
          {/* hinge line, four screws */}
          <line x1="20" y1="18" x2="20" y2="124" stroke="var(--steel-lo)" strokeWidth="2" />
          {[[30, 22], [178, 22], [30, 120], [178, 120]].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="2.5" fill="var(--steel-hi)" stroke="var(--steel-lo)" strokeWidth="0.75" />
          ))}
          {/* keyed lock: escutcheon, keyhole, and the key once found */}
          <circle cx="112" cy="70" r="24" fill="var(--steel)" stroke="var(--steel-lo)" strokeWidth="2" />
          <circle cx="112" cy="70" r="18" fill="url(#ks-hole)" stroke="var(--brass-lo)" strokeWidth="1.5" />
          <g style={{ transition: 'transform 0.5s', transform: opened ? 'rotate(90deg)' : 'rotate(0deg)', transformOrigin: '112px 70px' }}>
            <circle cx="112" cy="66" r="4" fill="var(--hull)" />
            <rect x="110" y="66" width="4" height="12" fill="var(--hull)" />
            {keyFound && (
              <g>
                <rect x="109" y="64" width="6" height="30" rx="1" fill="url(#ks-key)" stroke="var(--brass-lo)" strokeWidth="0.75" />
                <circle cx="112" cy="98" r="7" fill="url(#ks-key)" stroke="var(--brass-lo)" strokeWidth="1" />
                <circle cx="112" cy="98" r="2.5" fill="var(--panel-solid)" />
                <rect x="115" y="70" width="4" height="3" fill="var(--brass-hi)" />
                <rect x="115" y="76" width="3" height="3" fill="var(--brass-hi)" />
              </g>
            )}
          </g>
          {/* bolt lamp */}
          <circle cx="160" cy="70" r="4" fill={opened ? 'var(--green)' : 'var(--face)'} stroke="var(--steel)" strokeWidth="1" />
          {/* engraved plates */}
          <rect x="34" y="138" width="132" height="22" rx="3" fill="var(--hull)" stroke="var(--amber)" strokeWidth="1" />
          <text x="100" y="153" textAnchor="middle" fontSize="10" letterSpacing="2" fill="var(--amber)">VASQUEZ · PERSONAL</text>
          <text x="112" y="46" textAnchor="middle" fontSize="7" letterSpacing="2" fill="var(--parchment)" opacity="0.7">KEYED</text>
        </svg>
        {!opened && (
          <button onClick={() => turnSafeKey()} disabled={!keyFound} style={{ borderColor: 'var(--amber)' }}>{t.quarters.turnKey}</button>
        )}
      </div>
      {opened && <p className="status-ok" style={{ marginTop: 10 }}>{t.quarters.safeOpen}</p>}
      {opened && <p className="status-dim">{t.quarters.driveNote}</p>}
      {!opened && <p className="status-dim" style={{ marginTop: 10 }}>{keyFound ? t.quarters.keyInHand : t.quarters.noKey}</p>}
    </div>
  );
}

// One crayon drawing per subject, drawn in a 90×70 box. Deterministic strokes.
function Sketch({ subject }: { subject: Drawing }) {
  switch (subject) {
    case 'rocket':
      return (
        <g fill="none" stroke={CRAYON.line} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M45 8 L58 30 L58 54 L32 54 L32 30 Z" fill="#e9dcc0" />
          <path d="M32 44 L22 58 L32 54 M58 44 L68 58 L58 54" fill={CRAYON.red} />
          <circle cx="45" cy="34" r="5" fill={CRAYON.blue} />
          <path d="M38 56 Q45 68 52 56" fill={CRAYON.yellow} stroke={CRAYON.red} />
        </g>
      );
    case 'cake':
      return (
        <g fill="none" stroke={CRAYON.line} strokeWidth="2" strokeLinecap="round">
          <rect x="18" y="36" width="54" height="24" rx="3" fill="#e2b6a0" />
          <path d="M18 44 Q27 40 36 44 T54 44 T72 44" stroke={CRAYON.red} />
          {[30, 45, 60].map((x) => (
            <g key={x}>
              <line x1={x} y1="36" x2={x} y2="24" stroke={CRAYON.blue} />
              <ellipse cx={x} cy="20" rx="2.5" ry="4" fill={CRAYON.yellow} stroke={CRAYON.yellow} />
            </g>
          ))}
        </g>
      );
    case 'cat':
      return (
        <g fill="none" stroke={CRAYON.line} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="50" cy="48" rx="20" ry="12" fill="#d9c9a8" />
          <circle cx="30" cy="34" r="11" fill="#d9c9a8" />
          <path d="M22 26 L20 14 L30 24 M38 26 L40 14 L30 24" fill="#d9c9a8" />
          <path d="M70 46 Q84 40 78 28" />
          <circle cx="26" cy="33" r="1.5" fill={CRAYON.line} />
          <circle cx="34" cy="33" r="1.5" fill={CRAYON.line} />
          <path d="M16 38 L24 37 M16 42 L24 40 M36 37 L44 38 M36 40 L44 42" strokeWidth="1.2" />
        </g>
      );
    case 'cormorant':
      return (
        <g fill="none" stroke={CRAYON.line} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 42 L20 30 L74 30 L82 42 L74 54 L20 54 Z" fill="#c9d3d6" />
          <rect x="36" y="20" width="22" height="10" fill="#c9d3d6" />
          {[24, 32, 40, 48, 56, 64, 72].map((x) => <rect key={x} x={x} y="38" width="5" height="5" fill={CRAYON.blue} stroke="none" />)}
          {[28, 40, 52, 64].map((x) => <rect key={`t${x}`} x={x} y="46" width="5" height="4" fill={CRAYON.blue} stroke="none" />)}
        </g>
      );
    case 'sun':
      return (
        <g fill="none" stroke={CRAYON.yellow} strokeWidth="2.5" strokeLinecap="round">
          <circle cx="45" cy="36" r="13" fill={CRAYON.yellow} stroke={CRAYON.line} strokeWidth="2" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <line key={a} x1="45" y1="18" x2="45" y2="10" transform={`rotate(${a} 45 36)`} />
          ))}
          <path d="M39 38 Q45 44 51 38" stroke={CRAYON.line} strokeWidth="1.5" />
        </g>
      );
    case 'family':
      return (
        <g fill="none" stroke={CRAYON.line} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {[[22, 14, 1], [45, 18, 0.9], [66, 30, 0.6]].map(([x, top, s], i) => (
            <g key={i}>
              <circle cx={x} cy={top + 6} r={6 * s} fill={i === 2 ? '#e2b6a0' : '#d9c9a8'} />
              <line x1={x} y1={top + 12} x2={x} y2={top + 12 + 24 * s} />
              <path d={`M${x - 10 * s} ${top + 22} L${x} ${top + 16} L${x + 10 * s} ${top + 22}`} />
              <path d={`M${x - 8 * s} ${top + 12 + 38 * s} L${x} ${top + 12 + 24 * s} L${x + 8 * s} ${top + 12 + 38 * s}`} />
            </g>
          ))}
          <line x1="52" y1="34" x2="60" y2="42" stroke={CRAYON.red} />
        </g>
      );
    default:
      return null;
  }
}

export function DrawingWall() {
  const seed = useGame((s) => s.seed);
  const keyFound = useGame((s) => s.chapter2v.keyFound);
  const t = useStrings();
  const [tilted, setTilted] = useState<number | null>(null);
  const [last, setLast] = useState<Drawing | null>(null);
  const timer = useRef<number | null>(null);
  // The secret is read only once the puzzle has revealed it — never before.
  const keyAt = keyFound ? variantSecretsFor(seed).keyDrawing : null;

  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);

  const lift = (i: number) => {
    const r = liftDrawing(i as 0 | 1 | 2 | 3 | 4 | 5);
    setLast(DRAWINGS[i]);
    if (r.ok) return;
    setTilted(i);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setTilted(null), 600);
  };

  return (
    <div className="panel">
      <h2>{t.quarters.wallTitle}</h2>
      <p className="status-dim">{t.quarters.wallKeyedDesc}</p>
      <div role="group" aria-label={t.quarters.wallAria}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 100px)', gap: 14, padding: 12, background: 'var(--steel-lo)', borderRadius: 6, border: '1px solid var(--line)', width: 'fit-content' }}>
        {DRAWINGS.map((subject, i) => {
          const isKey = keyAt === i;
          const rot = isKey ? -9 : tilted === i ? -6 : 0;
          return (
            <div key={subject} style={{ position: 'relative', height: 96 }}>
              {/* the key, revealed under the lifted drawing */}
              {isKey && (
                <svg viewBox="0 0 40 20" width="40" style={{ position: 'absolute', left: 30, bottom: 2 }} aria-hidden="true">
                  <rect x="12" y="8" width="26" height="4" rx="1" fill="var(--brass-hi)" stroke="var(--brass-lo)" strokeWidth="0.75" />
                  <circle cx="8" cy="10" r="6" fill="var(--brass)" stroke="var(--brass-lo)" strokeWidth="1" />
                  <circle cx="8" cy="10" r="2" fill="var(--steel-lo)" />
                  <rect x="30" y="12" width="3" height="3" fill="var(--brass-hi)" />
                  <rect x="35" y="12" width="2" height="4" fill="var(--brass-hi)" />
                </svg>
              )}
              <button onClick={() => lift(i)} disabled={keyFound} aria-label={t.quarters.drawingAria(subject)}
                style={{
                  position: 'absolute', inset: 0, padding: 0, background: 'var(--parchment)', border: '1px solid var(--brass-lo)', borderRadius: 2,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.5)', transformOrigin: 'top center', transition: 'transform 0.25s',
                  transform: `rotate(${rot}deg) translateY(${isKey ? -18 : 0}px)`, cursor: keyFound ? 'default' : 'pointer',
                }}>
                <svg viewBox="0 0 90 70" width="100%" height="100%" aria-hidden="true">
                  {/* tape at the top edge */}
                  <rect x="34" y="0" width="22" height="7" fill="var(--brass-hi)" opacity="0.6" />
                  <Sketch subject={subject} />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
      {last !== null && !keyFound && <p className="status-dim" style={{ marginTop: 10 }}>{t.quarters.nothingBehind(last)}</p>}
      {keyFound && keyAt !== null && <p className="status-ok" style={{ marginTop: 10 }}>{t.quarters.keyBehind(DRAWINGS[keyAt])}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Swap the panels in `src/scenes/CrewQuarters.tsx`**

Add the imports:

```ts
import { variantFor } from '../game/variants';
import { DrawingWall, KeyedSafe } from './KeyedSafe';
```

Replace the exported `CrewQuarters` component with:

```tsx
export function CrewQuarters() {
  const seed = useGame((s) => s.seed);
  const keyed = variantFor(seed, 'crew_quarters') === 1;
  const t = useStrings();
  return (
    <div className="scene">
      <div className="panel">
        <h2>{t.quarters.title}</h2>
        <p>{t.quarters.intro}</p>
      </div>
      {keyed ? <KeyedSafe /> : <Safe />}
      <Recorder />
      {keyed ? (
        <DrawingWall />
      ) : (
        <div className="panel">
          <h2>{t.quarters.wallTitle}</h2>
          <p className="status-dim">{t.quarters.wallDesc}</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run the whole gate**

Run: `npx vitest run && npm run build`
Expected: both exit 0 (270 tests; `tsc` accepts the new `quarters` keys in both locales — a missing key in either locale is a type error).

- [ ] **Step 5: Look at it**

Run `npm run dev` and play into chapter 2 (the crew quarters need the investigation started on the bridge). "Abandon previous run" rerolls the ship; a keyed ship rolls roughly one in two. On a keyed ship the safe shows a keyhole and a KEYED plate with TURN KEY disabled; the wall shows six parchment drawings; lifting a wrong one tilts and settles back; the right one stays tilted with a brass key beneath; TURN KEY enables; the bolt lamp goes green. On a ship whose quarters are classic, the three wheels and the plain wall text are unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/KeyedSafe.tsx src/scenes/CrewQuarters.tsx src/ui/strings.ts
git commit -m "feat: the keyed safe and the drawing wall — crew quarters swap their panels

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Corroded tags and the moisture probe — hydroponics hides its numbers

**Files:**
- Modify: `src/scenes/Hydroponics.tsx` (`Beds` only), `src/ui/strings.ts` (`hydro` block, both locales + interface)

**Interfaces:**
- Consumes: `variantFor` (Task 1); `chapter2.lastCycle`, `chapter2.irrigation` (existing); `useGame`, `useStrings`.
- Produces: nothing downstream.

- [ ] **Step 1: Strings**

Extend the `hydro` entry of the `UIStrings` interface:

```ts
  hydro: {
    title: string; intro: string; bedsTitle: string; bedsDesc: string; bed: (n: number) => string; needTag: (n: number) => string;
    valveAria: (n: number) => string; lampsHint: string; budget: string; over: string; cycleHint: string; spikeTitle: string; spikeHidden: string;
    spikeRevealed: string; pullSpike: string; spikePulled: string;
    bedsDescProbe: string; bedsAriaProbe: string; probeLamp: string; probeHint: string; probeRead: string;
  };
```

Append to `en.hydro` (after `spikePulled`):

```ts
    bedsDescProbe: 'Three beds, three valves, one pump with a 10-unit budget per cycle. The brass need tags have corroded to nothing. The pump\'s moisture probe reads a bed only while its line is closed — so: close every valve, have your AI run a cycle, and it will read you what each bed is missing. Then you set the valves and it runs again.',
    bedsAriaProbe: 'irrigation manifold — three beds with corroded, illegible need tags, and a moisture-probe lamp',
    probeLamp: 'MOISTURE PROBE',
    probeHint: 'The probe lamp lights when a cycle ran with at least one valve closed. The numbers it read are on your AI\'s side; the beds do not show them.',
    probeRead: 'Probe read on the closed lines. Ask your AI for the numbers.',
```

Append to `ptBR.hydro` (after `spikePulled`):

```ts
    bedsDescProbe: 'Três canteiros, três válvulas, uma bomba com orçamento de 10 unidades por ciclo. As placas de latão corroeram até sumir. A sonda de umidade da bomba só lê um canteiro com a linha fechada — então: feche todas as válvulas, peça à sua IA para rodar um ciclo, e ela lê para você o que falta em cada canteiro. Depois você ajusta as válvulas e ela roda de novo.',
    bedsAriaProbe: 'coletor de irrigação — três canteiros com placas corroídas e ilegíveis, e uma lâmpada de sonda de umidade',
    probeLamp: 'SONDA DE UMIDADE',
    probeHint: 'A lâmpada da sonda acende quando um ciclo rodou com pelo menos uma válvula fechada. Os números que ela leu ficam do lado da sua IA; os canteiros não os mostram.',
    probeRead: 'Sonda leu as linhas fechadas. Pergunte os números à sua IA.',
```

- [ ] **Step 2: `Beds` branches on the ship**

In `src/scenes/Hydroponics.tsx` add `import { variantFor } from '../game/variants';` and replace the `Beds` function with:

```tsx
// Corroded brass plate: pitted, scratched, no legible figure. Wear keyed on bed index only.
function CorrodedTag({ x, index }: { x: number; index: number }) {
  const pits = [[6, 5], [14, 8], [25, 4], [30, 9], [10, 10]].slice(0, 3 + (index % 3));
  return (
    <g>
      <rect x={x + 30} y="132" width="36" height="12" rx="2" fill="#4a3b22" stroke="var(--brass-lo)" strokeWidth="0.75" />
      <path d={`M ${x + 33 + index * 2} 143 L ${x + 44 + index} 134 M ${x + 50} 143 L ${x + 58 - index * 2} 135`} stroke="var(--brass-lo)" strokeWidth="0.75" opacity="0.7" />
      {pits.map(([px, py]) => (
        <circle key={px} cx={x + 30 + px} cy={132 + py} r="1.1" fill="var(--face-deep)" opacity="0.85" />
      ))}
      <rect x={x + 34} y="136" width={8 + (index % 2) * 4} height="3" fill="#6a5630" opacity="0.5" />
    </g>
  );
}

function Beds() {
  const seed = useGame((s) => s.seed);
  const irrigation = useGame((s) => s.chapter2.irrigation);
  const solved = useGame((s) => s.chapter2.irrigationSolved);
  const lastCycle = useGame((s) => s.chapter2.lastCycle);
  const t = useStrings();
  const probeShip = variantFor(seed, 'hydroponics') === 1;
  // The classic ship prints the needs on brass; a probe ship never reads them here.
  const needs = probeShip ? null : secretsFor(seed).waterNeeds;
  const report = irrigationReportFor(seed, irrigation); // budget meter only — the lamps never read this
  const total = report.total;
  const probeLit = probeShip && lastCycle !== null && irrigation.some((v) => v === 0);
  const bedsAria = needs
    ? `${t.hydro.bedsTitle} — ${needs.map((n, i) => `${t.hydro.bed(i + 1)}: ${t.hydro.needTag(n)}`).join('; ')}`
    : t.hydro.bedsAriaProbe;
  return (
    <div className="panel">
      <h2>{t.hydro.bedsTitle}</h2>
      <p className="status-dim">{probeShip ? t.hydro.bedsDescProbe : t.hydro.bedsDesc}</p>
      <svg viewBox="0 0 360 150" width="100%" style={{ maxWidth: 540, display: 'block' }} role="img" aria-label={bedsAria}>
        <defs>
          <linearGradient id="hy-soil" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a2a1a" />
            <stop offset="100%" stopColor="#1a1410" />
          </linearGradient>
          <linearGradient id="hy-water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a7a8a" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#1a3a4a" stopOpacity="0.75" />
          </linearGradient>
        </defs>
        {/* steel trough */}
        <rect x="6" y="40" width="348" height="96" rx="6" fill="var(--panel-solid)" stroke="var(--steel)" strokeWidth="2" />
        {[0, 1, 2].map((i) => {
          const x = 24 + i * 112;
          const level = irrigation[i] / 9; // 0..1
          const vineSize = i === SPIKE_BED ? (solved ? 0.35 : 1) : 0.6;
          return (
            <g key={i}>
              <rect x={x} y="56" width="96" height="70" rx="4" fill="url(#hy-soil)" stroke="var(--line)" />
              <rect x={x + 2} y={124 - 66 * level} width="92" height={66 * level} fill="url(#hy-water)" style={{ transition: 'all 0.4s' }} />
              <Vine x={x + 48} y={120} size={vineSize} />
              {needs ? (
                <>
                  {/* brass need tag */}
                  <rect x={x + 30} y="132" width="36" height="12" rx="2" fill="#6a5630" stroke="var(--brass)" strokeWidth="0.75" />
                  <text x={x + 48} y="141" textAnchor="middle" fontSize="7.5" fill="#f0dfb0" letterSpacing="1">{t.hydro.needTag(needs[i])}</text>
                </>
              ) : (
                <CorrodedTag x={x} index={i} />
              )}
              <text x={x + 48} y="50" textAnchor="middle" fontSize="7" fill="var(--dim)" letterSpacing="1">{t.hydro.bed(i + 1)}</text>
              {/* bed state lamp: lit only by the last cycle the AI ran */}
              <circle cx={x + 88} cy="62" r="3"
                fill={lastCycle === null ? 'var(--face)' : lastCycle[i] === 'ok' ? 'var(--green)' : lastCycle[i] === 'dry' ? '#7a5a28' : '#3a6a8a'}
                stroke="var(--steel)" strokeWidth="0.75" opacity={0.9} />
            </g>
          );
        })}
        {probeShip && (
          <g>
            {/* moisture probe: bezel, lamp and engraved label on the trough's rim */}
            <rect x="238" y="20" width="112" height="18" rx="3" fill="var(--face)" stroke="var(--steel)" strokeWidth="1.5" />
            <circle cx="250" cy="29" r="4" fill={probeLit ? 'var(--amber)' : 'var(--face-deep)'} stroke="var(--steel-hi)" strokeWidth="0.75" />
            <text x="300" y="32" textAnchor="middle" fontSize="7" letterSpacing="1.5" fill="var(--parchment)" opacity="0.8">{t.hydro.probeLamp}</text>
          </g>
        )}
      </svg>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 8 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <input type="range" min={0} max={9} value={irrigation[i]} style={{ width: 116 }}
              onChange={(e) => setIrrigation(i as 0 | 1 | 2, Number(e.target.value))} aria-label={t.hydro.valveAria(i + 1)} />
            <div>{t.hydro.bed(i + 1)}: <strong style={{ color: 'var(--amber)' }}>{irrigation[i]}u</strong></div>
          </div>
        ))}
      </div>
      {lastCycle === null && <p className="status-dim" style={{ fontSize: 12 }}>{probeShip ? t.hydro.probeHint : t.hydro.lampsHint}</p>}
      {probeLit && <p className="status-dim" style={{ fontSize: 12 }}>{t.hydro.probeRead}</p>}
      {/* budget tank meter */}
      <div style={{ marginTop: 12, maxWidth: 360 }}>
        <div className="status-dim" style={{ fontSize: 12 }}>{t.hydro.budget}: {total}/{WATER_BUDGET}u</div>
        <div style={{ position: 'relative', height: 12, background: 'var(--face)', border: '1px solid var(--line)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 1, width: `${Math.min(100, (total / WATER_BUDGET) * 100)}%`, background: report.overBudget ? 'var(--red)' : 'linear-gradient(180deg, #7ac8d8, #3a7a8a)', transition: 'width 0.3s' }} />
        </div>
        {report.overBudget ? <p className="status-bad">{t.hydro.over}</p> : <p className="status-dim">{t.hydro.cycleHint}</p>}
      </div>
    </div>
  );
}
```

(Everything not mentioned — `Vine`, `SpikeBed`, the exported `Hydroponics` — stays exactly as it is. On the classic ship the rendered tree is identical to today's except the `needs`-null branch never runs.)

- [ ] **Step 3: Run the whole gate**

Run: `npx vitest run && npm run build`
Expected: both exit 0.

- [ ] **Step 4: Look at it**

`npm run dev`, play into chapter 2 on a probe ship (about one in two rolls) and reach hydroponics. The tags are pitted brass with no figure; the MOISTURE PROBE bezel sits on the trough's rim, dark. With every valve at 0 and a cycle run by the agent, the lamp is amber and the "Probe read" line appears; moving any valve darkens the lamp again. On a classic hydroponics: brass tags with numbers, no probe bezel.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/Hydroponics.tsx src/ui/strings.ts
git commit -m "feat: corroded tags and a moisture probe — hydroponics hides its numbers

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: The stacked deck — cargo bay swaps its crane

**Files:**
- Create: `src/scenes/StackedDeck.tsx`
- Modify: `src/scenes/CargoBay.tsx` (imports + the `CargoBay` component), `src/ui/strings.ts` (`cargo` block, both locales + interface)

**Interfaces:**
- Consumes: `liftCrate`, `lowerCrate`, `moveCrane` (Task 2 / existing); `chapter2v.held`, `chapter2v.tiers` (Task 1); `variantFor`; `slotLabel`; `useGame`, `useStrings`.
- Produces: nothing downstream.

- [ ] **Step 1: Strings**

Extend the `cargo` entry of the `UIStrings` interface:

```ts
  cargo: {
    title: string; intro: string; craneTitle: string; craneDesc: string; gridAria: string; slotAria: (label: string) => string;
    up: string; down: string; left: string; right: string; lift: string; wrongCrate: string; lifted: string;
    fragmentTitle: string; fragmentDesc: string; fragmentAria: string; readOut: string; analyzed: string; lowerDeck: string;
    stackedDesc: string; stackedGridAria: string; tierAria: (n: number) => string; lower: string; hookLamp: string;
    palletUp: string; holdingOne: string; slotFull: string; parked: string;
  };
```

Append to `en.cargo` (after `lowerDeck`):

```ts
    stackedDesc: 'Nine slots, one crane, one hook — and a bay re-racked in a hurry: three slots are stacked two high. The hook takes one crate at a time; LOWER parks it on any single-tier slot. Your AI reads the manifest — you drive, lift, park, and lift again.',
    stackedGridAria: 'cargo bay stack, three by three, some slots stacked two high, with the gantry crane',
    tierAria: (n) => (n === 2 ? 'two crates high' : 'one crate'),
    lower: 'Lower',
    hookLamp: 'HOOK',
    palletUp: 'A ration pallet swings on the hook. Nothing else lifts until it is parked — drive to a single-tier slot and LOWER.',
    holdingOne: 'The hook already carries a crate. Park it first.',
    slotFull: 'That slot is already two high. Find a single-tier slot.',
    parked: 'Parked. The hook is free.',
```

Append to `ptBR.cargo` (after `lowerDeck`):

```ts
    stackedDesc: 'Nove slots, um guindaste, um gancho — e um porão re-empilhado às pressas: três slots têm dois andares. O gancho leva um caixote por vez; BAIXAR estaciona em qualquer slot de um andar. Sua IA lê o manifesto — você dirige, iça, estaciona e iça de novo.',
    stackedGridAria: 'pilha do porão de carga, três por três, alguns slots com dois andares, com o guindaste de pórtico',
    tierAria: (n) => (n === 2 ? 'dois caixotes de altura' : 'um caixote'),
    lower: 'Baixar',
    hookLamp: 'GANCHO',
    palletUp: 'Um palete de ração balança no gancho. Nada mais sobe até ele ser estacionado — vá a um slot de um andar e BAIXAR.',
    holdingOne: 'O gancho já leva um caixote. Estacione primeiro.',
    slotFull: 'Esse slot já tem dois andares. Ache um slot de um andar.',
    parked: 'Estacionado. O gancho está livre.',
```

- [ ] **Step 2: Create `src/scenes/StackedDeck.tsx`**

```tsx
import { useState } from 'react';
import { useGame } from '../ui/useGame';
import { useStrings } from '../ui/useLocale';
import { gameStore, liftCrate, lowerCrate, moveCrane } from '../game/store';
import { slotLabel } from '../game/secrets';

const CELL = 74;
const X0 = 46;
const Y0 = 34;
// The upper crate of a two-high slot sits up and back — a light isometric lift.
const TIER_DX = -5;
const TIER_DY = -10;

type Note = 'wrong' | 'pallet' | 'holding' | 'full' | 'parked' | null;

export function StackedDeck() {
  const craneAt = useGame((s) => s.chapter2.craneAt);
  const lifted = useGame((s) => s.chapter2.crateLifted);
  const held = useGame((s) => s.chapter2v.held);
  const tiers = useGame((s) => s.chapter2v.tiers);
  const t = useStrings();
  const [note, setNote] = useState<Note>(null);
  const cx = X0 + craneAt.col * CELL + CELL / 2;
  const cy = Y0 + craneAt.row * CELL + CELL / 2;

  const lift = () => {
    const wasHeld = held;
    const r = liftCrate();
    const s = gameStore.getState();
    if (s.chapter2.crateLifted) setNote(null);
    else if (r.ok && s.chapter2v.held) setNote('pallet');
    else if (!r.ok && wasHeld) setNote('holding');
    else setNote('wrong');
  };
  const lower = () => setNote(lowerCrate().ok ? 'parked' : 'full');
  const move = (dir: 'up' | 'down' | 'left' | 'right') => { moveCrane(dir); if (note !== 'pallet') setNote(null); };

  return (
    <div className="panel">
      <h2>{t.cargo.craneTitle}</h2>
      <p className="status-dim">{t.cargo.stackedDesc}</p>
      <svg viewBox="0 0 320 270" width="100%" style={{ maxWidth: 440, display: 'block' }} role="img"
        aria-label={`${t.cargo.stackedGridAria} — ${t.cargo.slotAria(slotLabel(craneAt))}, ${t.cargo.tierAria(tiers[craneAt.row * 3 + craneAt.col])}`}>
        <defs>
          <linearGradient id="sd-steel" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2c3630" />
            <stop offset="100%" stopColor="#151c18" />
          </linearGradient>
          <linearGradient id="sd-steel-up" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3a463f" />
            <stop offset="100%" stopColor="#1e2721" />
          </linearGradient>
          <pattern id="sd-hazard" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="4" height="8" fill="var(--brass)" />
            <rect x="4" width="4" height="8" fill="#1a1410" />
          </pattern>
        </defs>
        {/* deck plate */}
        <rect x="4" y="4" width="312" height="262" rx="6" fill="var(--face)" stroke="var(--line)" strokeWidth="2" />
        {/* rails */}
        <rect x={X0 - 14} y={Y0 - 12} width="6" height={CELL * 3 + 24} fill="var(--steel)" />
        <rect x={X0 + CELL * 3 + 8} y={Y0 - 12} width="6" height={CELL * 3 + 24} fill="var(--steel)" />
        {/* hook lamp on the crane housing */}
        <g>
          <rect x="246" y="8" width="64" height="16" rx="3" fill="var(--face-deep)" stroke="var(--steel)" strokeWidth="1.5" />
          <circle cx="256" cy="16" r="3.5" fill={held ? 'var(--amber)' : 'var(--face)'} stroke="var(--steel-hi)" strokeWidth="0.75" />
          <text x="284" y="19" textAnchor="middle" fontSize="7" letterSpacing="1.5" fill="var(--parchment)" opacity="0.8">{t.cargo.hookLamp}</text>
        </g>
        {/* crates: bottom tier, then the upper crate of a stacked slot */}
        {[0, 1, 2].map((row) => [0, 1, 2].map((col) => {
          const x = X0 + col * CELL;
          const y = Y0 + row * CELL;
          const idx = row * 3 + col;
          // visually distinct only once the crane has lifted the container here —
          // the scene never reads the secret slot, only the crane's own position
          const isQ = lifted && craneAt.row === row && craneAt.col === col;
          // deterministic per-crate wear, keyed only on grid position — never on the secret
          const scuffOpacity = 0.12 + 0.05 * ((idx * 5) % 4);
          const insetOpacity = 0.4 + 0.06 * ((idx * 3) % 5);
          const scuffOffset = (idx % 3) * 4;
          const stacked = tiers[idx] === 2;
          return (
            <g key={`${row}${col}`} role="group" aria-label={`${t.cargo.slotAria(slotLabel({ row, col }))}, ${t.cargo.tierAria(tiers[idx])}`}>
              <rect x={x + 4} y={y + 4} width={CELL - 8} height={CELL - 8} rx="4"
                fill={isQ ? 'var(--hull)' : 'url(#sd-steel)'} stroke={isQ ? 'var(--line)' : 'var(--steel-mid)'} strokeWidth="1.5"
                strokeDasharray={isQ ? '3 3' : undefined} />
              {!isQ && (
                <>
                  <rect x={x + 10} y={y + 10} width={CELL - 20} height="6" fill="var(--hull)" opacity={insetOpacity} />
                  <line x1={x + 12 + scuffOffset} y1={y + CELL - 14} x2={x + 30 + scuffOffset} y2={y + CELL - 20}
                    stroke="var(--steel-hi)" strokeWidth="1" opacity={scuffOpacity} />
                  <line x1={x + CELL - 30} y1={y + 20 - scuffOffset} x2={x + CELL - 14} y2={y + 26 - scuffOffset}
                    stroke="var(--hull)" strokeWidth="1.5" opacity={scuffOpacity} />
                  {!stacked && (
                    <text x={x + CELL / 2} y={y + CELL / 2 + 4} textAnchor="middle" fontSize="11" fill="var(--steel-hi)" letterSpacing="2">{slotLabel({ row, col })}</text>
                  )}
                </>
              )}
              {isQ && <rect x={x + 8} y={y + CELL - 16} width={CELL - 16} height="6" fill="url(#sd-hazard)" />}
              {stacked && (
                <g style={{ transition: 'opacity 0.3s' }}>
                  {/* side face of the upper crate, then its top */}
                  <path d={`M ${x + 4} ${y + CELL - 4} L ${x + 4 + TIER_DX} ${y + CELL - 4 + TIER_DY} L ${x + CELL - 4 + TIER_DX} ${y + CELL - 4 + TIER_DY} L ${x + CELL - 4} ${y + CELL - 4} Z`}
                    fill="var(--steel-lo)" stroke="var(--steel-mid)" strokeWidth="1" />
                  <rect x={x + 4 + TIER_DX} y={y + 4 + TIER_DY} width={CELL - 8} height={CELL - 8} rx="4"
                    fill="url(#sd-steel-up)" stroke="var(--steel-hi)" strokeWidth="1.5" />
                  <rect x={x + 10 + TIER_DX} y={y + 10 + TIER_DY} width={CELL - 20} height="6" fill="var(--hull)" opacity={insetOpacity} />
                  <text x={x + CELL / 2 + TIER_DX} y={y + CELL / 2 + 4 + TIER_DY} textAnchor="middle" fontSize="11" fill="var(--steel-hi)" letterSpacing="2">{slotLabel({ row, col })}</text>
                  <text x={x + CELL / 2 + TIER_DX} y={y + CELL - 10 + TIER_DY} textAnchor="middle" fontSize="6" fill="var(--parchment)" opacity="0.6" letterSpacing="1">×2</text>
                </g>
              )}
            </g>
          );
        }))}
        {/* gantry: beam across the crane's row, trolley + hook at its column, the carried crate when held */}
        <g style={{ transition: 'transform 0.35s ease', transform: `translate(0px, ${cy - (Y0 + CELL / 2)}px)` }}>
          <rect x={X0 - 14} y={Y0 + CELL / 2 - 4} width={CELL * 3 + 28} height="8" fill="var(--steel-hi)" opacity="0.9" />
        </g>
        <g style={{ transition: 'transform 0.35s ease', transform: `translate(${cx - (X0 + CELL / 2)}px, ${cy - (Y0 + CELL / 2)}px)` }}>
          <rect x={X0 + CELL / 2 - 12} y={Y0 + CELL / 2 - 10} width="24" height="20" rx="3" fill="var(--amber)" />
          <line x1={X0 + CELL / 2} y1={Y0 + CELL / 2 + 10} x2={X0 + CELL / 2} y2={Y0 + CELL / 2 + 26} stroke="var(--brass)" strokeWidth="2" />
          <path d={`M ${X0 + CELL / 2 - 6} ${Y0 + CELL / 2 + 26} q 6 10 12 0`} fill="none" stroke="var(--brass)" strokeWidth="2.5" />
          {held && (
            <rect x={X0 + CELL / 2 - 16} y={Y0 + CELL / 2 + 30} width="32" height="18" rx="3" fill="url(#sd-steel-up)" stroke="var(--steel-hi)" strokeWidth="1.5" />
          )}
        </g>
      </svg>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: 6, justifyContent: 'start', marginTop: 10 }}>
        <span />
        <button onClick={() => move('up')} disabled={lifted} aria-label={t.cargo.up}>{t.cargo.up}</button>
        <span />
        <button onClick={() => move('left')} disabled={lifted} aria-label={t.cargo.left}>{t.cargo.left}</button>
        <button onClick={lift} disabled={lifted || held} style={{ borderColor: 'var(--amber)' }} aria-label={t.cargo.lift}>{t.cargo.lift}</button>
        <button onClick={() => move('right')} disabled={lifted} aria-label={t.cargo.right}>{t.cargo.right}</button>
        <span />
        <button onClick={() => move('down')} disabled={lifted} aria-label={t.cargo.down}>{t.cargo.down}</button>
        <span />
        <span />
        <button onClick={lower} disabled={lifted || !held} style={{ borderColor: 'var(--brass)' }} aria-label={t.cargo.lower}>{t.cargo.lower}</button>
        <span />
      </div>
      {lifted ? (
        <p className="status-ok" style={{ marginTop: 10 }}>{t.cargo.lifted}</p>
      ) : note === 'pallet' ? (
        <p className="status-dim" style={{ marginTop: 10 }}>{t.cargo.palletUp}</p>
      ) : note === 'holding' ? (
        <p className="status-dim" style={{ marginTop: 10 }}>{t.cargo.holdingOne}</p>
      ) : note === 'full' ? (
        <p className="status-dim" style={{ marginTop: 10 }}>{t.cargo.slotFull}</p>
      ) : note === 'parked' ? (
        <p className="status-dim" style={{ marginTop: 10 }}>{t.cargo.parked}</p>
      ) : note === 'wrong' ? (
        <p className="status-dim" style={{ marginTop: 10 }}>{t.cargo.wrongCrate}</p>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 3: Swap the deck in `src/scenes/CargoBay.tsx`**

Add the imports:

```ts
import { variantFor } from '../game/variants';
import { StackedDeck } from './StackedDeck';
```

Replace the exported `CargoBay` component with:

```tsx
export function CargoBay() {
  const seed = useGame((s) => s.seed);
  const stacked = variantFor(seed, 'cargo_bay') === 1;
  const t = useStrings();
  return (
    <div className="scene">
      <div className="panel">
        <h2>{t.cargo.title}</h2>
        <p>{t.cargo.intro}</p>
      </div>
      {stacked ? <StackedDeck /> : <CraneDeck />}
      <HullFragment />
    </div>
  );
}
```

- [ ] **Step 4: Run the whole gate**

Run: `npx vitest run && npm run build`
Expected: both exit 0.

- [ ] **Step 5: Look at it**

On a stacked ship the deck shows three slots drawn two high (an offset upper crate with a side face and a `×2` mark, the slot label on the upper crate), the HOOK lamp dark; Lift on a stacked slot puts a crate on the hook (lamp amber, the crate drawn under the trolley, Lift disabled, Lower enabled); Lower on a single-tier slot parks it (that slot now two high); Lift on the exposed quarantine slot lifts the container (hazard stripe, hull fragment appears). On the classic ship the deck is the unchanged `CraneDeck` — no Lower button, no lamp.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/StackedDeck.tsx src/scenes/CargoBay.tsx src/ui/strings.ts
git commit -m "feat: the stacked deck — cargo bay swaps its crane

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Docs, preview, playthrough, merge

- [ ] **Step 1:** `README.md`: in the "Every ship is unique" bullet, extend the structural sentence so it also covers chapter 2 — after "a drifting nav fix instead of the parallax star fix" add ", a keyed safe whose key hides behind one of Amara's drawings, a hydroponics manifold whose need tags have corroded, a cargo bay re-racked with the quarantine container under a pallet"; update the test count in the "Local development" block to the real total printed by `npx vitest run`. Append to the spec: "**Shipped <date>** — <tests> tests; chapter-2 structural variants live." Commit.
- [ ] **Step 2:** Demo seeds (verified against the real derivation before this plan was written): **seed 2** rolls all three chapter-2 variants (its chapter 1 is patch bay / classic / drift), **seed 12** rolls none of them, and **seed 177** rolls all six variants of the game (quarantine slot B3). Re-verify with a one-off in the test runner if in doubt:

```bash
cat > src/game/__seeds.test.ts <<'EOF'
import { it } from 'vitest';
import { variantFor } from './variants';
it('seeds', () => {
  const R = ['cryo_bay', 'engineering', 'bridge', 'crew_quarters', 'hydroponics', 'cargo_bay'] as const;
  throw new Error([2, 12, 177].map((s) => `${s}: ${R.map((r) => variantFor(s, r)).join('/')}`).join(' | '));
});
EOF
npx vitest run src/game/__seeds.test.ts 2>&1 | grep -m1 'Error:'; rm src/game/__seeds.test.ts
```

Expected: `2: 1/0/1/1/1/1 | 12: 1/0/0/0/0/0 | 177: 1/1/1/1/1/1`.

- [ ] **Step 3:** Push `directors-cut`, deploy a preview (`npx vercel --yes`), and hand Mario the walkthrough. There is no seed picker: "Abandon previous run" rerolls; each chapter-2 room rolls independently (~1 in 2), all three together ~1 in 8. The script: (a) a keyed ship — ask the agent for the crew manifest, lift the drawing it names, turn the key, decrypt the log; lift a wrong drawing first to see it settle back; (b) a probe ship — close every valve, have the agent run the cycle, hear the numbers, set the valves, run again, pull the spike; (c) a stacked ship — ask for the manifest ("lower tier"), lift the pallet, park it, come back, lift the container, read the fragment, `analyze_sample`, the lower deck opens; (d) one classic chapter 2 untouched (wheels, brass tags with numbers, plain crane).
- [ ] **Step 4:** Merge and deploy after "aprovado":

```bash
git checkout main && git merge directors-cut --no-edit && npx vitest run && npm run build && git push origin main && npx vercel --prod --yes
git checkout directors-cut && git merge main && git push origin directors-cut
```

- [ ] **Step 5:** Update the project memory (Plan F2 shipped; F3 — chapter-3 variants: core-vault rack and comms dish — is the natural next candidate).
