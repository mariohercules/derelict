# Remixed Ships — Plan F — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make two random ships differ in structure, not just numbers: each chapter-1 room rolls one of two puzzle variants by seed — a patch bay instead of breakers, coils-and-gear instead of fuse-and-valves, drift correction instead of the parallax star fix — while the classic ship (seed 0) and the agent's tool contract stay byte-for-byte identical.

**Architecture:** A new pure module `src/game/variants.ts` derives the variant per room and the variant secrets on a **dedicated PRNG stream** (seed XOR a per-use salt), so `secretsFor`'s frozen draw order is never touched. One new persisted slice `chapter1v` holds the variant puzzles' inputs; outcomes stay in the existing flags (`auxPower`, `enginesOnline` derived, `starFixTaken`/`trajectorySet`). Scenes swap only the puzzle panel (`variantFor(seed, room) === 1 ? <PatchBay/> : <BreakerPanel/>`); tools keep their names, schemas and descriptions — only the content they read (maintenance log, schematics, diagnostics, sensors) follows the ship.

**Tech Stack:** React 19 + TypeScript + Vite, Zustand, Vitest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-30-derelict-remixed-ships-design.md` (§3 derivation, §4 state, §5 puzzles, §6 agent surface, §7 scenes, §8 testing). Base: `main` @ Plan E (230 tests, 31 tools).

## Global Constraints

- **The classic ship is untouchable:** `variantFor(0, room) === 0` for every room; with variant 0 every action, tool response, scene and test behaves exactly as shipped. The frozen-seed secrets test stays green unmodified; `secretsFor`'s body gains only an `export` keyword on `prng` (no draw change of any kind).
- **No tool contract change:** no new tools, no schema or description edits (one exception named in Task 3: `getSchematics()` gains a `seed` parameter — an internal getter, not a tool surface). Machine codes (`P-7B`, tooth counts, phases, fix codes) identical across locales.
- Variant derivation and secrets live only in `src/game/variants.ts`, on their own PRNG stream; they are defined for every seed (including 0).
- `chapter1v` is persisted with fill-on-load defaults (the `initialState` merge covers a missing key; `validShape` validates when present): sockets `null | 1–3`, `energized` boolean, `gear` `null |` int, phases three ints 0–11.
- **Premium graphics standard (non-negotiable):** the three new panels are SVG instruments — bezels and inset faces, deterministic geometry, palette tokens (`--steel*`, `--face*`, `--brass*`, `--parchment`, semantic tokens; scene-material colours may be literal like hydroponics' soil), transitions only (the global reduced-motion rule covers them), defs prefixes `pb-`/`gc-`/`dv-` defined once, `role="img"` + `aria-label` from strings, real `<button>`/`<input type="range">` controls with aria-labels. Puzzle-critical information must be visually readable (gear teeth are really drawn and countable, like the fuse bands).
- All player-facing text in both locales in `src/ui/strings.ts`; agent-facing text English, in-fiction, anti-deflection conventions.
- Branch `directors-cut`; merge to `main` + prod deploy in Task 7 after Mario's preview playthrough (the plan names a seed that rolls all three variants).
- Commit messages end with a blank line then `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Verification gate for every commit: `npx vitest run && npm run build` both exit 0 (gate on exit codes).

---

### Task 1: Variant derivation, variant secrets, and the `chapter1v` slice

**Files:**
- Create: `src/game/variants.ts`
- Modify: `src/game/secrets.ts` (export `prng` — nothing else), `src/game/types.ts`, `src/game/store.ts` (`initialState` only), `src/game/persist.ts`
- Test: `src/game/variants.test.ts` (create), `src/game/persist.test.ts` (append)

**Interfaces:**
- Produces: `VariantRoom = 'cryo_bay' | 'engineering' | 'bridge'`; `variantFor(seed, room): 0 | 1`; `VariantSecrets { cableBuses: [n,n,n]; gearTeeth: { target, decoys: [n,n] }; coilPhases: [n,n,n]; driftFix: [s,s,s] }`; `variantSecretsFor(seed)`; `Chapter1VariantState`; `GameState.chapter1v`; `initialState().chapter1v` defaults; persist validation.

- [ ] **Step 1: Failing tests**

Create `src/game/variants.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { variantFor, variantSecretsFor } from './variants';
import type { VariantRoom } from './variants';

const ROOMS: VariantRoom[] = ['cryo_bay', 'engineering', 'bridge'];

describe('variantFor', () => {
  it('is pure and deterministic', () => {
    for (const room of ROOMS) {
      expect(variantFor(777, room)).toBe(variantFor(777, room));
    }
  });

  it('the classic ship rolls variant 0 in every room, always', () => {
    for (const room of ROOMS) expect(variantFor(0, room)).toBe(0);
  });

  it('both variants occur, roughly evenly, over 400 seeds', () => {
    for (const room of ROOMS) {
      let ones = 0;
      for (let seed = 1; seed <= 400; seed++) ones += variantFor(seed, room);
      expect(ones).toBeGreaterThan(120);
      expect(ones).toBeLessThan(280);
    }
  });

  it('rooms roll independently: some ship mixes variants', () => {
    let mixed = false;
    for (let seed = 1; seed <= 100 && !mixed; seed++) {
      const v = ROOMS.map((r) => variantFor(seed, r));
      mixed = new Set(v).size > 1;
    }
    expect(mixed).toBe(true);
  });
});

describe('variantSecretsFor', () => {
  it('is well-formed for every seed', () => {
    for (let seed = 0; seed <= 400; seed++) {
      const v = variantSecretsFor(seed);
      expect([...v.cableBuses].sort()).toEqual([1, 2, 3]);
      const teeth = [v.gearTeeth.target, ...v.gearTeeth.decoys];
      expect(new Set(teeth).size).toBe(3);
      for (const t of teeth) {
        expect(t).toBeGreaterThanOrEqual(13);
        expect(t).toBeLessThanOrEqual(29);
      }
      for (const p of v.coilPhases) {
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(11);
      }
      for (const c of v.driftFix) expect(c).toMatch(/^\d{2}$/);
    }
  });

  it('is deterministic', () => {
    expect(variantSecretsFor(1234)).toEqual(variantSecretsFor(1234));
  });
});
```

Append to `src/game/persist.test.ts` (inside `describe('persistence')`):
```ts
  it('fills chapter1v defaults for an older save and rejects malformed shapes', () => {
    const older = { ...initialState(0) } as Record<string, unknown>;
    delete older.chapter1v;
    storage.set(SAVE_KEY, JSON.stringify(older));
    const loaded = loadSavedState();
    expect(loaded?.chapter1v).toEqual({ sockets: [null, null, null], energized: false, gear: null, phases: [0, 0, 0] });
    const c1 = initialState(0).chapter1v;
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), chapter1v: { ...c1, sockets: [0, null, null] } }));
    expect(loadSavedState()).toBeNull();
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), chapter1v: { ...c1, phases: [0, 0, 12] } }));
    expect(loadSavedState()).toBeNull();
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), chapter1v: { ...c1, energized: 'yes' } }));
    expect(loadSavedState()).toBeNull();
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), chapter1v: { ...c1, sockets: [2, 1, 3], gear: 17 } }));
    expect(loadSavedState()?.chapter1v.gear).toBe(17);
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/game/variants.test.ts src/game/persist.test.ts`
Expected: FAIL — `./variants` missing; `chapter1v` undefined.

- [ ] **Step 3: `variants.ts`**

In `src/game/secrets.ts` change `function prng(` to `export function prng(` (the ONLY edit to this file).

Create `src/game/variants.ts`:
```ts
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
  const teeth: number[] = [];
  while (teeth.length < 3) {
    const t = int(13, 29);
    if (!teeth.includes(t)) teeth.push(t);
  }
  const coilPhases: [number, number, number] = [int(0, 11), int(0, 11), int(0, 11)];
  const driftFix = [0, 1, 2].map(() => String(int(7, 99)).padStart(2, '0')) as [string, string, string];
  return {
    cableBuses: buses as [number, number, number],
    gearTeeth: { target: teeth[0], decoys: [teeth[1], teeth[2]] },
    coilPhases,
    driftFix,
  };
}
```

- [ ] **Step 4: State and persistence**

`src/game/types.ts`, before `GameState`:
```ts
// Inputs of the chapter-1 variant puzzles (Plan F). Outcomes stay in the
// existing flags: auxPower, enginesOnline (derived), starFixTaken.
export interface Chapter1VariantState {
  sockets: [number | null, number | null, number | null]; // bus per cable: red, green, blue
  energized: boolean; // the last ENERGIZE press lit the panel
  gear: number | null; // seated coupling gear's tooth count
  phases: [number, number, number]; // coil phase dials, 0–11
}
```
and in `GameState` after `ngPlus: boolean;`:
```ts
  chapter1v: Chapter1VariantState;
```

`src/game/store.ts` `initialState` — after `ngPlus,`:
```ts
    chapter1v: { sockets: [null, null, null], energized: false, gear: null, phases: [0, 0, 0] },
```

`src/game/persist.ts` — in `validShape`, after the `chapter3` block (import `Chapter1VariantState` is not needed; validate structurally):
```ts
  if (p.chapter1v !== undefined) {
    const c1 = p.chapter1v as unknown as Record<string, unknown>;
    if (!c1 || typeof c1 !== 'object') return false;
    if (!Array.isArray(c1.sockets) || c1.sockets.length !== 3 || !c1.sockets.every((b) => b === null || isIntInRange(b, 1, 3))) return false;
    if (typeof c1.energized !== 'boolean') return false;
    if (c1.gear !== null && !isIntInRange(c1.gear, 1, 99)) return false;
    if (!Array.isArray(c1.phases) || c1.phases.length !== 3 || !c1.phases.every((v) => isIntInRange(v, 0, 11))) return false;
  }
```
(A missing `chapter1v` is covered by the `{ ...initialState(), ...parsed }` merge — same as `chapter3`.)

- [ ] **Step 5: Gate and commit**

Run: `npx vitest run && npm run build`
Expected: PASS (230 + 7); build exit 0. The frozen-seed secrets test is untouched and green.
```bash
git add src/game/variants.ts src/game/secrets.ts src/game/types.ts src/game/store.ts src/game/persist.ts src/game/variants.test.ts src/game/persist.test.ts
git commit -m "feat: variant derivation on its own stream, and the chapter1v slice"
```

---

### Task 2: Store actions and variant-aware selectors

**Files:**
- Modify: `src/game/store.ts`, `src/game/derived.ts`
- Test: `src/game/store.variants.test.ts` (create)

**Interfaces:**
- Consumes: `variantFor`, `variantSecretsFor`, `Chapter1VariantState` (Task 1).
- Produces (store): `plugCable(cable: 0|1|2, bus: number | null): ActionResult`, `energize(): ActionResult`, `seatGear(teeth: number): ActionResult`, `setPhase(index: 0|1|2, value: number): void`; `computeTrajectory` validates against the variant-aware fix. (derived): `gearCorrect(s)`, `coilsCorrect(s)`; `valvesCorrect(s)` returns `true` on a coil-drive ship; `enginesOnline(s)` and `logsAvailable(s)` branch by variant.

- [ ] **Step 1: Failing tests**

Create `src/game/store.variants.test.ts`:
```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { gameStore, resetGame, plugCable, energize, seatGear, setPhase, takeStarFix, computeTrajectory } from './store';
import { coilsCorrect, enginesOnline, gearCorrect, logsAvailable, valvesCorrect } from './derived';
import { variantFor, variantSecretsFor } from './variants';
import { STAR_FIX } from './content';

function findSeed(pred: (seed: number) => boolean): number {
  for (let seed = 1; seed < 5000; seed++) if (pred(seed)) return seed;
  throw new Error('no seed found');
}
const S_PB = findSeed((s) => variantFor(s, 'cryo_bay') === 1);
const S_GC = findSeed((s) => variantFor(s, 'engineering') === 1 && variantSecretsFor(s).coilPhases.some((p) => p !== 0));
const S_DV = findSeed((s) => variantFor(s, 'bridge') === 1);

beforeEach(() => resetGame(0));

describe('patch bay (cryo variant 1)', () => {
  it('exists only on a patch-bay ship and only in the cryo bay', () => {
    expect(energize().ok).toBe(false); // classic ship: no patch bay
    resetGame(S_PB);
    gameStore.setState({ room: 'engineering', doors: { cryo_exit: true, engineering_exit: false }, act: 2 });
    expect(plugCable(0, 1).ok).toBe(false);
  });

  it('one line per bus; ENERGIZE refuses a half-made circuit and wrong wiring, lights on the right one', () => {
    resetGame(S_PB);
    const target = variantSecretsFor(S_PB).cableBuses;
    expect(plugCable(0, 1).ok).toBe(true);
    expect(plugCable(1, 1).ok).toBe(false); // bus 1 taken
    expect(energize().ok).toBe(false); // cables missing
    // deliberately wrong full wiring: rotate the target assignment
    plugCable(0, target[1]); plugCable(1, target[2]); plugCable(2, target[0]);
    expect(energize().ok).toBe(false);
    expect(gameStore.getState().auxPower).toBe(false);
    expect(gameStore.getState().chapter1v.energized).toBe(false);
    // unplug and rewire correctly
    plugCable(0, null); plugCable(1, null); plugCable(2, null);
    plugCable(0, target[0]); plugCable(1, target[1]); plugCable(2, target[2]);
    expect(energize().ok).toBe(true);
    expect(gameStore.getState().auxPower).toBe(true);
    expect(gameStore.getState().chapter1v.energized).toBe(true);
  });
});

describe('coils and gear (engineering variant 1)', () => {
  function inEngineering() {
    resetGame(S_GC);
    gameStore.setState((s) => ({
      room: 'engineering', act: 2, auxPower: true, doors: { cryo_exit: true, engineering_exit: false },
      powerAllocation: { ...s.powerAllocation, engines: 20, life_support: 15, comms: 0, medbay: 5, doors: 0 },
    }));
  }

  it('the tray holds three gears; only the schematic\'s count couples; phases finish the job', () => {
    inEngineering();
    const v = variantSecretsFor(S_GC);
    expect(seatGear(99).ok).toBe(false); // no such gear
    expect(seatGear(v.gearTeeth.decoys[0]).ok).toBe(true); // seats, but wrong
    setPhase(0, v.coilPhases[0]); setPhase(1, v.coilPhases[1]); setPhase(2, v.coilPhases[2]);
    expect(gearCorrect(gameStore.getState())).toBe(false);
    expect(enginesOnline(gameStore.getState())).toBe(false);
    seatGear(v.gearTeeth.target);
    expect(gearCorrect(gameStore.getState())).toBe(true);
    expect(coilsCorrect(gameStore.getState())).toBe(true);
    expect(enginesOnline(gameStore.getState())).toBe(true);
    setPhase(1, (v.coilPhases[1] + 1) % 12);
    expect(enginesOnline(gameStore.getState())).toBe(false);
  });

  it('a coil-drive ship has no valves puzzle: valvesCorrect is true, logs key off the coils', () => {
    inEngineering();
    expect(valvesCorrect(gameStore.getState())).toBe(true);
    const v = variantSecretsFor(S_GC);
    const before = logsAvailable(gameStore.getState());
    setPhase(0, v.coilPhases[0]); setPhase(1, v.coilPhases[1]); setPhase(2, v.coilPhases[2]);
    expect(logsAvailable(gameStore.getState())).toBe(before + 1);
  });

  it('the gear tray exists only on a coil-drive ship', () => {
    resetGame(0);
    gameStore.setState({ room: 'engineering', act: 2 });
    expect(seatGear(17).ok).toBe(false);
  });
});

describe('drift correction (bridge variant 1)', () => {
  it('the trajectory accepts the drift fix, not the glyphs, on a drift ship — and the classic ship is untouched', () => {
    resetGame(S_DV);
    gameStore.setState({ room: 'bridge', act: 3 });
    takeStarFix();
    expect(computeTrajectory([...STAR_FIX]).ok).toBe(false);
    const fix = variantSecretsFor(S_DV).driftFix;
    expect(computeTrajectory([...fix]).ok).toBe(true);
    expect(gameStore.getState().trajectorySet).toBe(true);
    resetGame(0);
    gameStore.setState({ room: 'bridge', act: 3 });
    takeStarFix();
    expect(computeTrajectory([...STAR_FIX]).ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/game/store.variants.test.ts`
Expected: FAIL — actions missing.

- [ ] **Step 3: Selectors**

In `src/game/derived.ts` (add `import { variantFor, variantSecretsFor } from './variants';`):
```ts
export function valvesCorrect(s: GameState): boolean {
  // A coil-drive ship's manifold is self-regulating: the valves puzzle does
  // not exist there, so nothing downstream should wait on it.
  if (variantFor(s.seed, 'engineering') === 1) return true;
  const targets = secretsFor(s.seed).valveTargets;
  return s.valveSettings.every((v, i) => v === targets[i]);
}

export function gearCorrect(s: GameState): boolean {
  return s.chapter1v.gear === variantSecretsFor(s.seed).gearTeeth.target;
}

export function coilsCorrect(s: GameState): boolean {
  const t = variantSecretsFor(s.seed).coilPhases;
  return s.chapter1v.phases.every((p, i) => p === t[i]);
}

export function enginesOnline(s: GameState): boolean {
  if (s.powerAllocation.engines < ENGINES_REQUIRED) return false;
  if (variantFor(s.seed, 'engineering') === 1) return gearCorrect(s) && coilsCorrect(s);
  return s.fuseInstalled === CORRECT_FUSE && valvesCorrect(s);
}

export function logsAvailable(s: GameState): number {
  let n = 2;
  if (s.powerAllocation.engines >= ENGINES_REQUIRED) n++;
  if (variantFor(s.seed, 'engineering') === 1 ? coilsCorrect(s) : valvesCorrect(s)) n++;
  if (enginesOnline(s)) n++;
  return n;
}
```

- [ ] **Step 4: Store actions**

In `src/game/store.ts` (imports: add `Chapter1VariantState` to the types import; `import { variantFor, variantSecretsFor } from './variants';`), append after the STAY block:
```ts
// ---------------------------------------------------------- chapter-1 variants

function patch1v(p: Partial<Chapter1VariantState>): void {
  gameStore.setState((s) => ({ chapter1v: { ...s.chapter1v, ...p } }));
}

export function plugCable(cable: 0 | 1 | 2, bus: number | null): ActionResult {
  const s = gameStore.getState();
  if (variantFor(s.seed, 'cryo_bay') !== 1) return { ok: false, message: 'This ship has no patch bay.' };
  if (s.room !== 'cryo_bay') return { ok: false, message: 'The patch bay is in the cryo bay.' };
  if (s.auxPower) return { ok: true, message: 'Auxiliary power is already up; the wiring holds.' };
  const sockets = [...s.chapter1v.sockets] as Chapter1VariantState['sockets'];
  if (bus === null) {
    sockets[cable] = null;
    patch1v({ sockets, energized: false });
    return { ok: true, message: 'Cable pulled.' };
  }
  const b = Math.round(bus);
  if (b < 1 || b > 3) return { ok: false, message: 'Buses run 1 to 3.' };
  if (s.chapter1v.sockets.some((v, i) => v === b && i !== cable)) {
    return { ok: false, message: `Bus ${b} already holds a cable. One line per bus.` };
  }
  sockets[cable] = b;
  patch1v({ sockets, energized: false });
  return { ok: true, message: `Cable seated on bus ${b}.` };
}

export function energize(): ActionResult {
  const s = gameStore.getState();
  if (variantFor(s.seed, 'cryo_bay') !== 1) return { ok: false, message: 'This ship has no patch bay.' };
  if (s.room !== 'cryo_bay') return { ok: false, message: 'The patch bay is in the cryo bay.' };
  if (s.auxPower) return { ok: true, message: 'Auxiliary power is already up.' };
  if (s.chapter1v.sockets.some((b) => b === null)) {
    return { ok: false, message: 'Not every cable is seated. The panel refuses a half-made circuit.' };
  }
  const target = variantSecretsFor(s.seed).cableBuses;
  if (!s.chapter1v.sockets.every((b, i) => b === target[i])) {
    patch1v({ energized: false });
    return { ok: false, message: 'The panel blinks once and goes dark. Wrong wiring; nothing trips, nothing forgives.' };
  }
  patch1v({ energized: true });
  gameStore.setState({ auxPower: true });
  return { ok: true, message: 'AUXILIARY POWER ONLINE.' };
}

export function seatGear(teeth: number): ActionResult {
  const s = gameStore.getState();
  if (variantFor(s.seed, 'engineering') !== 1) return { ok: false, message: 'This ship has no coil drive.' };
  if (s.room !== 'engineering') return { ok: false, message: 'The gear tray is in engineering.' };
  const v = variantSecretsFor(s.seed).gearTeeth;
  if (![v.target, ...v.decoys].includes(teeth)) return { ok: false, message: 'No such gear in the tray.' };
  patch1v({ gear: teeth });
  return { ok: true, message: `Gear seated: ${teeth} teeth.` };
}

export function setPhase(index: 0 | 1 | 2, value: number): void {
  const v = Math.max(0, Math.min(11, Math.round(value)));
  gameStore.setState((s) => {
    const phases = [...s.chapter1v.phases] as [number, number, number];
    phases[index] = v;
    return { chapter1v: { ...s.chapter1v, phases } };
  });
}
```
and in `computeTrajectory`, replace the fix comparison:
```ts
  const fix = variantFor(s.seed, 'bridge') === 1 ? variantSecretsFor(s.seed).driftFix : secretsFor(s.seed).starFix;
  if (given !== fix.join('-')) {
    return { ok: false, message: 'Star fix does not resolve. Those symbols point us into a gas giant. Re-check the viewport.' };
  }
```

- [ ] **Step 5: Gate and commit**

Run: `npx vitest run && npm run build`
Expected: PASS (+6); build exit 0 — every existing test (classic ships) untouched.
```bash
git add src/game/store.ts src/game/derived.ts src/game/store.variants.test.ts
git commit -m "feat: variant puzzle actions — patch bay, coils and gear, the drift fix"
```

---

### Task 3: A narrative and tool surface that follows the ship

**Files:**
- Modify: `src/game/narrative.ts`, `src/mcp/tools.ts`
- Test: `src/mcp/tools.test.ts` (append), `src/game/i18n.test.ts` (adjust two lines + append)

**Interfaces:**
- Consumes: `variantFor`, `variantSecretsFor` (Task 1); `gearCorrect`, `coilsCorrect` (Task 2).
- Produces: `getMaintenanceLog(seed)` returns the patch-bay sheet on a variant-1 cryo ship; `getSchematics(seed)` (signature change — callers updated: the `get_schematic` handler and the i18n test) with the coil-drive `engine_feed` and self-regulating `coolant` sheets on a variant-1 engineering ship; `run_diagnostics` engines faults and `read_sensors` coolant channels follow the ship. **No tool names, schemas or descriptions change; the tool count stays 31.**

- [ ] **Step 1: Failing tests**

Append to `src/mcp/tools.test.ts` (extend the store import with `plugCable, energize` if desired — the tests below drive through `call` and direct store setup; import `variantFor, variantSecretsFor` from `'../game/variants'`):
```ts
describe('remixed ships — the surface follows the ship', () => {
  function findSeed(pred: (seed: number) => boolean): number {
    for (let seed = 1; seed < 5000; seed++) if (pred(seed)) return seed;
    throw new Error('no seed found');
  }
  const S_PB = findSeed((s) => variantFor(s, 'cryo_bay') === 1);
  const S_GC = findSeed((s) => variantFor(s, 'engineering') === 1);

  it('the maintenance log describes the patch bay on a patch-bay ship, breakers otherwise', async () => {
    resetGame(S_PB);
    const log = await call('read_maintenance_log');
    expect(log.log).toContain('P-7B');
    expect(log.log).toContain(`bus ${variantSecretsFor(S_PB).cableBuses[0]}`);
    resetGame(0);
    const classic = await call('read_maintenance_log');
    expect(classic.log).toContain('LOAD ORDER');
  });

  it('the engine schematic and diagnostics speak coil-drive on a coil ship', async () => {
    resetGame(S_GC);
    gameStore.setState({ room: 'engineering', act: 2 });
    const v = variantSecretsFor(S_GC);
    const sch = await call('get_schematic', { system: 'engine_feed' });
    expect(sch.schematic).toContain(`${v.gearTeeth.target} teeth`);
    expect(sch.schematic).toContain('COIL DRIVE');
    const coolant = await call('get_schematic', { system: 'coolant' });
    expect(coolant.schematic).toContain('SELF-REGULATING');
    const diag = await call('run_diagnostics', { subsystem: 'engines' });
    expect(diag.faults.join(' ')).toMatch(/coupling gear not seated/);
    expect(diag.faults.join(' ')).not.toMatch(/fuse/);
    const sensors = await call('read_sensors', { system: 'coolant' });
    expect(JSON.stringify(sensors)).not.toContain('FAULT');
  });

  it('the classic ship\'s surface is untouched, and the tool contract never changes', async () => {
    resetGame(0);
    gameStore.setState({ room: 'engineering', act: 2 });
    const diag = await call('run_diagnostics', { subsystem: 'engines' });
    expect(diag.faults.join(' ')).toMatch(/fuse not seated/);
    const sensors = await call('read_sensors', { system: 'coolant' });
    expect(JSON.stringify(sensors)).toContain('FAULT');
    expect(buildTools()).toHaveLength(31);
  });
});
```

In `src/game/i18n.test.ts`, change the two `getSchematics()` calls to `getSchematics(0)`, and append:
```ts
  it('variant sheets keep their machine codes in pt-BR', () => {
    const S_PB = (() => { for (let s = 1; s < 5000; s++) if (variantFor(s, 'cryo_bay') === 1) return s; throw new Error('none'); })();
    const S_GC = (() => { for (let s = 1; s < 5000; s++) if (variantFor(s, 'engineering') === 1) return s; throw new Error('none'); })();
    setLocale('pt-BR');
    expect(getMaintenanceLog(S_PB)).toContain('P-7B');
    expect(getMaintenanceLog(S_PB)).toContain(String(variantSecretsFor(S_PB).cableBuses[2]));
    expect(getSchematics(S_GC).engine_feed).toContain(String(variantSecretsFor(S_GC).gearTeeth.target));
    setLocale('en');
  });
```
(add `variantFor, variantSecretsFor` to that file's imports from `./variants`.)

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/mcp/tools.test.ts src/game/i18n.test.ts`
Expected: FAIL — the log/schematics ignore the variant; `getSchematics` takes no argument.

- [ ] **Step 3: Narrative**

In `src/game/narrative.ts` (add `import { variantFor, variantSecretsFor } from './variants';`):

Add next to the maintenance-log templates:
```ts
function patchBayLogEn([r, g, b]: [number, number, number]): string {
  return (
    `PATCH BAY P-7B — aux power routes through three patched lines. RED → bus ${r}, GREEN → bus ${g}, BLUE → bus ${b}. ` +
    'Seat all three, then ENERGIZE. The panel forgives nothing and remembers less.'
  );
}
function patchBayLogPt([r, g, b]: [number, number, number]): string {
  return (
    `PAINEL DE REMENDOS P-7B — a energia auxiliar passa por três linhas remendadas. VERMELHO → barramento ${r}, VERDE → barramento ${g}, AZUL → barramento ${b}. ` +
    'Encaixe os três e depois ENERGIZE. O painel não perdoa nada e lembra menos ainda.'
  );
}
```
and replace `getMaintenanceLog`:
```ts
export function getMaintenanceLog(seed: number): string {
  if (variantFor(seed, 'cryo_bay') === 1) {
    const buses = variantSecretsFor(seed).cableBuses;
    return getLocale() === 'pt-BR' ? patchBayLogPt(buses) : patchBayLogEn(buses);
  }
  const order = secretsFor(seed).breakerSequence;
  return getLocale() === 'pt-BR' ? maintenanceLogPt(order) : maintenanceLogEn(order);
}
```

Replace `getSchematics` with a seed-aware version (the `SCHEMATICS`/`SCHEMATICS_PT` constants stay for variant 0):
```ts
function coilDriveSheets(seed: number): { engine_feed: string; coolant: string } {
  const v = variantSecretsFor(seed);
  const [a, b, c] = v.coilPhases;
  return getLocale() === 'pt-BR'
    ? {
        engine_feed:
          `ALIMENTAÇÃO DOS MOTORES — COIL DRIVE. Engrenagem de acoplamento: ${v.gearTeeth.target} dentes; duas iscas dividem a bandeja — conte os dentes, as plaquetas mentem. ` +
          `Fases das bobinas nos dials de 12 marcas: A ${a}, B ${b}, C ${c}.`,
        coolant:
          'REFRIGERAÇÃO — COLETOR AUTORREGULADO. Esta nave não tem válvulas a ajustar; o circuito se equilibra sozinho. Pela primeira vez, o barramento de sensores é honesto.',
      }
    : {
        engine_feed:
          `ENGINE FEED — COIL DRIVE. Coupling gear: ${v.gearTeeth.target} teeth; two decoys share the tray — count the teeth, the plates lie. ` +
          `Coil phases on the 12-mark dials: A ${a}, B ${b}, C ${c}.`,
        coolant:
          'COOLANT — SELF-REGULATING MANIFOLD. No valves to set on this ship; the loop balances itself. For once, the sensor bus is honest.',
      };
}

export function getSchematics(seed: number): Record<'power' | 'engine_feed' | 'coolant', string> {
  const base = getLocale() === 'pt-BR' ? SCHEMATICS_PT : SCHEMATICS;
  if (variantFor(seed, 'engineering') === 1) {
    return { ...base, ...coilDriveSheets(seed) };
  }
  return base;
}
```

- [ ] **Step 4: Tools**

In `src/mcp/tools.ts` (add `variantFor` to a new import from `'../game/variants'`; add `coilsCorrect, gearCorrect` to the derived import):
- `get_schematic` handler: `const schematics = getSchematics(s.seed);` (the handler already reads `s` for the core_rack branch).
- `run_diagnostics` engines block becomes variant-aware:
```ts
        if (sub === 'engines') {
          const faults: string[] = [];
          if (s.powerAllocation.engines < ENGINES_REQUIRED) faults.push(`insufficient start power (needs ${ENGINES_REQUIRED}u)`);
          if (variantFor(s.seed, 'engineering') === 1) {
            if (s.chapter1v.gear === null) faults.push('coupling gear not seated - physical selection required');
            else if (!gearCorrect(s)) faults.push('coupling gear seated but wrong tooth count - carries no torque');
            if (!coilsCorrect(s)) faults.push('coil phase out of alignment - see the engine feed schematic');
          } else {
            if (s.fuseInstalled === null) faults.push('engine feed fuse not seated - physical replacement required');
            else if (s.fuseInstalled !== CORRECT_FUSE) faults.push('engine feed fuse seated but wrong rating - carries no start current');
            if (!valvesCorrect(s)) faults.push('coolant valve settings out of spec - see coolant schematic');
          }
          return { ok: true, subsystem: sub, online: enginesOnline(s), faults };
        }
```
- `read_sensors` coolant branch:
```ts
        if (input.system === 'coolant') {
          if (variantFor(s.seed, 'engineering') === 1) {
            return {
              ok: true,
              system: 'coolant',
              channels: [
                { channel: 'manifold', reading: 'self-regulating', status: 'OK' },
                { channel: 'coolant_temp', reading: '311K', status: 'OK' },
              ],
            };
          }
          return {
            ok: true,
            system: 'coolant',
            channels: [
              { channel: 'manifold_pressure_1_3', reading: null, status: 'FAULT - sensor bus damaged; use the analog gauges on the manifold' },
              { channel: 'coolant_temp', reading: '311K', status: 'OK' },
            ],
          };
        }
```
(keep the existing object literal verbatim inside the else path.)

- [ ] **Step 5: Gate and commit**

Run: `npx vitest run && npm run build`
Expected: PASS (+4); build exit 0.
```bash
git add src/game/narrative.ts src/mcp/tools.ts src/mcp/tools.test.ts src/game/i18n.test.ts
git commit -m "feat: the log, schematics, diagnostics and sensors follow the ship's variants"
```

---

### Task 4: The patch bay — cryo bay swaps its puzzle panel

**Files:**
- Create: `src/scenes/PatchBay.tsx`
- Modify: `src/scenes/CryoBay.tsx`, `src/ui/strings.ts`
- Test: none new (the repo has no component tests; the store paths are covered by Task 2)

**Interfaces:**
- Consumes: `plugCable`, `energize` (Task 2); `variantFor` (Task 1); `useGame`, `useStrings`; `grateRemoved`/`removeGrate` (existing).
- Produces: `<PatchBay />`; `CryoBay` renders `VentGrate` until the grate is off, then `variantFor(seed, 'cryo_bay') === 1 ? <PatchBay /> : <AuxBreakers />`; `strings.cryo.{pbTitle, pbDesc, pbAria, pbCableAria, pbColours, pbBus, pbEmpty, pbEnergize, pbWrong}`.

Premium standard: an SVG patch panel — steel bezel and inset face, three cable spools on the left with coloured jacks (red/green/blue as scene-material literals, like hydroponics' soil), three brass bus sockets on the right with engraved `BUS 1–3` plates and lamps, woven bezier cables that sag when unplugged and pull taut when seated (the standard transition), an engraved `P-7B` plate; defs prefix `pb-`; `role="img"` + `aria-label`; per-cable cycle buttons and a real ENERGIZE button.

- [ ] **Step 1: Strings** (interface + EN + PT)

`cryo` gains:
```ts
    pbTitle: string; pbDesc: string; pbAria: string; pbCableAria: (colour: string) => string;
    pbColours: [string, string, string]; pbBus: string; pbEmpty: string; pbEnergize: string; pbWrong: string;
```
EN:
```ts
    pbTitle: 'Patch bay P-7B',
    pbDesc: 'Somebody rebuilt aux power out of spare cable and stubbornness. Three lines, three buses, and no label that survived. The wiring chart lives on the ship\'s side — ask your AI.',
    pbAria: 'Patch bay: three coloured cables into three bus sockets',
    pbCableAria: (colour) => `cycle the ${colour} cable's bus`,
    pbColours: ['RED', 'GREEN', 'BLUE'],
    pbBus: 'BUS',
    pbEmpty: '—',
    pbEnergize: 'ENERGIZE',
    pbWrong: 'The panel blinks once and goes dark. Wrong wiring; nothing trips, nothing forgives.',
```
PT:
```ts
    pbTitle: 'Painel de remendos P-7B',
    pbDesc: 'Alguém reconstruiu a energia auxiliar com cabo sobrando e teimosia. Três linhas, três barramentos, e nenhuma etiqueta sobreviveu. O mapa de fiação está do lado da nave — pergunte à sua IA.',
    pbAria: 'Painel de remendos: três cabos coloridos em três soquetes de barramento',
    pbCableAria: (colour) => `trocar o barramento do cabo ${colour}`,
    pbColours: ['VERMELHO', 'VERDE', 'AZUL'],
    pbBus: 'BUS',
    pbEmpty: '—',
    pbEnergize: 'ENERGIZE',
    pbWrong: 'O painel pisca uma vez e apaga. Fiação errada; nada desarma, nada perdoa.',
```
(`BUS`, `ENERGIZE` and `P-7B` are machine codes — identical in both locales.)

- [ ] **Step 2: Split the grate out of `BreakerPanel`**

In `src/scenes/CryoBay.tsx`, split the existing `BreakerPanel` into two components with the SAME JSX it has today: `VentGrate` (the `!grateRemoved` branch — title `t.cryo.ventGrate`, hum line, pull button) and `AuxBreakers` (the current breakers branch). `CryoBay` then renders:
```tsx
  const seed = useGame((s) => s.seed);
  const grateRemoved = useGame((s) => s.grateRemoved);
  const patchBay = variantFor(seed, 'cryo_bay') === 1;
  …
      {!grateRemoved ? <VentGrate /> : patchBay ? <PatchBay /> : <AuxBreakers />}
```
(imports: `variantFor` from `'../game/variants'`, `PatchBay` from `'./PatchBay'`. No behaviour change on variant 0.)

- [ ] **Step 3: The panel**

Create `src/scenes/PatchBay.tsx`:
```tsx
import { useState } from 'react';
import { useGame } from '../ui/useGame';
import { useStrings } from '../ui/useLocale';
import { energize, plugCable } from '../game/store';

// Scene-material colours for the three lines (like hydroponics' soil and water).
const CABLE_COLOURS = ['#c0392b', '#27ae60', '#3a7a8a'];
const JACK_Y = [38, 74, 110];
const SOCKET_Y = [38, 74, 110];

export function PatchBay() {
  const sockets = useGame((s) => s.chapter1v.sockets);
  const auxPower = useGame((s) => s.auxPower);
  const t = useStrings();
  const [wrong, setWrong] = useState(false);

  const cycle = (cable: 0 | 1 | 2) => {
    setWrong(false);
    // step null → 1 → 2 → 3 → null, skipping a bus held by another cable
    const order: (number | null)[] = [1, 2, 3, null];
    let idx = sockets[cable] === null ? order.length - 1 : order.indexOf(sockets[cable]);
    for (let n = 0; n < order.length; n++) {
      idx = (idx + 1) % order.length;
      const next = order[idx];
      if (next === null || !sockets.some((v, i) => i !== cable && v === next)) {
        plugCable(cable, next);
        return;
      }
    }
  };

  const press = () => setWrong(!energize().ok && !sockets.some((b) => b === null));

  return (
    <div className="panel">
      <h2>{t.cryo.pbTitle}</h2>
      {auxPower ? (
        <p className="status-ok">{t.cryo.auxOnline}</p>
      ) : (
        <>
          <p className="status-dim">{t.cryo.pbDesc}</p>
          <svg viewBox="0 0 320 150" width="100%" style={{ maxWidth: 520, display: 'block' }} role="img" aria-label={t.cryo.pbAria}>
            <defs>
              <linearGradient id="pb-brass" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--brass-hi)" />
                <stop offset="100%" stopColor="var(--brass-lo)" />
              </linearGradient>
            </defs>
            <rect x="4" y="4" width="312" height="142" rx="6" fill="var(--face)" stroke="var(--steel)" strokeWidth="3" />
            <rect x="10" y="10" width="300" height="130" rx="4" fill="var(--face-deep)" stroke="var(--line)" />
            {/* cable spools and jacks, left */}
            {CABLE_COLOURS.map((c, i) => (
              <g key={c}>
                <circle cx="38" cy={JACK_Y[i]} r="11" fill="var(--steel-lo)" stroke="var(--steel)" strokeWidth="2" />
                <circle cx="38" cy={JACK_Y[i]} r="5" fill={c} stroke="var(--hull)" />
                {/* the cable: taut bezier to its socket when seated, a loose sag when not */}
                {sockets[i] !== null ? (
                  <path d={`M 49 ${JACK_Y[i]} C 130 ${JACK_Y[i]}, 190 ${SOCKET_Y[sockets[i]! - 1]}, 258 ${SOCKET_Y[sockets[i]! - 1]}`}
                    fill="none" stroke={c} strokeWidth="4" strokeLinecap="round" style={{ transition: 'd 0.3s' }} />
                ) : (
                  <path d={`M 49 ${JACK_Y[i]} C 90 ${JACK_Y[i] + 26}, 110 ${JACK_Y[i] + 30}, 120 ${JACK_Y[i] + 18}`}
                    fill="none" stroke={c} strokeWidth="4" strokeLinecap="round" opacity="0.7" />
                )}
              </g>
            ))}
            {/* bus sockets, right */}
            {[0, 1, 2].map((b) => (
              <g key={b}>
                <circle cx="266" cy={SOCKET_Y[b]} r="10" fill="url(#pb-brass)" stroke="var(--brass-lo)" strokeWidth="2" />
                <circle cx="266" cy={SOCKET_Y[b]} r="4" fill="var(--face-deep)" />
                <rect x="282" y={SOCKET_Y[b] - 8} width="30" height="16" rx="2" fill="var(--panel-solid)" stroke="var(--line)" />
                <text x="297" y={SOCKET_Y[b] + 3.5} textAnchor="middle" fontSize="7" fill="var(--text)" letterSpacing="1">{t.cryo.pbBus} {b + 1}</text>
                <circle cx="266" cy={SOCKET_Y[b] - 16} r="3" fill={auxPower ? 'var(--green)' : 'var(--face)'} stroke="var(--steel)" strokeWidth="0.75" />
              </g>
            ))}
            <rect x="18" y="128" width="44" height="13" rx="2" fill="var(--panel-solid)" stroke="var(--line)" />
            <text x="40" y="137.5" textAnchor="middle" fontSize="7" fill="var(--text)" letterSpacing="2">P-7B</text>
          </svg>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
            {t.cryo.pbColours.map((colour, i) => (
              <button key={colour} onClick={() => cycle(i as 0 | 1 | 2)} aria-label={t.cryo.pbCableAria(colour)}
                style={{ borderColor: CABLE_COLOURS[i], color: 'var(--text)' }}>
                {colour}: {sockets[i] === null ? t.cryo.pbEmpty : `${t.cryo.pbBus} ${sockets[i]}`}
              </button>
            ))}
            <button onClick={press} style={{ borderColor: 'var(--amber)' }}>{t.cryo.pbEnergize}</button>
          </div>
          {wrong && <p className="status-bad" style={{ marginTop: 8 }}>{t.cryo.pbWrong}</p>}
        </>
      )}
    </div>
  );
}
```
(The incomplete-circuit press keeps the store's refusal but shows no scene error — the missing cable is visible; `pbWrong` shows only on a full, wrong wiring.)

- [ ] **Step 4: Gate and commit**

Run: `npx vitest run && npm run build`
```bash
git add src/scenes/PatchBay.tsx src/scenes/CryoBay.tsx src/ui/strings.ts
git commit -m "feat: patch bay P-7B — the cryo bay's variant puzzle panel"
```

---

### Task 5: Coils and gear — engineering swaps its puzzle panels

**Files:**
- Create: `src/scenes/GearAndCoils.tsx`
- Modify: `src/scenes/Engineering.tsx`, `src/ui/strings.ts`
- Test: none new (store paths covered by Task 2)

**Interfaces:**
- Consumes: `seatGear`, `setPhase` (Task 2); `variantFor`, `variantSecretsFor` (Task 1 — the tray renders the three tooth counts; correctness stays in the store/derived).
- Produces: `<GearAndCoils />`; `Engineering` renders `variantFor(seed, 'engineering') === 1 ? <GearAndCoils /> : <><FuseBox /><CoolantManifold /></>` (PowerBoard, gauges and the bridge door stay); `strings.eng.{gcTitle, gcDesc, gcTrayAria, gcGearAria, gcSeat, gcSeated, gcCoil, gcPhaseAria, gcCoilsTitle, gcCoilsDesc}`.

Premium standard: the gear tray follows the fuse tray's mould — three gears drawn with REAL teeth (triangular teeth around the rim; counting them is the puzzle, like the fuse bands; `gearTeeth` from `variantSecretsFor` gives the counts to draw), brass hubs, and small engraved plates that LIE (each gear's plate shows a neighbour's count — deterministic rotation, so the plates never accidentally tell the truth); the seated gear sits in a coupling cradle with a lamp. The coils are three rotary dials: a 12-mark clock face (engraved marks, a brass needle at the current phase) with up/down buttons. Defs prefix `gc-`.

- [ ] **Step 1: Strings** (interface + EN + PT)

`eng` gains:
```ts
    gcTitle: string; gcDesc: string; gcTrayAria: string; gcGearAria: (teeth: number) => string; gcSeat: string; gcSeated: string;
    gcCoilsTitle: string; gcCoilsDesc: string; gcCoil: (label: string) => string; gcPhaseAria: (label: string) => string;
```
EN:
```ts
    gcTitle: 'Engine feed — coil drive',
    gcDesc: 'No fuse on this ship: a coupling gear and three induction coils. Three gears in the tray, plates stamped by a liar — count the teeth yourself. The right count is paperwork, and paperwork is your AI\'s side.',
    gcTrayAria: 'Gear tray: three coupling gears with countable teeth',
    gcGearAria: (teeth) => `coupling gear with ${teeth} teeth`,
    gcSeat: 'seat it',
    gcSeated: 'seated',
    gcCoilsTitle: 'Induction coils',
    gcCoilsDesc: 'Three coils, twelve marks each, no numbers. The phases are on the schematic — the ship\'s side again.',
    gcCoil: (label) => `COIL ${label}`,
    gcPhaseAria: (label) => `coil ${label} phase dial`,
```
PT:
```ts
    gcTitle: 'Alimentação dos motores — coil drive',
    gcDesc: 'Nesta nave não há fusível: uma engrenagem de acoplamento e três bobinas de indução. Três engrenagens na bandeja, plaquetas carimbadas por um mentiroso — conte os dentes você mesmo. A contagem certa é papelada, e papelada é o lado da sua IA.',
    gcTrayAria: 'Bandeja de engrenagens: três engrenagens de acoplamento com dentes contáveis',
    gcGearAria: (teeth) => `engrenagem de acoplamento com ${teeth} dentes`,
    gcSeat: 'encaixar',
    gcSeated: 'encaixada',
    gcCoilsTitle: 'Bobinas de indução',
    gcCoilsDesc: 'Três bobinas, doze marcas cada, nenhum número. As fases estão no esquema — o lado da nave, de novo.',
    gcCoil: (label) => `COIL ${label}`,
    gcPhaseAria: (label) => `dial de fase da bobina ${label}`,
```

- [ ] **Step 2: The panel**

Create `src/scenes/GearAndCoils.tsx`:
```tsx
import { useGame } from '../ui/useGame';
import { useStrings } from '../ui/useLocale';
import { seatGear, setPhase } from '../game/store';
import { enginesOnline } from '../game/derived';
import { variantSecretsFor } from '../game/variants';

function GearGlyph({ cx, cy, r, teeth, seated }: { cx: number; cy: number; r: number; teeth: number; seated: boolean }) {
  // real, countable teeth: one triangular tooth per count around the rim
  const pts: string[] = [];
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * 2 * Math.PI;
    const a1 = ((i + 0.5) / teeth) * 2 * Math.PI;
    const a2 = ((i + 1) / teeth) * 2 * Math.PI;
    pts.push(`${cx + r * Math.cos(a0)},${cy + r * Math.sin(a0)}`);
    pts.push(`${cx + (r + 6) * Math.cos(a1)},${cy + (r + 6) * Math.sin(a1)}`);
    pts.push(`${cx + r * Math.cos(a2)},${cy + r * Math.sin(a2)}`);
  }
  return (
    <g>
      <polygon points={pts.join(' ')} fill="url(#gc-steel)" stroke={seated ? 'var(--amber)' : 'var(--steel)'} strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r={r - 8} fill="var(--face)" stroke="var(--line)" />
      <circle cx={cx} cy={cy} r="5" fill="url(#gc-brass)" stroke="var(--brass-lo)" />
    </g>
  );
}

function PhaseDial({ label, value, onChange, aria }: { label: string; value: number; onChange: (v: number) => void; aria: string }) {
  const a = (value / 12) * 2 * Math.PI - Math.PI / 2;
  return (
    <div style={{ textAlign: 'center' }}>
      <svg viewBox="0 0 80 92" width="88" role="img" aria-label={`${aria}: ${value}`}>
        <circle cx="40" cy="40" r="34" fill="var(--face)" stroke="var(--steel)" strokeWidth="3" />
        <circle cx="40" cy="40" r="29" fill="var(--face-deep)" stroke="var(--line)" />
        {Array.from({ length: 12 }, (_, i) => {
          const t = (i / 12) * 2 * Math.PI - Math.PI / 2;
          const major = i % 3 === 0;
          return <line key={i} x1={40 + 24 * Math.cos(t)} y1={40 + 24 * Math.sin(t)} x2={40 + (major ? 18 : 21) * Math.cos(t)} y2={40 + (major ? 18 : 21) * Math.sin(t)} stroke={major ? 'var(--steel-hi)' : 'var(--steel-mid)'} strokeWidth={major ? 2 : 1} />;
        })}
        <line x1="40" y1="40" x2={40 + 20 * Math.cos(a)} y2={40 + 20 * Math.sin(a)} stroke="var(--amber)" strokeWidth="2.5" style={{ transition: 'x2 0.2s, y2 0.2s' }} />
        <circle cx="40" cy="40" r="3.5" fill="var(--steel-lo)" stroke="var(--steel)" />
        <rect x="22" y="76" width="36" height="13" rx="2" fill="var(--panel-solid)" stroke="var(--line)" />
        <text x="40" y="85.5" textAnchor="middle" fontSize="7" fill="var(--text)" letterSpacing="1">{label}</text>
      </svg>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
        <button onClick={() => onChange((value + 11) % 12)} aria-label={`${aria} −`} style={{ padding: '2px 10px' }}>▼</button>
        <button onClick={() => onChange((value + 1) % 12)} aria-label={`${aria} +`} style={{ padding: '2px 10px' }}>▲</button>
      </div>
    </div>
  );
}

export function GearAndCoils() {
  const seed = useGame((s) => s.seed);
  const gear = useGame((s) => s.chapter1v.gear);
  const phases = useGame((s) => s.chapter1v.phases);
  const online = useGame((s) => enginesOnline(s));
  const t = useStrings();
  const v = variantSecretsFor(seed);
  const tray = [v.gearTeeth.target, ...v.gearTeeth.decoys];
  // the engraved plates lie: each gear wears a neighbour's count
  const plates = [tray[1], tray[2], tray[0]];
  return (
    <>
      <div className="panel">
        <h2>{t.eng.gcTitle}</h2>
        <p className="status-dim">{t.eng.gcDesc}</p>
        <svg viewBox="0 0 320 110" width="100%" style={{ maxWidth: 520, display: 'block' }} role="img" aria-label={t.eng.gcTrayAria}>
          <defs>
            <linearGradient id="gc-steel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--steel-hi)" />
              <stop offset="100%" stopColor="var(--steel-lo)" />
            </linearGradient>
            <linearGradient id="gc-brass" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--brass-hi)" />
              <stop offset="100%" stopColor="var(--brass-lo)" />
            </linearGradient>
          </defs>
          <rect x="4" y="4" width="312" height="102" rx="6" fill="var(--face)" stroke="var(--steel)" strokeWidth="3" />
          {tray.map((teeth, i) => (
            <g key={teeth}>
              <GearGlyph cx={62 + i * 98} cy={48} r={24} teeth={teeth} seated={gear === teeth} />
              <rect x={44 + i * 98} y="84" width="36" height="13" rx="2" fill="var(--panel-solid)" stroke="var(--line)" />
              <text x={62 + i * 98} y="93.5" textAnchor="middle" fontSize="7" fill="var(--dim)" letterSpacing="1">{plates[i]}T</text>
            </g>
          ))}
        </svg>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
          {tray.map((teeth) => (
            <button key={teeth} onClick={() => seatGear(teeth)} disabled={gear === teeth} aria-label={t.eng.gcGearAria(teeth)}>
              {gear === teeth ? t.eng.gcSeated : t.eng.gcSeat}
            </button>
          ))}
        </div>
      </div>
      <div className="panel">
        <h2>{t.eng.gcCoilsTitle}</h2>
        <p className="status-dim">{t.eng.gcCoilsDesc}</p>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          {(['A', 'B', 'C'] as const).map((label, i) => (
            <PhaseDial key={label} label={t.eng.gcCoil(label)} value={phases[i]} aria={t.eng.gcPhaseAria(label)}
              onChange={(val) => setPhase(i as 0 | 1 | 2, val)} />
          ))}
        </div>
        {online && <p className="status-ok">{t.eng.enginesHum}</p>}
      </div>
    </>
  );
}
```
**Deliberate rule:** the tray buttons carry the aria with the REAL tooth count (accessibility parity — a screen-reader user must be able to count too), and the visible plates lie by rotation. No per-gear "correct" styling before seating; the seated ring is amber regardless of correctness (diagnostics tell the truth, that is the agent's job).

- [ ] **Step 3: The swap**

In `src/scenes/Engineering.tsx`: import `variantFor` and `GearAndCoils`; in `Engineering()`:
```tsx
  const seed = useGame((s) => s.seed);
  const coilDrive = variantFor(seed, 'engineering') === 1;
  …
      <PowerBoard />
      {coilDrive ? <GearAndCoils /> : <><FuseBox /><CoolantManifold /></>}
```
(The gauges live inside `CoolantManifold`, so a coil-drive ship shows none — its manifold is self-regulating; the schematic and sensors say so.)

- [ ] **Step 4: Gate and commit**

Run: `npx vitest run && npm run build`
```bash
git add src/scenes/GearAndCoils.tsx src/scenes/Engineering.tsx src/ui/strings.ts
git commit -m "feat: coil drive — engineering's variant puzzle panels"
```

---

### Task 6: Drift correction — the bridge swaps its viewport

**Files:**
- Create: `src/scenes/DriftViewport.tsx`
- Modify: `src/scenes/Bridge.tsx`, `src/ui/strings.ts`
- Test: none new (the trajectory path is covered by Task 2)

**Interfaces:**
- Consumes: `takeStarFix` (existing), `variantSecretsFor` (Task 1); `starFixTaken` from the store.
- Produces: `<DriftViewport />`; `Bridge` renders `variantFor(seed, 'bridge') === 1 ? <DriftViewport /> : <Viewport />`; `strings.bridge.{dvTitle, dvDesc, dvAria, dvPitchAria, dvYawAria, dvLocked}`.

Premium standard: reuses the shipped viewport's visual language — the same deterministic star field constant, nebula, vignette, glass crack, bezel — with an amber "runner" target on a deterministic lissajous path and a two-axis reticle. Motion is the puzzle, so under `prefers-reduced-motion` the runner slows to ~40% instead of stopping (a note in the code says why). Defs prefix `dv-` (its own copies of the clip/nebula/vignette gradients — ids never shared across scene files).

- [ ] **Step 1: Strings** (interface + EN + PT)

`bridge` gains:
```ts
    dvTitle: string; dvDesc: string; dvAria: string; dvPitchAria: string; dvYawAria: string; dvLocked: string;
```
EN:
```ts
    dvTitle: 'Viewport — drift tracker',
    dvDesc: 'The nav cameras are dead and this ship\'s reference beacon will not sit still. Walk the reticle onto the runner with pitch and yaw; when the ring bites, three codes resolve under it. Read them to your AI, left to right.',
    dvAria: 'star field with a drifting runner and a two-axis reticle',
    dvPitchAria: 'reticle pitch',
    dvYawAria: 'reticle yaw',
    dvLocked: 'Reticle bite. Three codes resolve under the runner.',
```
PT:
```ts
    dvTitle: 'Viewport — rastreador de deriva',
    dvDesc: 'As câmeras de navegação morreram e o farol de referência desta nave não para quieto. Leve o retículo até o fugitivo com pitch e yaw; quando o anel morder, três códigos se resolvem embaixo dele. Leia para a sua IA, da esquerda para a direita.',
    dvAria: 'campo de estrelas com um fugitivo à deriva e um retículo de dois eixos',
    dvPitchAria: 'pitch do retículo',
    dvYawAria: 'yaw do retículo',
    dvLocked: 'O anel mordeu. Três códigos se resolvem sob o fugitivo.',
```

- [ ] **Step 2: The panel**

Create `src/scenes/DriftViewport.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { useGame } from '../ui/useGame';
import { useStrings } from '../ui/useLocale';
import { takeStarFix } from '../game/store';
import { variantSecretsFor } from '../game/variants';

// Same deterministic star field as the parallax viewport (kept in sync by eye,
// not imported: the two panels are alternatives, never rendered together).
const STARS = Array.from({ length: 42 }, (_, i) => ({
  x: ((i * 97.3 + 11) % 460) - 30,
  y: (i * 57.7 + 23) % 160,
  r: 0.6 + ((i * 37) % 10) / 9,
  o: 0.25 + ((i * 53) % 10) / 18,
}));

// The runner's path: a deterministic lissajous over the tick counter.
function runnerAt(tick: number): { x: number; y: number } {
  return { x: 200 + 92 * Math.sin(tick * 0.055), y: 74 + 42 * Math.sin(tick * 0.083 + 1.2) };
}

export function DriftViewport() {
  const taken = useGame((s) => s.starFixTaken);
  const seed = useGame((s) => s.seed);
  const t = useStrings();
  const [pitch, setPitch] = useState(50);
  const [yaw, setYaw] = useState(50);
  const [tick, setTick] = useState(0);
  const reducedMotion =
    typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (taken) return;
    // Motion IS the puzzle here, so reduced-motion slows the runner (~40%)
    // rather than freezing it — a frozen target would gut the fix.
    const step = reducedMotion ? 0.4 : 1;
    const timer = setInterval(() => setTick((n) => n + step), 100);
    return () => clearInterval(timer);
  }, [taken, reducedMotion]);

  const runner = runnerAt(tick);
  const rx = 60 + (yaw / 100) * 280;
  const ry = 18 + (pitch / 100) * 112;
  const dist = Math.hypot(runner.x - rx, runner.y - ry);
  const locked = dist < 12;

  useEffect(() => {
    if (locked && !taken) takeStarFix();
  }, [locked, taken]);

  const codes = variantSecretsFor(seed).driftFix;

  return (
    <div className="panel">
      <h2>{t.bridge.dvTitle}</h2>
      <p className="status-dim">{t.bridge.dvDesc}</p>
      <svg viewBox="0 0 400 160" width="100%" role="img" aria-label={t.bridge.dvAria}>
        <defs>
          <clipPath id="dv-clip"><rect width="400" height="160" rx="10" /></clipPath>
          <radialGradient id="dv-nebula" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#2a4a3f" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#2a4a3f" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="dv-vignette" cx="0.5" cy="0.5" r="0.72">
            <stop offset="55%" stopColor="#000000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.55" />
          </radialGradient>
        </defs>
        <g clipPath="url(#dv-clip)">
          <rect width="400" height="160" fill="#05080a" />
          <ellipse cx="315" cy="30" rx="150" ry="70" fill="url(#dv-nebula)" />
          {STARS.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#9fb3a8" opacity={s.o} />
          ))}
          {/* the runner */}
          <g style={{ transition: 'transform 0.1s linear' }} transform={`translate(${runner.x}, ${runner.y})`}>
            <circle className="beacon-halo" r="8" fill="var(--amber)" opacity="0.18" />
            <circle r="3" fill="var(--amber)" />
            <line x1="-7" y1="0" x2="7" y2="0" stroke="var(--amber)" strokeWidth="1" opacity="0.4" />
          </g>
          {/* codes engrave once the ring has bitten */}
          {taken && codes.map((c, i) => (
            <g key={c + i}>
              <rect x={140 + i * 46} y="128" width="36" height="16" rx="2" fill="var(--panel-solid)" stroke="var(--line)" />
              <text x={158 + i * 46} y="140" textAnchor="middle" fontSize="10" fill="var(--green)" letterSpacing="2">{c}</text>
            </g>
          ))}
          <rect width="400" height="160" fill="url(#dv-vignette)" />
          <g stroke="#9fb3a8" fill="none" strokeWidth="1">
            <path d="M 400 10 L 354 27 L 319 36" opacity="0.16" />
            <path d="M 388 0 L 354 27" opacity="0.12" />
          </g>
          {/* the two-axis reticle */}
          <g stroke={locked || taken ? 'var(--green)' : 'var(--dim)'} style={{ transition: 'stroke 0.3s' }}>
            {(locked || taken) && <circle cx={rx} cy={ry} r="20" fill="none" stroke="var(--green)" strokeWidth="4" opacity="0.2" />}
            <circle cx={rx} cy={ry} r="20" fill="none" strokeDasharray="5 4" strokeWidth="1.5" />
            <line x1={rx} y1={ry - 27} x2={rx} y2={ry - 21} strokeWidth="1.5" />
            <line x1={rx} y1={ry + 21} x2={rx} y2={ry + 27} strokeWidth="1.5" />
            <line x1={rx - 27} y1={ry} x2={rx - 21} y2={ry} strokeWidth="1.5" />
            <line x1={rx + 21} y1={ry} x2={rx + 27} y2={ry} strokeWidth="1.5" />
          </g>
        </g>
        <rect x="1" y="1" width="398" height="158" rx="10" fill="none" stroke="#2a3a30" strokeWidth="2" />
      </svg>
      <input type="range" min={0} max={100} value={yaw} onChange={(e) => setYaw(Number(e.target.value))}
        style={{ width: '100%' }} aria-label={t.bridge.dvYawAria} />
      <input type="range" min={0} max={100} value={pitch} onChange={(e) => setPitch(Number(e.target.value))}
        style={{ width: '100%' }} aria-label={t.bridge.dvPitchAria} />
      {taken && <p className="status-ok">{t.bridge.dvLocked}</p>}
    </div>
  );
}
```
(`#2a3a30` on the outer bezel is `var(--line)`'s value — use `var(--line)`; the sky/star colours are scene-material literals shared with the parallax viewport.)

- [ ] **Step 3: The swap**

In `src/scenes/Bridge.tsx`: import `variantFor` and `DriftViewport`; in `Bridge()`:
```tsx
  const seed = useGame((s) => s.seed);
  …
      {variantFor(seed, 'bridge') === 1 ? <DriftViewport /> : <Viewport />}
```
(`Bridge` already calls `useStrings`; add the `useGame` import usage. No other change.)

- [ ] **Step 4: Gate and commit**

Run: `npx vitest run && npm run build`
```bash
git add src/scenes/DriftViewport.tsx src/scenes/Bridge.tsx src/ui/strings.ts
git commit -m "feat: drift tracker — the bridge's variant viewport"
```

---

### Task 7: Docs, preview, playthrough, merge

- [ ] **Step 1:** `README.md`: in the "Every ship is unique" bullet, add that ships also differ in structure — a seed may roll a patch bay instead of breakers, a coil drive instead of a fuse, a drifting fix instead of a parallax fix; update the test count to the real total printed by `npx vitest run`. Append to the spec: "**Shipped <date>** — <tests> tests; chapter-1 structural variants live." Commit.
- [ ] **Step 2:** Find a demo seed that rolls all three variants and one that rolls none, and put both in the walkthrough message (the PRNG is self-contained — run):
```bash
node -e '
function prng(seed){let a=seed>>>0;return()=>{a=(a+0x6d2b79f5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;}}
const SALTS={cryo_bay:0x1a2b3c4d,engineering:0x5e6f7a8b,bridge:0x0c9d1e2f};
const v=(seed,room)=>prng((seed^SALTS[room])>>>0)()<0.5?0:1;
let all=null,none=null;
for(let s=1;s<5000&&(!all||!none);s++){const r=[v(s,"cryo_bay"),v(s,"engineering"),v(s,"bridge")];if(!all&&r.every(x=>x===1))all=s;if(!none&&r.every(x=>x===0))none=s;}
console.log("all variants:",all,"| no variants:",none);'
```
- [ ] **Step 3:** Push `directors-cut`, deploy a preview (`npx vercel --yes`), and hand Mario the walkthrough: start a ship with the all-variants seed (the title screen has no seed picker — use the console: `localStorage.removeItem('derelict-save-v2')` then in the app `?` — the store exposes no seed entry; instead instruct: open the game, then in the console run the reset with the demo seed via the exposed store if available, or simply "Abandon previous run" repeatedly until a variant ship rolls (~1 in 8 for all three; each roll is fresh) — AND check the classic ship (seed 0 via an old save or the printed no-variant seed) is pixel-identical. The pragmatic script: (a) fresh runs until the patch bay appears — wire it wrong once (the panel goes dark), ask the agent for the chart, wire it right; (b) a coil-drive engineering: count teeth (the plates lie), ask the agent for the schematic, set phases, engines hum, no valves anywhere; (c) a drift bridge: track the runner, read the codes, `compute_escape_trajectory` accepts them; (d) one full classic ship untouched.
- [ ] **Step 4:** Merge and deploy:
```bash
git checkout main && git merge directors-cut --no-edit && npx vitest run && npm run build && git push origin main && npx vercel --prod --yes
git checkout directors-cut && git merge main && git push origin directors-cut
```
- [ ] **Step 5:** Update the project memory (Plan F shipped; F2 — chapter 2–3 variants — is the natural next candidate).
