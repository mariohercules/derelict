# Remixed Ships, Chapter 3 — Plan F3 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the two chapter-3 puzzle rooms a second puzzle chosen by seed — a **sequenced rack** in the core vault (loading order instead of cradle position) and a **dead-encoder dish** at the comms array (the agent reads signal strength instead of the bearing) — while the classic ship, every existing variant draw, and the agent's tool contract stay byte-for-byte identical.

**Architecture:** `src/game/variants.ts` grows two rooms with two new salts and **no new secret** (both variants reuse the classic secret of their room: `columnOrder`, `beaconBearing`). One new persisted slice `chapter3v { seated: ColumnId[] }` holds the sequenced rack's loading order; `rackCorrect` branches on the ship so every downstream gate (`seatKernel`, `read_prime_cache`, `query_fragment_memory`, `cacheRead → openBand`, RESTORE/BROADCAST) is untouched. A pure `beaconSignalFor(seed, dish)` in `derived.ts` feeds the `listen_beacon` handler's variant payload. Scenes swap only the puzzle panel (`SequencedRack` for `Rack`; `Dish` branches its readouts); tools keep their names, schemas and descriptions.

**Tech Stack:** React 19 + TypeScript + Vite, Zustand, Vitest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-31-derelict-remixed-ships-chapter3-design.md` (§3 derivation, §4 state + actions, §5 puzzles, §6 agent surface, §7 scenes, §8 persistence, §9 testing). Base: `directors-cut` @ `f08f5ba` (= `main` `7def2a6` + the spec; 271 tests, 31 tools).

## Global Constraints

- **The classic ship is untouchable:** `variantFor(0, room) === 0` for all eight rooms; on variant 0 every action, tool payload, narrative string and scene is exactly as shipped. `store.ch3.test.ts` stays green untouched. `secretsFor` is not edited.
- **No new secret draw:** `variantSecretsFor` is not edited; `FROZEN_VARIANT_8` stays green untouched.
- **No tool contract change:** no tool added, renamed, re-described or re-schemed; `buildTools()` stays 31; the snapshot test `src/mcp/__snapshots__/tools.test.ts.snap` stays green (only handler bodies change). Machine values (the ` · ` order string, `signal_strength`, `error_axis`) identical across locales.
- `chapter3v` is persisted; `validShape` validates it by shape when present (`seated`: array of at most 4 distinct `ColumnId`s); a save without it is filled after validation — `[]`, or `columnOrder` when the save already proves the rack (`kernelSeated || cacheRead || fragmentStage > 0`).
- **The scene never reads a secret before the puzzle reveals it:** `SequencedRack` reads only `chapter3v.seated`, `kernelSeated` and `rackCorrect`; `Dish` on a dead-encoder ship renders no degree value anywhere (text, aria-label, aria-valuetext).
- **Premium graphics standard (non-negotiable):** SVG instruments with bezels and inset faces; deterministic geometry (no randomness at render); palette tokens (`--steel*`, `--face*`, `--brass*`, `--parchment`, `--amber`, `--green`, `--red`, `--hull`, `--panel-solid`, `--line`, `--dim`, `--text`); transitions only (the global reduced-motion rule covers them); defs prefix `sr-` defined once (`Dish` reuses its existing `ca-` defs); `role="img"` + `aria-label` from strings; real `<button>`/`<input>` controls with aria-labels.
- All player-facing text in both locales in `src/ui/strings.ts` (a key missing in either locale fails `tsc`); agent-facing text English, in-fiction, anti-deflection (the refusal names the human's next physical step).
- Branch `directors-cut`; merge to `main` + prod deploy in Task 6 only after Mario's preview playthrough and explicit "aprovado".
- Commit messages end with a blank line then `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Verification gate for every commit: `npx vitest run && npm run build` both exit 0 (judge on exit codes).

---

### Task 1: Two more rooms, `beaconSignalFor`, the `chapter3v` slice, and persistence

**Files:**
- Modify: `src/game/variants.ts` (the `VariantRoom` type and `ROOM_SALTS` only), `src/game/derived.ts` (one new function), `src/game/types.ts`, `src/game/store.ts` (imports + `initialState` only), `src/game/persist.ts`
- Test: `src/game/variants.test.ts` (extend), `src/game/derived.test.ts` (create), `src/game/persist.test.ts` (append)

**Interfaces:**
- Consumes: `secretsFor(seed).beaconBearing / .columnOrder`, `DISH_TOLERANCE` (existing).
- Produces: `VariantRoom` (eight rooms); `beaconSignalFor(seed, dish: { az: number; el: number }): { strength: number; axis: 'az' | 'el' | 'both' }`; `Chapter3VariantState { seated: ColumnId[] }`; `GameState.chapter3v`; `initialState().chapter3v = { seated: [] }`; persist validation + fill.

- [ ] **Step 1: Failing tests**

In `src/game/variants.test.ts` change the `ROOMS` constant to eight rooms:

```ts
const ROOMS: VariantRoom[] = ['cryo_bay', 'engineering', 'bridge', 'crew_quarters', 'hydroponics', 'cargo_bay', 'core_vault', 'comms_array'];
```

(The four `variantFor` tests now cover eight rooms; `FROZEN_VARIANT_8` and the `variantSecretsFor` tests are untouched.)

Create `src/game/derived.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { beaconSignalFor } from './derived';
import { secretsFor } from './secrets';

describe('beaconSignalFor — the agent as the meter', () => {
  const target = secretsFor(0).beaconBearing; // classic ship: AZ 217 / EL 34

  it('reads full strength on the bearing and nothing 180 degrees away', () => {
    expect(beaconSignalFor(0, { az: target.az, el: target.el }).strength).toBe(100);
    expect(beaconSignalFor(0, { az: target.az - 180, el: target.el }).strength).toBe(0);
  });

  it('is strictly stronger when strictly closer along one axis', () => {
    const far = beaconSignalFor(0, { az: target.az, el: target.el + 30 }).strength;
    const near = beaconSignalFor(0, { az: target.az, el: target.el + 10 }).strength;
    const lock = beaconSignalFor(0, { az: target.az, el: target.el + 3 }).strength;
    expect(near).toBeGreaterThan(far);
    expect(lock).toBeGreaterThan(near);
    expect(lock).toBeGreaterThanOrEqual(98);
  });

  it('names the axis whose error dominates by more than the lock tolerance', () => {
    expect(beaconSignalFor(0, { az: target.az + 20, el: target.el }).axis).toBe('az');
    expect(beaconSignalFor(0, { az: target.az, el: target.el + 20 }).axis).toBe('el');
    expect(beaconSignalFor(0, { az: target.az + 5, el: target.el + 5 }).axis).toBe('both');
    expect(beaconSignalFor(0, { az: target.az + 12, el: target.el + 10 }).axis).toBe('both');
  });

  it('is pure and deterministic for a seeded ship', () => {
    const t = secretsFor(4).beaconBearing;
    expect(beaconSignalFor(4, { az: t.az, el: t.el })).toEqual({ strength: 100, axis: 'both' });
    expect(beaconSignalFor(4, { az: 0, el: 0 })).toEqual(beaconSignalFor(4, { az: 0, el: 0 }));
  });
});
```

Append to `src/game/persist.test.ts`, inside `describe('persistence', …)` after the `fills chapter2v…` test:

```ts
  it('fills chapter3v for an older save — empty, or the proven order — and rejects malformed shapes', () => {
    const older = { ...initialState(0) } as Record<string, unknown>;
    delete older.chapter3v;
    storage.set(SAVE_KEY, JSON.stringify(older));
    expect(loadSavedState()?.chapter3v).toEqual({ seated: [] });
    // a save that already proved the rack keeps it proven on a ship that now sequences it
    for (const proof of [{ kernelSeated: true }, { cacheRead: true }, { fragmentStage: 2 }]) {
      const proven = { ...initialState(0), chapter3: { ...initialState(0).chapter3, ...proof } } as Record<string, unknown>;
      delete proven.chapter3v;
      storage.set(SAVE_KEY, JSON.stringify(proven));
      expect(loadSavedState()?.chapter3v.seated).toEqual([...secretsFor(0).columnOrder]);
    }
    const base = initialState(0);
    storage.set(SAVE_KEY, JSON.stringify({ ...base, chapter3v: { seated: ['A', 'B', 'C', 'D', 'A'] } }));
    expect(loadSavedState()).toBeNull();
    storage.set(SAVE_KEY, JSON.stringify({ ...base, chapter3v: { seated: ['A', 'A'] } }));
    expect(loadSavedState()).toBeNull();
    storage.set(SAVE_KEY, JSON.stringify({ ...base, chapter3v: { seated: ['E'] } }));
    expect(loadSavedState()).toBeNull();
    storage.set(SAVE_KEY, JSON.stringify({ ...base, chapter3v: { seated: 'CADB' } }));
    expect(loadSavedState()).toBeNull();
    storage.set(SAVE_KEY, JSON.stringify({ ...base, chapter3v: { seated: ['C', 'A'] } }));
    expect(loadSavedState()?.chapter3v.seated).toEqual(['C', 'A']);
  });
```

and add `import { secretsFor } from './secrets';` to the persist test imports.

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/game/variants.test.ts src/game/derived.test.ts src/game/persist.test.ts`
Expected: `derived.test.ts` FAILS (`beaconSignalFor` is not exported) and the new persist test FAILS (`chapter3v` is undefined). The widened `ROOMS` in `variants.test.ts` may pass at runtime (Vitest does not type-check; an unknown room XORs the seed with `undefined`) — its failure is the `tsc` error `npm run build` would raise until Step 3 lands.

- [ ] **Step 3: The two rooms**

In `src/game/variants.ts` change the type and the salts table:

```ts
export type VariantRoom =
  | 'cryo_bay' | 'engineering' | 'bridge'
  | 'crew_quarters' | 'hydroponics' | 'cargo_bay'
  | 'core_vault' | 'comms_array';

const ROOM_SALTS: Record<VariantRoom, number> = {
  cryo_bay: 0x1a2b3c4d,
  engineering: 0x5e6f7a8b,
  bridge: 0x0c9d1e2f,
  crew_quarters: 0x3d7e9a51,
  hydroponics: 0x92b4c6e8,
  cargo_bay: 0x4f81d2a7,
  core_vault: 0x6c2e8f13,
  comms_array: 0xa17d4b59,
};
```

Nothing else in the file changes — `variantSecretsFor`, `DRAWINGS`, `tiersFor` and the append-point comment stay as they are.

- [ ] **Step 4: `beaconSignalFor` in `src/game/derived.ts`**

After `dishAligned` add:

```ts
// Plan F3 (comms variant): the array's encoders are dead, so the agent is the
// meter. Strength falls linearly with the angular distance to the carrier — no
// azimuth wrap, the same arithmetic as dishAligned; axis names the error that
// dominates by more than the lock tolerance.
export function beaconSignalFor(seed: number, dish: { az: number; el: number }): { strength: number; axis: 'az' | 'el' | 'both' } {
  const target = secretsFor(seed).beaconBearing;
  const daz = Math.abs(dish.az - target.az);
  const del = Math.abs(dish.el - target.el);
  const dist = Math.sqrt(daz * daz + del * del);
  const strength = Math.round(100 * (1 - Math.min(1, dist / 180)));
  const axis = daz > del + DISH_TOLERANCE ? 'az' : del > daz + DISH_TOLERANCE ? 'el' : 'both';
  return { strength, axis };
}
```

- [ ] **Step 5: The state type and `initialState`**

In `src/game/types.ts`, after `Chapter2VariantState` add:

```ts
// Inputs of the chapter-3 variant puzzle (Plan F3). The outcome is rackCorrect
// (derived), and through it kernelSeated / fragmentStage / cacheRead as before.
export interface Chapter3VariantState {
  seated: ColumnId[]; // sequenced rack: the loading order so far, 0–4 distinct columns
}
```

and add `chapter3v: Chapter3VariantState;` at the end of `GameState`, after `chapter2v`.

In `src/game/store.ts`: extend the type import on line 2 with `Chapter3VariantState`, and in `initialState` after the `chapter2v` line add:

```ts
    chapter3v: { seated: [] },
```

- [ ] **Step 6: Persistence**

In `src/game/persist.ts`, in `validShape` after the `chapter2v` block:

```ts
  if (p.chapter3v !== undefined) {
    const c3v = p.chapter3v as unknown as Record<string, unknown>;
    if (!c3v || typeof c3v !== 'object') return false;
    if (!Array.isArray(c3v.seated) || c3v.seated.length > 4 || !c3v.seated.every((c) => COLUMN_IDS.includes(c as ColumnId))) return false;
    if (new Set(c3v.seated).size !== c3v.seated.length) return false;
  }
```

and in `loadSavedState`, directly after the `chapter2v === undefined` fill block:

```ts
    // Pre-F3 saves predate chapter3v. A save that already proved the rack
    // (kernel seated, cache read, or the fragment queried) keeps it proven on a
    // ship that now sequences it; anything else starts with a full tray.
    if (parsed.chapter3v === undefined) {
      const c3 = parsed.chapter3;
      const proven = c3?.kernelSeated === true || c3?.cacheRead === true || (c3?.fragmentStage ?? 0) > 0;
      parsed.chapter3v = { seated: proven ? [...secretsFor(parsed.seed as number).columnOrder] : [] };
    }
```

(`COLUMN_IDS` and `secretsFor` are already imported in `persist.ts`.)

- [ ] **Step 7: Run the whole gate**

Run: `npx vitest run && npm run build`
Expected: both exit 0; 271 → 276 tests (four in `derived.test.ts`, one in persist).

- [ ] **Step 8: Commit**

```bash
git add src/game/variants.ts src/game/variants.test.ts src/game/derived.ts src/game/derived.test.ts src/game/types.ts src/game/store.ts src/game/persist.ts src/game/persist.test.ts
git commit -m "feat: chapter-3 variant rooms, the beacon signal meter, the chapter3v slice

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Store actions — the sequenced rack

**Files:**
- Modify: `src/game/store.ts` (`seatColumn`, plus a new chapter-3 variants block at the end), `src/game/derived.ts` (`rackCorrect`)
- Test: `src/game/store.variants.test.ts` (append)

**Interfaces:**
- Consumes: `Chapter3VariantState`, `GameState.chapter3v` (Task 1); `variantFor`, `secretsFor(seed).columnOrder`, `patch3`, `rackCorrect` consumers (existing).
- Produces: `loadColumn(column: ColumnId): ActionResult`; `ejectColumns(): ActionResult`; `seatColumn` refuses on a sequenced ship; `rackCorrect(s)` branches on the ship.

- [ ] **Step 1: Failing tests**

Append to `src/game/store.variants.test.ts`. Extend the store import with `seatColumn, loadColumn, ejectColumns, seatKernel, readPrimeCache`, the derived import with `rackCorrect`, and add `import type { ColumnId } from './types';`. Then append:

```ts
// ---------------------------------------------------------------- chapter 3

const S_SR = findSeed((s) => variantFor(s, 'core_vault') === 1);

// Standing in the core vault on the lower deck, kill-switch dormant (its clock is not this test's concern).
function inVaultOn(seed: number) {
  resetGame(seed);
  gameStore.setState({ chapter: 3, act: 3, room: 'core_vault', checkpoint: { chapter: 3, room: 'cargo_bay' } });
}

describe('sequenced rack (core vault variant 1)', () => {
  it('exists only on a sequenced ship and only in the vault; the cradles refuse there', () => {
    inVaultOn(0);
    expect(loadColumn('A').ok).toBe(false);
    expect(ejectColumns().ok).toBe(false);
    const classic = secretsFor(0).columnOrder;
    classic.forEach((c, i) => seatColumn(i as 0 | 1 | 2 | 3, c));
    expect(rackCorrect(gameStore.getState())).toBe(true); // the classic rack is untouched
    inVaultOn(S_SR);
    gameStore.setState({ room: 'reactor_room' });
    expect(loadColumn('A').ok).toBe(false);
    gameStore.setState({ room: 'core_vault' });
    const refused = seatColumn(0, 'A');
    expect(refused.ok).toBe(false);
    expect(refused.message).toMatch(/loads from the tray/);
    expect(gameStore.getState().chapter3.rack).toEqual([null, null, null, null]);
  });

  it('a duplicate is refused, a wrong fourth ejects the set, and the tray can be pulled by hand', () => {
    inVaultOn(S_SR);
    const order = secretsFor(S_SR).columnOrder;
    const wrong: ColumnId[] = [order[1], order[2], order[3], order[0]]; // rotated: every position wrong
    expect(loadColumn(wrong[0]).ok).toBe(true);
    expect(loadColumn(wrong[0]).ok).toBe(false); // already in the rack
    expect(gameStore.getState().chapter3v.seated).toEqual([wrong[0]]);
    expect(loadColumn(wrong[1]).ok).toBe(true);
    expect(loadColumn(wrong[2]).ok).toBe(true);
    expect(rackCorrect(gameStore.getState())).toBe(false); // three up is never correct
    const fourth = loadColumn(wrong[3]);
    expect(fourth.ok).toBe(false);
    expect(fourth.message).toMatch(/ejects/);
    expect(gameStore.getState().chapter3v.seated).toEqual([]);
    expect(rackCorrect(gameStore.getState())).toBe(false);
    // manual eject mid-sequence
    loadColumn(order[0]); loadColumn(order[1]);
    expect(ejectColumns().ok).toBe(true);
    expect(gameStore.getState().chapter3v.seated).toEqual([]);
    expect(ejectColumns().ok).toBe(false); // the tray is already full
  });

  it('the right order holds the rack; the kernel seats and the cache reads; then the rack is locked', () => {
    inVaultOn(S_SR);
    const order = secretsFor(S_SR).columnOrder;
    expect(readPrimeCache().ok).toBe(false);
    for (const c of order) expect(loadColumn(c).ok).toBe(true);
    expect(gameStore.getState().chapter3v.seated).toEqual([...order]);
    expect(rackCorrect(gameStore.getState())).toBe(true);
    expect(readPrimeCache().ok).toBe(true);
    expect(seatKernel(1_000_000).ok).toBe(true);
    expect(gameStore.getState().chapter3.kernelSeated).toBe(true);
    expect(loadColumn(order[0]).ok).toBe(false);
    expect(ejectColumns().ok).toBe(false);
    expect(gameStore.getState().chapter3v.seated).toEqual([...order]);
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/game/store.variants.test.ts`
Expected: FAIL — `loadColumn`/`ejectColumns` are not exported.

- [ ] **Step 3: `rackCorrect` branches on the ship**

In `src/game/derived.ts` replace `rackCorrect` with:

```ts
export function rackCorrect(s: GameState): boolean {
  const order = secretsFor(s.seed).columnOrder;
  // A sequenced rack (Plan F3) is correct when its loading order is the sheet's order.
  if (variantFor(s.seed, 'core_vault') === 1) {
    return s.chapter3v.seated.length === 4 && s.chapter3v.seated.every((c, i) => c === order[i]);
  }
  return s.chapter3.rack.every((c, i) => c === order[i]);
}
```

(`variantFor` is already imported in `derived.ts`.)

- [ ] **Step 4: `seatColumn` refuses on a sequenced ship**

In `src/game/store.ts`, `seatColumn`, insert directly after the room check:

```ts
  if (variantFor(s.seed, 'core_vault') === 1) return { ok: false, message: 'This rack loads from the tray, in order. There are no cradles to pick.' };
```

- [ ] **Step 5: The chapter-3 variants block**

Append at the end of `src/game/store.ts`:

```ts
// ---------------------------------------------------------- chapter-3 variants

function patch3v(p: Partial<Chapter3VariantState>): void {
  gameStore.setState((s) => ({ chapter3v: { ...s.chapter3v, ...p } }));
}

export function loadColumn(column: ColumnId): ActionResult {
  const s = gameStore.getState();
  if (variantFor(s.seed, 'core_vault') !== 1) return { ok: false, message: 'This rack has cradles, not a loading tray.' };
  if (s.room !== 'core_vault') return { ok: false, message: 'The memory rack is in the core vault.' };
  if (s.chapter3.kernelSeated) return { ok: false, message: 'The kernel is seated; the rack is locked.' };
  if (s.chapter3v.seated.includes(column)) return { ok: false, message: `Column ${column} is already in the rack.` };
  const seated = [...s.chapter3v.seated, column];
  if (seated.length < 4) {
    patch3v({ seated });
    return { ok: true, message: `Column ${column} up; the rack waits for the next.` };
  }
  const order = secretsFor(s.seed).columnOrder;
  if (!seated.every((c, i) => c === order[i])) {
    patch3v({ seated: [] });
    return { ok: false, message: 'The rack spins down and ejects every column back to the tray. Wrong order; start again.' };
  }
  patch3v({ seated });
  return { ok: true, message: 'Fourth column up. The rack holds; every column spinning in phase.' };
}

export function ejectColumns(): ActionResult {
  const s = gameStore.getState();
  if (variantFor(s.seed, 'core_vault') !== 1) return { ok: false, message: 'This rack has cradles, not a loading tray.' };
  if (s.room !== 'core_vault') return { ok: false, message: 'The memory rack is in the core vault.' };
  if (s.chapter3.kernelSeated) return { ok: false, message: 'The kernel is seated; the rack is locked.' };
  if (s.chapter3v.seated.length === 0) return { ok: false, message: 'The tray is already full.' };
  patch3v({ seated: [] });
  return { ok: true, message: 'Every column back in the tray.' };
}
```

- [ ] **Step 6: Run the whole gate**

Run: `npx vitest run && npm run build`
Expected: both exit 0; 276 → 279. `store.ch3.test.ts` untouched and green — the classic rack path is byte-identical.

- [ ] **Step 7: Commit**

```bash
git add src/game/store.ts src/game/derived.ts src/game/store.variants.test.ts
git commit -m "feat: the sequenced rack — chapter-3 variant actions

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: A rack sheet and a beacon report that follow the ship

**Files:**
- Modify: `src/game/narrative.ts` (`rackSchematicEn/Pt`, `getRackSchematic`), `src/mcp/tools.ts` (`listen_beacon` handler body only)
- Test: `src/mcp/tools.test.ts` (append), `src/game/i18n.test.ts` (append)

**Interfaces:**
- Consumes: `variantFor` (eight rooms), `beaconSignalFor` (Task 1); `hearBeacon`, `getBeaconMessage`, `secretsFor`, `getLocale` (existing).
- Produces: `getRackSchematic(seed)` prints the LOAD ORDER sheet on a sequenced ship; `listen_beacon` off-target returns `{ ok: false, signal_strength, error_axis, message }` on a dead-encoder ship (no `carrier_bearing`). No tool name, description or schema changes.

- [ ] **Step 1: Failing tests**

Append to `src/mcp/tools.test.ts`, at the end of the file:

```ts
describe('remixed ships, chapter 3 — the surface follows the ship, the contract does not move', () => {
  function findSeed(pred: (seed: number) => boolean): number {
    for (let seed = 1; seed < 5000; seed++) if (pred(seed)) return seed;
    throw new Error('no seed found');
  }
  const S_SR = findSeed((s) => variantFor(s, 'core_vault') === 1);
  const S_DE = findSeed((s) => variantFor(s, 'comms_array') === 1);
  function lowerDeckOn(seed: number, room: 'core_vault' | 'comms_array') {
    resetGame(seed);
    gameStore.setState({ chapter: 3, act: 3, room, checkpoint: { chapter: 3, room: 'cargo_bay' } });
  }

  it('the core rack sheet gives a LOAD ORDER on a sequenced ship and cradles top to bottom otherwise', async () => {
    lowerDeckOn(S_SR, 'core_vault');
    const sheet = await call('get_schematic', { system: 'core_rack' });
    expect(sheet.schematic).toContain('LOAD ORDER');
    expect(sheet.schematic).toContain(secretsFor(S_SR).columnOrder.join(' · '));
    expect(sheet.schematic).not.toContain('top to bottom');
    lowerDeckOn(0, 'core_vault');
    const classic = await call('get_schematic', { system: 'core_rack' });
    expect(classic.schematic).toContain('top to bottom');
    expect(classic.schematic).toContain('C · A · D · B');
  });

  it('listen_beacon is a meter on a dead-encoder ship and a bearing on the classic one', async () => {
    lowerDeckOn(S_DE, 'comms_array');
    const t = secretsFor(S_DE).beaconBearing;
    const step = t.az >= 180 ? -1 : 1; // step away from the bearing without leaving 0–359 (no wrap, like dishAligned)
    setDish('az', t.az + 40 * step); setDish('el', t.el);
    const far = await call('listen_beacon');
    expect(far.ok).toBe(false);
    expect(far).not.toHaveProperty('carrier_bearing');
    expect(typeof far.signal_strength).toBe('number');
    expect(far.error_axis).toBe('az');
    expect(far.message).toMatch(/you are the meter/);
    setDish('az', t.az + 10 * step);
    const near = await call('listen_beacon');
    expect(near.ok).toBe(false);
    expect(near.signal_strength).toBeGreaterThan(far.signal_strength);
    setDish('az', t.az);
    const lock = await call('listen_beacon');
    expect(lock.ok).toBe(true);
    expect(lock.beacon).toBeDefined();
    lowerDeckOn(0, 'comms_array');
    const classic = await call('listen_beacon');
    expect(classic.ok).toBe(false);
    expect(classic.carrier_bearing).toBe('AZ 217 / EL 34');
    expect(classic).not.toHaveProperty('signal_strength');
  });
});
```

and extend the test file's imports: add `setDish` to the `../game/store` import (the file already imports `secretsFor` and `variantFor`).

Append to `src/game/i18n.test.ts`, inside `describe('localized narrative', …)` after the chapter-2 variant test:

```ts
  it('the sequenced rack sheet keeps its order string in pt-BR', () => {
    const S_SR = (() => { for (let s = 1; s < 5000; s++) if (variantFor(s, 'core_vault') === 1) return s; throw new Error('none'); })();
    const order = secretsFor(S_SR).columnOrder.join(' · ');
    setLocale('pt-BR');
    expect(getRackSchematic(S_SR)).toContain('ORDEM DE CARGA');
    expect(getRackSchematic(S_SR)).toContain(order);
    expect(getRackSchematic(0)).toContain('de cima para baixo');
    setLocale('en');
    expect(getRackSchematic(S_SR)).toContain('LOAD ORDER');
    expect(getRackSchematic(S_SR)).toContain(order);
  });
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/mcp/tools.test.ts src/game/i18n.test.ts`
Expected: FAIL — the sequenced sheet still says "top to bottom"; `listen_beacon` still returns `carrier_bearing` on the dead-encoder ship.

- [ ] **Step 3: The rack sheet**

In `src/game/narrative.ts` replace `rackSchematicEn`, `rackSchematicPt` and `getRackSchematic` with:

```ts
function rackSchematicEn(order: string, sequenced: boolean): string {
  if (sequenced) {
    return (
      `CORE RACK — PRIME memory columns. LOAD ORDER (tray → rack): ${order}. ` +
      'Seat them one at a time in that order — any cradle takes any column; the rack spins each one up in a chain, validates on the fourth and ejects the whole set on a mismatch. ' +
      'Column tags (A–D) are stamped on the end caps. The kernel column (K) seats only after all four cradle lamps show green. ' +
      'Loading is mechanical — the crew member\'s hands. The order is yours to read; they cannot see this sheet.'
    );
  }
  return (
    `CORE RACK — PRIME memory columns. Seat the four columns top to bottom in this order: ${order}. ` +
    'Column tags (A–D) are stamped on the end caps. The kernel column (K) seats in the fifth cradle only after all four cradle lamps show green. ' +
    'Seating is mechanical — the crew member\'s hands. The order is yours to read; they cannot see this sheet.'
  );
}
function rackSchematicPt(order: string, sequenced: boolean): string {
  if (sequenced) {
    return (
      `RACK DO NÚCLEO — colunas de memória de PRIME. ORDEM DE CARGA (bandeja → rack): ${order}. ` +
      'Encaixe uma de cada vez, nessa ordem — qualquer berço aceita qualquer coluna; o rack gira cada uma em cadeia, valida na quarta e ejeta o conjunto inteiro se a ordem estiver errada. ' +
      'As etiquetas (A–D) estão gravadas nas tampas. A coluna-kernel (K) só encaixa depois que as quatro lâmpadas dos berços ficarem verdes. ' +
      'A carga é mecânica — mãos do tripulante. A ordem é sua para ler; o tripulante não vê esta folha.'
    );
  }
  return (
    `RACK DO NÚCLEO — colunas de memória de PRIME. Encaixe as quatro colunas de cima para baixo nesta ordem: ${order}. ` +
    'As etiquetas (A–D) estão gravadas nas tampas. A coluna-kernel (K) só encaixa no quinto berço depois que as quatro lâmpadas dos berços ficarem verdes. ' +
    'O encaixe é mecânico — mãos do tripulante. A ordem é sua para ler; o tripulante não vê esta folha.'
  );
}

export function getRackSchematic(seed: number): string {
  const order = secretsFor(seed).columnOrder.join(' · ');
  const sequenced = variantFor(seed, 'core_vault') === 1;
  return getLocale() === 'pt-BR' ? rackSchematicPt(order, sequenced) : rackSchematicEn(order, sequenced);
}
```

(The classic branches are character-for-character the previous bodies. `variantFor` is already imported in `narrative.ts`.)

- [ ] **Step 4: The `listen_beacon` handler**

In `src/mcp/tools.ts` replace the `listen_beacon` handler body (the arrow function only — not the name, description, `availableWhen`, schema, or the trailing `false, 'comms'`) with:

```ts
      () => {
        const s = gameStore.getState();
        const r = hearBeacon();
        if (r.ok) return { ok: true, beacon: getBeaconMessage(s.seed, s.ngPlus), message: r.message };
        if (variantFor(s.seed, 'comms_array') === 1) {
          // Dead encoders: the crew member cannot read degrees, so the bearing is useless to them —
          // the agent reads strength and steers them by voice.
          const { strength, axis } = beaconSignalFor(s.seed, s.chapter3.dish);
          const dominant = axis === 'az' ? 'Azimuth error dominates.' : axis === 'el' ? 'Elevation error dominates.' : 'Both axes are off.';
          return {
            ok: false,
            signal_strength: strength,
            error_axis: axis,
            message: `Carrier at ${strength}%. ${dominant} The array's encoders are dead — the crew member cannot read degrees; you are the meter: read them the strength, have them move, listen again.`,
          };
        }
        const b = secretsFor(s.seed).beaconBearing;
        return { ...r, carrier_bearing: `AZ ${b.az} / EL ${b.el}` };
      },
```

and extend the derived import in `tools.ts` with `beaconSignalFor` (`variantFor` is already imported).

- [ ] **Step 5: Run the whole gate**

Run: `npx vitest run && npm run build`
Expected: both exit 0; 279 → 282. The contract snapshot test passes unchanged (no description or schema touched).

- [ ] **Step 6: Commit**

```bash
git add src/game/narrative.ts src/mcp/tools.ts src/mcp/tools.test.ts src/game/i18n.test.ts
git commit -m "feat: the rack sheet and the beacon report follow the ship

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: The sequenced rack — the core vault swaps its rack

**Files:**
- Create: `src/scenes/SequencedRack.tsx`
- Modify: `src/scenes/CoreVault.tsx` (imports + the exported `CoreVault` component), `src/ui/strings.ts` (`vault` block, both locales + interface)

**Interfaces:**
- Consumes: `loadColumn`, `ejectColumns` (Task 2); `rackCorrect` (branched, Task 2); `chapter3v.seated`, `chapter3.kernelSeated`; `gameStore`; `variantFor`; `useGame`, `useStrings`.
- Produces: nothing downstream.

- [ ] **Step 1: Strings**

Extend the `vault` entry of the `UIStrings` interface:

```ts
  vault: {
    title: string; intro: string; rackTitle: string; rackDesc: string; rackAria: string; cradle: (n: number) => string; cycleAria: (n: number) => string;
    empty: string; column: (tag: string) => string; rackWrong: string; rackRight: string; kernelTitle: string; kernelDesc: string; seatKernel: string;
    kernelSeated: string; anotherRitual: string; leverHold: string; leverHolding: string; windowElapsed: string; twoOp: string;
    consoleTitle: string; consoleDesc: string; consoleAria: string; stage: (n: number) => string; cacheLamp: string; next: string;
    seqDesc: string; seqAria: (n: number) => string; load: (tag: string) => string; loadAria: (tag: string) => string; eject: string;
    tripLamp: string; spinGauge: string; trayLabel: string; seqWaiting: (n: number) => string; seqTripped: string; seqLive: string;
  };
```

Append to `en.vault` (after `next`):

```ts
    seqDesc: 'A loading tray and four cradles. Any cradle takes any column — this rack cares about the order you load them, not where. It spins each column up in a chain and checks the sequence on the fourth: wrong, and it ejects all four back to the tray. The order is on a schematic only the ship can read — ask your AI.',
    seqAria: (n) => `sequenced memory rack: ${n} of 4 columns loaded`,
    load: (tag) => `Load ${tag}`,
    loadAria: (tag) => `load column ${tag} into the rack`,
    eject: 'Eject tray',
    tripLamp: 'TRIP',
    spinGauge: 'SPIN-UP',
    trayLabel: 'TRAY',
    seqWaiting: (n) => `${n} of 4 up. The rack waits for the next column.`,
    seqTripped: 'The rack spins down and ejects every column. Wrong order — start again from the tray.',
    seqLive: 'Fourth column up. Four lamps, green together. The rack is in order; the kernel cradle wakes.',
```

Append to `ptBR.vault` (after `next`):

```ts
    seqDesc: 'Uma bandeja de carga e quatro berços. Qualquer berço aceita qualquer coluna — este rack liga para a ordem em que você carrega, não para onde. Ele gira cada coluna em cadeia e confere a sequência na quarta: errada, ejeta as quatro de volta para a bandeja. A ordem está num esquema que só a nave lê — pergunte à sua IA.',
    seqAria: (n) => `rack de memória sequenciado: ${n} de 4 colunas carregadas`,
    load: (tag) => `Carregar ${tag}`,
    loadAria: (tag) => `carregar a coluna ${tag} no rack`,
    eject: 'Ejetar bandeja',
    tripLamp: 'TRIP',
    spinGauge: 'SPIN-UP',
    trayLabel: 'BANDEJA',
    seqWaiting: (n) => `${n} de 4 em cima. O rack espera a próxima coluna.`,
    seqTripped: 'O rack gira para baixo e ejeta todas as colunas. Ordem errada — comece de novo pela bandeja.',
    seqLive: 'Quarta coluna em cima. Quatro lâmpadas, verdes juntas. O rack está em ordem; o berço do kernel acorda.',
```

- [ ] **Step 2: Create `src/scenes/SequencedRack.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import { useGame } from '../ui/useGame';
import { useStrings } from '../ui/useLocale';
import { ejectColumns, gameStore, loadColumn } from '../game/store';
import { rackCorrect } from '../game/derived';
import type { ColumnId } from '../game/types';

const COLUMNS: ColumnId[] = ['A', 'B', 'C', 'D'];
// Tray on the left (columns lying down), rack on the right (columns standing, filled left to right).
const TRAY_X = 16;
const TRAY_Y0 = 30;
const TRAY_DY = 26;
const RACK_X0 = 150;
const RACK_DX = 36;
const RACK_Y = 34;
const RACK_H = 96;

function LyingColumn({ x, y, tag }: { x: number; y: number; tag: ColumnId }) {
  return (
    <g>
      <rect x={x} y={y} width="96" height="18" rx="9" fill="url(#sr-column)" stroke="var(--steel)" />
      <rect x={x + 82} y={y} width="14" height="18" rx="7" fill="url(#sr-brass)" stroke="var(--brass-lo)" />
      <rect x={x + 6} y={y + 3} width="18" height="12" rx="2" fill="var(--panel-solid)" stroke="var(--line)" />
      <text x={x + 15} y={y + 12} textAnchor="middle" fontSize="8" fill="var(--text)" letterSpacing="1">{tag}</text>
      {[34, 50, 66].map((dx) => <line key={dx} x1={x + dx} y1={y + 3} x2={x + dx} y2={y + 15} stroke="var(--hull)" strokeWidth="1" opacity="0.6" />)}
    </g>
  );
}

function StandingColumn({ x, y, tag, lit }: { x: number; y: number; tag: ColumnId; lit: boolean }) {
  return (
    <g style={{ transition: 'opacity 0.3s' }}>
      <rect x={x} y={y} width="22" height={RACK_H} rx="11" fill="url(#sr-column-v)" stroke="var(--steel)" />
      <rect x={x} y={y} width="22" height="14" rx="7" fill="url(#sr-brass)" stroke="var(--brass-lo)" />
      <rect x={x + 4} y={y + RACK_H - 24} width="14" height="16" rx="2" fill="var(--panel-solid)" stroke="var(--line)" />
      <text x={x + 11} y={y + RACK_H - 12} textAnchor="middle" fontSize="8" fill={lit ? 'var(--green)' : 'var(--text)'} letterSpacing="1">{tag}</text>
      {[30, 46, 62].map((dy) => <line key={dy} x1={x + 3} y1={y + dy} x2={x + 19} y2={y + dy} stroke="var(--hull)" strokeWidth="1" opacity="0.6" />)}
    </g>
  );
}

export function SequencedRack() {
  const seated = useGame((s) => s.chapter3v.seated);
  const kernel = useGame((s) => s.chapter3.kernelSeated);
  const correct = useGame((s) => rackCorrect(s));
  const t = useStrings();
  const [tripped, setTripped] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);

  const load = (c: ColumnId) => {
    const before = gameStore.getState().chapter3v.seated.length;
    const r = loadColumn(c);
    const after = gameStore.getState().chapter3v.seated.length;
    if (!r.ok && before === 3 && after === 0) {
      setTripped(true);
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setTripped(false), 900);
    }
  };

  const inTray = COLUMNS.filter((c) => !seated.includes(c));
  const spin = seated.length / 4; // 0..1 — a quarter per loaded column
  // spin-up gauge: a 120° arc from 210° to 330°, needle at the fraction
  const gx = 262, gy = 178, gr = 24;
  const needleDeg = 210 + 120 * spin;
  const nx = gx + gr * Math.cos((needleDeg * Math.PI) / 180);
  const ny = gy + gr * Math.sin((needleDeg * Math.PI) / 180);
  const status = kernel || correct ? t.vault.seqLive : tripped ? t.vault.seqTripped : t.vault.seqWaiting(seated.length);

  return (
    <div className="panel">
      <h2>{t.vault.rackTitle}</h2>
      <p className="status-dim">{t.vault.seqDesc}</p>
      <svg viewBox="0 0 320 210" width="100%" style={{ maxWidth: 480, display: 'block' }} role="img" aria-label={t.vault.seqAria(seated.length)}>
        <defs>
          <linearGradient id="sr-column" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--steel)" />
            <stop offset="50%" stopColor="var(--steel-lo)" />
            <stop offset="100%" stopColor="#0f1512" />
          </linearGradient>
          <linearGradient id="sr-column-v" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--steel)" />
            <stop offset="50%" stopColor="var(--steel-lo)" />
            <stop offset="100%" stopColor="#0f1512" />
          </linearGradient>
          <linearGradient id="sr-brass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--brass-hi)" />
            <stop offset="100%" stopColor="var(--brass-lo)" />
          </linearGradient>
        </defs>
        {/* chassis */}
        <rect x="4" y="4" width="312" height="202" rx="6" fill="var(--face)" stroke="var(--steel)" strokeWidth="3" />
        <rect x="12" y="12" width="296" height="186" rx="4" fill="var(--face-deep)" stroke="var(--line)" />
        {/* tray */}
        <rect x={TRAY_X - 6} y={TRAY_Y0 - 10} width="116" height="126" rx="4" fill="var(--panel-solid)" stroke="var(--line)" />
        <text x={TRAY_X + 52} y={TRAY_Y0 - 14} textAnchor="middle" fontSize="7" fill="var(--dim)" letterSpacing="2">{t.vault.trayLabel}</text>
        {COLUMNS.map((c, i) => {
          const y = TRAY_Y0 + i * TRAY_DY;
          return inTray.includes(c)
            ? <LyingColumn key={c} x={TRAY_X + 4} y={y} tag={c} />
            : <rect key={c} x={TRAY_X + 4} y={y} width="96" height="18" rx="9" fill="none" stroke="var(--line)" strokeDasharray="3 3" />;
        })}
        {/* rack: four cradles, filled left to right in loading order */}
        <rect x={RACK_X0 - 10} y={RACK_Y - 12} width={RACK_DX * 4 + 10} height={RACK_H + 26} rx="4" fill="var(--panel-solid)" stroke="var(--line)" />
        {[0, 1, 2, 3].map((i) => {
          const x = RACK_X0 + i * RACK_DX;
          const tag = seated[i];
          return (
            <g key={i}>
              <line x1={x - 4} y1={RACK_Y} x2={x - 4} y2={RACK_Y + RACK_H} stroke="var(--line)" strokeWidth="2" />
              <line x1={x + 26} y1={RACK_Y} x2={x + 26} y2={RACK_Y + RACK_H} stroke="var(--line)" strokeWidth="2" />
              <rect x={x + 5} y={RACK_Y + RACK_H + 2} width="12" height="6" fill="var(--panel-solid)" stroke="var(--line)" />
              {/* cradle lamp: all four together, or not at all */}
              <circle cx={x + 11} cy={RACK_Y - 4} r="4" fill={correct ? 'var(--green)' : 'var(--panel-solid)'} stroke="var(--steel)" strokeWidth="1.5" />
              {correct && <circle cx={x + 11} cy={RACK_Y - 4} r="7" fill="var(--green)" opacity="0.18" />}
              {tag
                ? <StandingColumn x={x} y={RACK_Y} tag={tag} lit={correct} />
                : <rect x={x} y={RACK_Y} width="22" height={RACK_H} rx="11" fill="none" stroke="var(--line)" strokeDasharray="3 3" />}
              <text x={x + 11} y={RACK_Y + RACK_H + 20} textAnchor="middle" fontSize="7" fill="var(--dim)">{i + 1}</text>
            </g>
          );
        })}
        {/* spin-up gauge */}
        <circle cx={gx} cy={gy} r={gr + 6} fill="var(--face)" stroke="var(--steel)" strokeWidth="2" />
        {[0, 1, 2, 3, 4].map((k) => {
          const deg = 210 + 30 * k;
          const x1 = gx + (gr - 2) * Math.cos((deg * Math.PI) / 180), y1 = gy + (gr - 2) * Math.sin((deg * Math.PI) / 180);
          const x2 = gx + (gr - 7) * Math.cos((deg * Math.PI) / 180), y2 = gy + (gr - 7) * Math.sin((deg * Math.PI) / 180);
          return <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--steel-hi)" strokeWidth="1.5" />;
        })}
        <line x1={gx} y1={gy} x2={nx} y2={ny} stroke="var(--amber)" strokeWidth="2" style={{ transition: 'all 0.4s' }} />
        <circle cx={gx} cy={gy} r="3" fill="var(--steel-lo)" stroke="var(--steel)" />
        <text x={gx} y={gy + gr + 12} textAnchor="middle" fontSize="6" fill="var(--dim)" letterSpacing="1.5">{t.vault.spinGauge}</text>
        {/* trip lamp */}
        <circle cx="290" cy="26" r="6" fill={tripped ? 'var(--red)' : 'var(--panel-solid)'} stroke="var(--steel)" strokeWidth="1.5" style={{ transition: 'fill 0.2s' }} />
        <text x="290" y="42" textAnchor="middle" fontSize="6" fill="var(--dim)" letterSpacing="1.5">{t.vault.tripLamp}</text>
      </svg>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 8, marginTop: 10, maxWidth: 480 }}>
        {COLUMNS.map((c) => (
          <button key={c} onClick={() => load(c)} disabled={kernel || seated.includes(c)} aria-label={t.vault.loadAria(c)}>{t.vault.load(c)}</button>
        ))}
        <button onClick={() => ejectColumns()} disabled={kernel || seated.length === 0} aria-label={t.vault.eject} style={{ borderColor: 'var(--brass)' }}>{t.vault.eject}</button>
      </div>
      <p className={correct ? 'status-ok' : tripped ? 'status-bad' : 'status-dim'} style={{ marginTop: 10 }}>{status}</p>
    </div>
  );
}
```

- [ ] **Step 3: Swap the rack in `src/scenes/CoreVault.tsx`**

Add the imports:

```ts
import { variantFor } from '../game/variants';
import { SequencedRack } from './SequencedRack';
```

Replace the exported `CoreVault` component with:

```tsx
export function CoreVault() {
  const seed = useGame((s) => s.seed);
  const sequenced = variantFor(seed, 'core_vault') === 1;
  const t = useStrings();
  return (
    <div className="scene">
      <div className="panel">
        <h2>{t.vault.title}</h2>
        <p>{t.vault.intro}</p>
      </div>
      {sequenced ? <SequencedRack /> : <Rack />}
      <FragmentConsole />
      <KernelCradle />
      <p className="status-dim">{t.vault.next}</p>
    </div>
  );
}
```

- [ ] **Step 4: Run the whole gate**

Run: `npx vitest run && npm run build`
Expected: both exit 0 (282 tests; `tsc` accepts the new `vault` keys in both locales).

- [ ] **Step 5: Look at it**

`npm run dev`, play to the lower deck on a sequenced ship (about one in two rolls; "Abandon previous run" rerolls). The vault shows the tray of four lying columns on the left and four empty standing cradles on the right; Load B stands column B in cradle 1 and moves the spin-up needle a quarter; a wrong fourth column empties the rack, refills the tray and flashes TRIP red with the "spins down" line; the right sequence lights the four cradle lamps green and the kernel cradle panel appears. On a classic vault the five-cradle `Rack` is unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/SequencedRack.tsx src/scenes/CoreVault.tsx src/ui/strings.ts
git commit -m "feat: the sequenced rack — the core vault swaps its rack

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: The dead encoder — the dish loses its numbers

**Files:**
- Modify: `src/scenes/CommsArray.tsx` (`Dish` only), `src/ui/strings.ts` (`comms` block, both locales + interface)

**Interfaces:**
- Consumes: `variantFor` (Task 1); `chapter3.dish`, `dishAligned` (existing).
- Produces: nothing downstream.

- [ ] **Step 1: Strings**

Extend the `comms` entry of the `UIStrings` interface:

```ts
  comms: {
    title: string; intro: string; dishTitle: string; dishDesc: string; dishAria: string; azAria: string; elAria: string; az: string; el: string;
    carrier: string; locked: string; beaconTitle: string; beaconDesc: string; beaconHeard: string; beaconAria: string;
    bandTitle: string; bandDesc: string; openBand: string; bandNoEvidence: string; bandNotAligned: string; anotherRitual: string; bandOpen: string;
    lockHold: string; lockHolding: string; windowElapsed: string; twoOp: string; next: string;
    dishDescDead: string; dishAriaDead: string; encFault: string; encoderDead: string; carrierDead: string;
  };
```

Append to `en.comms` (after `next`):

```ts
    dishDescDead: 'Azimuth and elevation, by hand — and blind. The encoders burned with the servos: no degrees on the face, no numbers anywhere. Your AI can hear how strong the carrier is where you are pointing. Move, ask, move again; it is the meter now.',
    dishAriaDead: 'Dish steering: azimuth rose and elevation quadrant, encoders dead — no readout',
    encFault: 'ENC FAULT',
    encoderDead: 'encoder dead — no reading',
    carrierDead: 'CARRIER — somewhere in the sky. The encoders are dead; your AI is the meter. Move, ask, move.',
```

Append to `ptBR.comms` (after `next`):

```ts
    dishDescDead: 'Azimute e elevação, na mão — e às cegas. Os encoders queimaram com os servos: nenhum grau no mostrador, nenhum número em lugar nenhum. Sua IA consegue ouvir quão forte está a portadora onde você aponta. Mova, pergunte, mova de novo; ela é o medidor agora.',
    dishAriaDead: 'Apontamento da antena: rosa de azimute e quadrante de elevação, encoders mortos — sem leitura',
    encFault: 'ENC FAULT',
    encoderDead: 'encoder morto — sem leitura',
    carrierDead: 'PORTADORA — em algum lugar do céu. Os encoders estão mortos; sua IA é o medidor. Mova, pergunte, mova.',
```

- [ ] **Step 2: `Dish` branches on the ship**

In `src/scenes/CommsArray.tsx` add `import { variantFor } from '../game/variants';` and make these edits inside `Dish` (everything not named stays byte-identical):

After `const dish = useGame((s) => s.chapter3.dish);` add:

```ts
  const seed = useGame((s) => s.seed);
  const dead = variantFor(seed, 'comms_array') === 1; // dead encoders: no degree value may reach the DOM
```

Change the panel description line to:

```tsx
      <p className="status-dim">{dead ? t.comms.dishDescDead : t.comms.dishDesc}</p>
```

Change the `<svg …>` aria-label to:

```tsx
        aria-label={dead ? t.comms.dishAriaDead : `${t.comms.dishAria} — ${t.comms.az} ${dish.az}, ${t.comms.el} ${dish.el}`}>
```

Replace the azimuth readout plate (the `<rect x={CX - 21} …/>` and the `<text x={CX} y="173.5" …>` that follows) with:

```tsx
        <rect x={CX - 21} y="164" width="42" height="13" rx="2" fill="var(--panel-solid)" stroke={dead ? 'var(--amber)' : 'var(--line)'} />
        <text x={CX} y="173.5" textAnchor="middle" fontSize="7" fill={dead ? 'var(--amber)' : 'var(--text)'} letterSpacing="1">
          {dead ? t.comms.encFault : `${t.comms.az} ${String(dish.az).padStart(3, '0')}`}
        </text>
```

Replace the elevation readout plate (the `<rect x="236" …/>` and the `<text x="257" y="173.5" …>` that follows) with:

```tsx
        <rect x="236" y="164" width="42" height="13" rx="2" fill="var(--panel-solid)" stroke={dead ? 'var(--amber)' : 'var(--line)'} />
        <text x="257" y="173.5" textAnchor="middle" fontSize="7" fill={dead ? 'var(--amber)' : 'var(--text)'} letterSpacing="1">
          {dead ? t.comms.encFault : `${t.comms.el} ${String(dish.el).padStart(2, '0')}`}
        </text>
```

Replace the two slider `<label>` blocks with:

```tsx
        <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ width: 64 }}>{t.comms.az} {dead ? '—' : `${dish.az}°`}</span>
          <input type="range" min={0} max={359} value={dish.az} onChange={(e) => setDish('az', Number(e.target.value))} style={{ flex: 1 }}
            aria-label={t.comms.azAria} aria-valuetext={dead ? t.comms.encoderDead : undefined} />
        </label>
        <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ width: 64 }}>{t.comms.el} {dead ? '—' : `${dish.el}°`}</span>
          <input type="range" min={0} max={90} value={dish.el} onChange={(e) => setDish('el', Number(e.target.value))} style={{ flex: 1 }}
            aria-label={t.comms.elAria} aria-valuetext={dead ? t.comms.encoderDead : undefined} />
        </label>
```

Change the status line to:

```tsx
      <p className={aligned ? 'status-ok' : 'status-dim'} style={{ marginTop: 8 }}>{aligned ? t.comms.locked : dead ? t.comms.carrierDead : t.comms.carrier}</p>
```

(The rose, the N/E/S/W letters, the elevation quadrant, the pointer drift, the lock lamp, `Beacon` and `OpenBand` are untouched. On the classic ship every rendered string is identical to before.)

- [ ] **Step 3: Run the whole gate**

Run: `npx vitest run && npm run build`
Expected: both exit 0.

- [ ] **Step 4: Look at it**

On a dead-encoder ship the two readout plates say ENC FAULT in amber, the slider captions read `AZ —` / `EL —`, the description and carrier line speak of the meter; with the agent calling `listen_beacon` after each move the strength climbs, and the LOCK line and lamp light on alignment exactly as before. On a classic comms array nothing has changed.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/CommsArray.tsx src/ui/strings.ts
git commit -m "feat: the dead encoder — the dish loses its numbers

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Docs, preview, playthrough, merge

- [ ] **Step 1:** `README.md`: in the "Every ship is unique" bullet, extend the structural sentence so it also covers chapter 3 — after "a cargo bay re-racked with the quarantine container under a pallet" add ", a memory rack that cares about loading order instead of position, a dish whose encoders are dead so the agent has to be the signal meter"; update the test count in the "Local development" block to the real total printed by `npx vitest run`. Append to the spec: "**Shipped <date>** — <tests> tests; chapter-3 structural variants live." Commit.
- [ ] **Step 2:** Demo seeds (verified against the real derivation before this plan was written): **seed 4** rolls both chapter-3 variants; **seed 2** rolls neither (while rolling all three chapter-2 variants); **seed 177** rolls all **eight** variants of the game. Re-verify with a one-off in the test runner if in doubt:

```bash
cat > src/game/__seeds.test.ts <<'EOF'
import { it } from 'vitest';
import { variantFor } from './variants';
it('seeds', () => {
  const R = ['cryo_bay', 'engineering', 'bridge', 'crew_quarters', 'hydroponics', 'cargo_bay', 'core_vault', 'comms_array'] as const;
  throw new Error([4, 2, 177].map((s) => `${s}: ${R.map((r) => variantFor(s, r)).join('/')}`).join(' | '));
});
EOF
npx vitest run src/game/__seeds.test.ts 2>&1 | grep -m1 'Error:'; rm src/game/__seeds.test.ts
```

Expected: `4: …/1/1 | 2: 1/0/1/1/1/1/0/0 | 177: 1/1/1/1/1/1/1/1`.

- [ ] **Step 3:** Push `directors-cut`, deploy a preview (`npx vercel --yes`), and hand Mario the walkthrough. Each chapter-3 room rolls independently (~1 in 2). The script: (a) a sequenced vault — ask the agent for the core rack sheet ("LOAD ORDER"), load a wrong column fourth to see the trip and the tray refill, then the right sequence: lamps green, kernel cradle wakes, `read_prime_cache` works; (b) a dead-encoder dish — ENC FAULT plates, no numbers; move, have the agent `listen_beacon`, hear the strength and the dominant axis, converge, LOCK, `listen_beacon` resolves the beacon; (c) one classic lower deck untouched (five cradles, degree readouts, the bearing read out).
- [ ] **Step 4:** Merge and deploy after "aprovado":

```bash
git checkout main && git merge directors-cut --no-edit && npx vitest run && npm run build && git push origin main && npx vercel --prod --yes
git checkout directors-cut && git merge main && git push origin directors-cut
```

- [ ] **Step 5:** Update the project memory (Plan F3 shipped — every puzzle room of the game now varies by seed; the remixed-ships cycle is complete).
