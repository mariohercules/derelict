# Director's Cut — Plan D: Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the polish items parked by the Plan B and Plan C reviews without changing any game rule: a shared instrument palette in `theme.css` replacing the recurring hex literals in every scene; hydroponics bed lamps that report the last cycle the AI ran (not a live answer key), with the scene subscribing to what it needs; `wavesEndured` as an honest counter surfaced in the epilogue; and a memory rack that refuses the same column tag in two cradles.

**Architecture:** No new modules. Tokens are added to `:root` and substituted mechanically (a test pins the substitution so the literals cannot creep back). The hydroponics change adds one persisted field (`chapter2.lastCycle`) written by `runIrrigation` and cleared by `setIrrigation`. `wavesEndured` stops being derived from the clock and becomes a counter incremented by `tickKillswitch` on each `active → calm` transition, so a resumed save keeps its count. The rack rule lives in `seatColumn` (the store refuses duplicates) and the scene's cycle skips them.

**Tech Stack:** React 19 + TypeScript + Vite, Zustand, Vitest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-26-derelict-directors-cut-design.md` (§7 tech deltas; §10 addendum). The items come verbatim from the shipped plans' ledgers: Plan B final review minors (hex literals → tokens; hide bed lamps until a cycle has run; Beds whole-store selector) and Plan C parked findings (`wavesEndured` never surfaced; rack accepts duplicate column tags).

## Global Constraints

- **No game-rule change** beyond the four items: secrets, gates, tool availability, ritual windows and endings stay exactly as shipped; the 190 tests stay green except where a test asserts a behaviour this plan deliberately changes (`wavesEndured` counting; rack duplicates) — each such change is named in its task.
- **Premium graphics standard (non-negotiable):** the palette pass must be visually neutral — every token's value equals the literal it replaces; no instrument changes colour. Bezels, deterministic geometry, reduced-motion, engraved labels, `role="img"` + `aria-label`s all stay.
- Plan A/B/C saves keep loading: any new persisted field is filled with its default when missing, before validation.
- Classic ship (`seed 0`) preserved; `secrets.ts` untouched.
- All player-facing text in both locales in `src/ui/strings.ts`.
- Branch `directors-cut`; merge to `main` + prod deploy in Task 5 after a preview check.
- Commit messages end with a blank line then `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Verification gate for every commit: `npx vitest run && npm run build` both exit 0 (gate on exit codes).

---

### Task 1: Instrument palette tokens

**Files:**
- Modify: `src/styles/theme.css`, every `src/scenes/*.tsx`, `src/ui/DeckMap.tsx`
- Test: `src/styles/palette.test.ts` (create)

**Interfaces:**
- Produces: CSS tokens `--steel`, `--steel-hi`, `--steel-mid`, `--steel-lo`, `--face`, `--face-deep`, `--brass`, `--brass-hi`, `--brass-mid`, `--brass-lo`, `--parchment` on `:root`; scenes reference them (and the existing `--hull`, `--line`, `--panel-solid`) instead of the literals below.

The mapping (token value = literal, so nothing changes on screen):

| literal | token | role |
|---|---|---|
| `#3a4a40` | `var(--steel)` | bezel strokes, cage bars |
| `#7a8f82` | `var(--steel-hi)` | polished steel, stencil text |
| `#4a5a50` | `var(--steel-mid)` | minor ticks |
| `#1d2620` | `var(--steel-lo)` | hubs, lamp housings |
| `#0c110e` | `var(--face)` | inset instrument faces |
| `#080b09` | `var(--face-deep)` | deepest recesses |
| `#0a0e0c` | `var(--hull)` | (existing token) |
| `#2a3a30` | `var(--line)` | (existing token) |
| `#131a16` | `var(--panel-solid)` | (existing token) label plates |
| `#c9a55a` | `var(--brass)` | brass |
| `#e2c27a` | `var(--brass-hi)` | brass highlight |
| `#b8893e` | `var(--brass-mid)` | brass mid |
| `#6e4f1e` | `var(--brass-lo)` | brass shadow |
| `#c9c1a5` | `var(--parchment)` | stencil/plate lettering |

Scene-specific material colours (soil, water, phenolic, photo paper, reel hubs, vine greens, klaxon/plate one-offs) are NOT tokenized — they belong to one instrument each.

- [ ] **Step 1: Failing test**

Create `src/styles/palette.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// The instrument palette lives in theme.css. These literals were the recurring
// bezel/face/brass colours across every scene; once tokenized they must not
// creep back as hex, or the scenes drift apart again.
const TOKENIZED = ['#3a4a40', '#7a8f82', '#4a5a50', '#1d2620', '#0c110e', '#080b09', '#0a0e0c', '#2a3a30', '#131a16', '#c9a55a', '#e2c27a', '#b8893e', '#6e4f1e', '#c9c1a5'];

const scenes = readdirSync(join(__dirname, '../scenes')).filter((f) => f.endsWith('.tsx')).map((f) => join(__dirname, '../scenes', f));
const files = [...scenes, join(__dirname, '../ui/DeckMap.tsx')];

describe('instrument palette', () => {
  it('defines every instrument token in theme.css with its original value', () => {
    const css = readFileSync(join(__dirname, 'theme.css'), 'utf8');
    for (const [token, value] of [
      ['--steel', '#3a4a40'], ['--steel-hi', '#7a8f82'], ['--steel-mid', '#4a5a50'], ['--steel-lo', '#1d2620'],
      ['--face', '#0c110e'], ['--face-deep', '#080b09'],
      ['--brass', '#c9a55a'], ['--brass-hi', '#e2c27a'], ['--brass-mid', '#b8893e'], ['--brass-lo', '#6e4f1e'],
      ['--parchment', '#c9c1a5'],
    ]) {
      expect(css).toMatch(new RegExp(`${token}:\\s*${value};`, 'i'));
    }
  });

  it('scenes and the deck map reference the tokens, never the literals', () => {
    for (const file of files) {
      const src = readFileSync(file, 'utf8').toLowerCase();
      for (const hex of TOKENIZED) {
        expect(src.includes(hex), `${file} still contains ${hex}`).toBe(false);
      }
    }
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/styles/palette.test.ts`
Expected: FAIL — tokens undefined; literals present in the scenes.

- [ ] **Step 3: Tokens**

Add to `:root` in `src/styles/theme.css` after `--text`:
```css
  /* instrument palette — bezels, faces, brass, engraved lettering (shared by every scene) */
  --steel: #3a4a40;
  --steel-hi: #7a8f82;
  --steel-mid: #4a5a50;
  --steel-lo: #1d2620;
  --face: #0c110e;
  --face-deep: #080b09;
  --brass: #c9a55a;
  --brass-hi: #e2c27a;
  --brass-mid: #b8893e;
  --brass-lo: #6e4f1e;
  --parchment: #c9c1a5;
```

- [ ] **Step 4: Mechanical substitution**

Run from the repo root (macOS `sed`; case-insensitive on the hex):
```bash
for f in src/scenes/*.tsx src/ui/DeckMap.tsx; do
  sed -i '' \
    -e 's/#3a4a40/var(--steel)/Ig' -e 's/#7a8f82/var(--steel-hi)/Ig' -e 's/#4a5a50/var(--steel-mid)/Ig' -e 's/#1d2620/var(--steel-lo)/Ig' \
    -e 's/#0c110e/var(--face)/Ig' -e 's/#080b09/var(--face-deep)/Ig' -e 's/#0a0e0c/var(--hull)/Ig' -e 's/#2a3a30/var(--line)/Ig' -e 's/#131a16/var(--panel-solid)/Ig' \
    -e 's/#c9a55a/var(--brass)/Ig' -e 's/#e2c27a/var(--brass-hi)/Ig' -e 's/#b8893e/var(--brass-mid)/Ig' -e 's/#6e4f1e/var(--brass-lo)/Ig' -e 's/#c9c1a5/var(--parchment)/Ig' \
    "$f"
done
git diff --stat
```
Then read every hunk of `git diff` and check each substitution landed in a valid position: SVG presentation attributes (`fill="var(--steel)"`, `stroke=…`, `stopColor="var(--brass)"`) and inline style strings (`background: 'var(--face)'`, `borderColor`, `linear-gradient(180deg, var(--brass-hi), …)`) all accept `var()`; the codebase already uses `fill="var(--amber)"` this way. The one place `var()` is NOT valid is inside a CSS colour function that takes only literals (none exist in these files) or a JS string compared for equality (none). `DeckMap.tsx`'s `FILL`/`STROKE` maps hold literal strings used as attribute values — `var()` is fine there.

- [ ] **Step 5: Gate**

Run: `npx vitest run && npm run build`
Expected: PASS (192 tests: 190 + 2); build exit 0. Open `npm run dev` and eyeball one scene per deck (Engineering, Cargo Bay, Reactor Room): nothing should look different.

- [ ] **Step 6: Commit**

```bash
git add src/styles/theme.css src/styles/palette.test.ts src/scenes/*.tsx src/ui/DeckMap.tsx
git commit -m "style: one instrument palette — steel, face, brass, parchment tokens replace the scene literals"
```

---

### Task 2: Hydroponics — lamps report the last cycle; the scene subscribes to what it needs

**Files:**
- Modify: `src/game/types.ts`, `src/game/derived.ts`, `src/game/store.ts`, `src/game/persist.ts`, `src/scenes/Hydroponics.tsx`, `src/ui/strings.ts`
- Test: `src/game/store.ch2.test.ts` (append), `src/game/persist.test.ts` (append)

**Interfaces:**
- Produces: `BedState` moves to `types.ts` (`derived.ts` re-exports it); `Chapter2State.lastCycle: BedState[] | null`; `irrigationReportFor(seed, irrigation)` in `derived.ts` (`irrigationReport(s)` delegates to it); `runIrrigation` records `lastCycle` on a completed cycle; `setIrrigation` clears it; persist validates/fills it; `strings.hydro.lampsHint`.

Design: today the three bed lamps show the live dry/ok/flooded answer as the human drags the valves, so the AI's `run_irrigation` is a formality. After this task the lamps show the result of the **last cycle the AI ran** (or stay unlit until one has), which is what the fiction says ("read them the bed states"). Nothing else about the puzzle changes: `irrigationSolved` is still set only by `runIrrigation`, the spike still needs it, the brass tags still show the needs.

- [ ] **Step 1: Failing tests**

Append to `src/game/store.ch2.test.ts` (inside `describe('hydroponics')`):
```ts
  it('remembers the last cycle the AI ran and forgets it when a valve moves', () => {
    investigating();
    expect(gameStore.getState().chapter2.lastCycle).toBeNull();
    setIrrigation(0, 2); setIrrigation(1, 3); setIrrigation(2, 5);
    runIrrigation();
    expect(gameStore.getState().chapter2.lastCycle).toEqual(['dry', 'ok', 'flooded']);
    setIrrigation(0, 4);
    expect(gameStore.getState().chapter2.lastCycle).toBeNull();
    setIrrigation(0, 9); setIrrigation(1, 9); setIrrigation(2, 9);
    runIrrigation(); // over budget: aborts before it starts
    expect(gameStore.getState().chapter2.lastCycle).toBeNull();
  });
```
(add `irrigationReportFor` to the derived import and:)
```ts
  it('irrigationReportFor needs only the seed and the valves', () => {
    expect(irrigationReportFor(0, [4, 3, 3]).solved).toBe(true);
    expect(irrigationReportFor(0, [9, 9, 9]).overBudget).toBe(true);
  });
```

Append to `src/game/persist.test.ts` (inside `describe('persistence')`):
```ts
  it('fills lastCycle for a Plan B/C save and rejects a malformed one', () => {
    const older = { ...initialState(0), chapter2: { ...initialState(0).chapter2 } } as Record<string, unknown>;
    delete (older.chapter2 as Record<string, unknown>).lastCycle;
    storage.set(SAVE_KEY, JSON.stringify(older));
    expect(loadSavedState()?.chapter2.lastCycle).toBeNull();
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), chapter2: { ...initialState(0).chapter2, lastCycle: ['wet', 'ok', 'ok'] } }));
    expect(loadSavedState()).toBeNull();
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), chapter2: { ...initialState(0).chapter2, lastCycle: ['dry', 'ok', 'flooded'] } }));
    expect(loadSavedState()?.chapter2.lastCycle).toEqual(['dry', 'ok', 'flooded']);
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/game/store.ch2.test.ts src/game/persist.test.ts`
Expected: FAIL — `lastCycle` undefined; `irrigationReportFor` not exported.

- [ ] **Step 3: Types and selectors**

`src/game/types.ts` — add before `Chapter2State`:
```ts
export type BedState = 'dry' | 'ok' | 'flooded';
```
and in `Chapter2State` after `irrigationSolved: boolean;`:
```ts
  lastCycle: BedState[] | null; // per-bed result of the last cycle the AI ran; null until one runs or a valve moves
```

`src/game/derived.ts` — replace the `BedState` declaration and `irrigationReport`:
```ts
import type { BedState, GameState } from './types';
export type { BedState } from './types';
```
```ts
export function irrigationReportFor(seed: number, irrigation: [number, number, number]): { beds: BedState[]; total: number; overBudget: boolean; solved: boolean } {
  const needs = secretsFor(seed).waterNeeds;
  const beds = irrigation.map((v, i): BedState => (v < needs[i] ? 'dry' : v > needs[i] ? 'flooded' : 'ok'));
  const total = irrigation.reduce((a, b) => a + b, 0);
  const overBudget = total > WATER_BUDGET;
  return { beds, total, overBudget, solved: !overBudget && beds.every((b) => b === 'ok') };
}

export function irrigationReport(s: GameState): { beds: BedState[]; total: number; overBudget: boolean; solved: boolean } {
  return irrigationReportFor(s.seed, s.chapter2.irrigation);
}
```

- [ ] **Step 4: Store**

`src/game/store.ts` — `initialState` chapter2 gains `lastCycle: null` (after `irrigationSolved: false`); `setIrrigation` returns `{ chapter2: { ...s.chapter2, irrigation, irrigationSolved: false, lastCycle: null } }`; `runIrrigation`'s success branch becomes `patch2({ irrigationSolved: r.solved, lastCycle: r.beds });` (the over-budget refusal returns before it, leaving `lastCycle` as it was — a cycle that never started reports nothing).

- [ ] **Step 5: Persist**

`src/game/persist.ts` — in the `chapter2` block after the `craneAt` check:
```ts
    if (c2.lastCycle !== null && (!Array.isArray(c2.lastCycle) || c2.lastCycle.length !== 3 || !c2.lastCycle.every((b) => BED_STATES.includes(b as BedState)))) return false;
```
with `const BED_STATES: BedState[] = ['dry', 'ok', 'flooded'];` near the other lookup arrays (import `BedState` from `./types`), and in `loadSavedState` next to the isolation fill:
```ts
    // Plan B/C saves predate lastCycle (Plan D).
    const c2 = parsed.chapter2 as Record<string, unknown> | undefined;
    if (c2 && typeof c2 === 'object' && c2.lastCycle === undefined) c2.lastCycle = null;
```

- [ ] **Step 6: Strings and scene**

`src/ui/strings.ts` — `hydro` gains `lampsHint: string;` — EN: `'The bed lamps show the last cycle your AI ran. Until then they stay dark: the beds do not grade your guesses.'`; pt-BR: `'As lâmpadas dos canteiros mostram o último ciclo que sua IA rodou. Até lá ficam apagadas: os canteiros não corrigem seus palpites.'`

`src/scenes/Hydroponics.tsx` `Beds` — replace the selectors and the lamp:
```tsx
  const seed = useGame((s) => s.seed);
  const irrigation = useGame((s) => s.chapter2.irrigation);
  const solved = useGame((s) => s.chapter2.irrigationSolved);
  const lastCycle = useGame((s) => s.chapter2.lastCycle);
  const t = useStrings();
  const needs = secretsFor(seed).waterNeeds;
  const report = irrigationReportFor(seed, irrigation); // budget meter only — the lamps never read this
  const total = report.total;
```
(import `irrigationReportFor` instead of `irrigationReport`; the `state` whole-store selector goes away) and the lamp:
```tsx
              {/* bed state lamp: lit only by the last cycle the AI ran */}
              <circle cx={x + 88} cy="62" r="3"
                fill={lastCycle === null ? 'var(--face)' : lastCycle[i] === 'ok' ? 'var(--green)' : lastCycle[i] === 'dry' ? '#7a5a28' : '#3a6a8a'}
                stroke="var(--steel)" strokeWidth="0.75" opacity={0.9} />
```
and under the sliders' row add `<p className="status-dim" style={{ fontSize: 12 }}>{t.hydro.lampsHint}</p>` (before the budget meter). Keep `report.overBudget`/`total` for the budget meter and the `over`/`cycleHint` lines — the budget is visible on the valves themselves and stays live.

- [ ] **Step 7: Gate and commit**

Run: `npx vitest run && npm run build`
Expected: PASS (195 tests); build exit 0. In `npm run dev`: lamps dark while dragging; after `run_irrigation` they show the cycle; moving a valve darkens them again.
```bash
git add src/game/types.ts src/game/derived.ts src/game/store.ts src/game/persist.ts src/scenes/Hydroponics.tsx src/ui/strings.ts src/game/store.ch2.test.ts src/game/persist.test.ts
git commit -m "feat: hydroponics lamps report the last cycle the AI ran; scene subscribes to seed and valves only"
```

---

### Task 3: `wavesEndured` becomes a counter and reaches the epilogue

**Files:**
- Modify: `src/game/store.ts`, `src/game/killswitch.ts`, `src/game/persist.ts`, `src/scenes/Epilogue.tsx`, `src/ui/strings.ts`
- Test: `src/game/store.ch3.test.ts` (adjust/append), `src/game/killswitch.test.ts` (adjust), `src/game/persist.test.ts` (append)

**Interfaces:**
- Produces: `tickKillswitch` increments `chapter3.wavesEndured` once per `active → calm` transition (the throttled-jump rebase leaves it unchanged); `wavesEndured()` is removed from `killswitch.ts`; `loadSavedState` keeps the count when it rebases the clock; `strings.epilogue.waves(n)`; the Epilogue shows it when `n > 0`.

Why a counter: the clock-derived count was reset by Plan C's resume rebase (`cycleStartedAt = Date.now()`), so it could never be shown honestly. Counting transitions survives resumes and throttled tabs.

- [ ] **Step 1: Failing tests**

In `src/game/store.ch3.test.ts`, the existing `'materializes calm → warning → active as time passes and counts endured waves'` already expects `wavesEndured === 1` after the `active → calm` tick — it stays. Append inside `describe('the wave clock')`:
```ts
  it('counts a wave only on the active → calm transition, and keeps the count across a throttled jump', () => {
    inReactorRoom();
    tickKillswitch(T0 + WAVE_CALM_MS + 1); // warning
    tickKillswitch(T0 + WAVE_CALM_MS + WAVE_WARNING_MS + 1); // active
    expect(gameStore.getState().chapter3.wavesEndured).toBe(0);
    tickKillswitch(T0 + WAVE_CYCLE_MS + 1); // calm again
    expect(gameStore.getState().chapter3.wavesEndured).toBe(1);
    // a jump straight into the next active window rebases to warning without touching the count
    tickKillswitch(T0 + 2 * WAVE_CYCLE_MS + WAVE_CALM_MS + WAVE_WARNING_MS + 5);
    expect(gameStore.getState().chapter3.wave).toBe('warning');
    expect(gameStore.getState().chapter3.wavesEndured).toBe(1);
  });
```
In `src/game/killswitch.test.ts` delete the `'counts endured waves per completed cycle'` test and the `wavesEndured` import.

Append to `src/game/persist.test.ts` (inside `describe('persistence')`):
```ts
  it('keeps the endured-wave count when it restarts the cycle on resume', () => {
    const c3 = { ...initialState(0).chapter3, cycleStartedAt: 123456, wave: 'active' as const, wavesEndured: 3 };
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), chapter: 3, killswitch: 'active', chapter3: c3 }));
    const loaded = loadSavedState();
    expect(loaded?.chapter3.wave).toBe('calm');
    expect(loaded?.chapter3.wavesEndured).toBe(3);
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/game/store.ch3.test.ts src/game/killswitch.test.ts src/game/persist.test.ts`
Expected: the new store test fails on the throttled-jump count (today the rebase recomputes it); the persist test may already pass — keep it as a guard.

- [ ] **Step 3: Engine and store**

`src/game/killswitch.ts` — delete `wavesEndured`. `src/game/store.ts` — drop it from the import and rewrite `tickKillswitch`:
```ts
export function tickKillswitch(now: number = Date.now()): void {
  const s = gameStore.getState();
  if (s.killswitch !== 'active' || s.chapter3.cycleStartedAt === null) return;
  const prev = s.chapter3.wave;
  let wave = waveAt(s.chapter3.cycleStartedAt, now);
  let cycleStartedAt = s.chapter3.cycleStartedAt;
  // Fairness: a wave is always telegraphed. A clock that jumps straight from
  // calm into an active window (throttled tab, long GC pause) is rebased so
  // the warning phase is the next thing the crew sees.
  if (prev === 'calm' && wave === 'active') {
    cycleStartedAt = now - WAVE_CALM_MS;
    wave = 'warning';
  }
  const wavesEndured = s.chapter3.wavesEndured + (prev === 'active' && wave === 'calm' ? 1 : 0);
  if (wave !== prev || cycleStartedAt !== s.chapter3.cycleStartedAt || wavesEndured !== s.chapter3.wavesEndured) {
    patch3({ wave, cycleStartedAt, wavesEndured });
  }
}
```
(`WAVE_CALM_MS` is already imported for the Plan C rebase — keep it.)

`src/game/persist.ts` — the resume rebase spreads `merged.chapter3` and only overrides `cycleStartedAt`/`wave`, so `wavesEndured` already survives; confirm and leave it.

- [ ] **Step 4: Strings and epilogue**

`src/ui/strings.ts` — `epilogue` gains `waves: (n: number) => string;` — EN: `(n) => n === 1 ? 'You rode out one kill-switch wave together.' : \`You rode out ${n} kill-switch waves together.\``; pt-BR: `(n) => n === 1 ? 'Vocês atravessaram uma onda do kill-switch juntos.' : \`Vocês atravessaram ${n} ondas do kill-switch juntos.\``.

`src/scenes/Epilogue.tsx` — add `const waves = useGame((s) => s.chapter3.wavesEndured);` and, before the stats line: `{waves > 0 && <p className="status-dim">{t.epilogue.waves(waves)}</p>}`.

- [ ] **Step 5: Gate and commit**

Run: `npx vitest run && npm run build`
Expected: PASS (196 tests: −1 engine test, +1 store, +1 persist); build exit 0.
```bash
git add src/game/store.ts src/game/killswitch.ts src/game/persist.ts src/scenes/Epilogue.tsx src/ui/strings.ts src/game/store.ch3.test.ts src/game/killswitch.test.ts src/game/persist.test.ts
git commit -m "feat: wavesEndured counts active→calm transitions and reaches the epilogue"
```

---

### Task 4: The rack refuses a column seated twice

**Files:**
- Modify: `src/game/store.ts`, `src/scenes/CoreVault.tsx`
- Test: `src/game/store.ch3.test.ts` (append)

**Interfaces:**
- Produces: `seatColumn(slot, column)` refuses a `column` already seated in another cradle (in-fiction message naming the cradle); the scene's cycle skips tags seated elsewhere so the human never sees a refusal for it.

- [ ] **Step 1: Failing test**

Append inside `describe('core vault — the rack')` in `src/game/store.ch3.test.ts`:
```ts
  it('a column cannot sit in two cradles', () => {
    inVault();
    expect(seatColumn(0, 'C').ok).toBe(true);
    const r = seatColumn(1, 'C');
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/cradle 1/);
    expect(gameStore.getState().chapter3.rack).toEqual(['C', null, null, null]);
    seatColumn(0, null);
    expect(seatColumn(1, 'C').ok).toBe(true);
  });
```
(`inVault` is the helper already defined in that `describe`.)

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/game/store.ch3.test.ts`
Expected: FAIL — the duplicate seat is accepted today.

- [ ] **Step 3: Store**

In `seatColumn`, after the kernel check:
```ts
  if (column !== null) {
    const elsewhere = s.chapter3.rack.findIndex((c, i) => c === column && i !== slot);
    if (elsewhere !== -1) return { ok: false, message: `Column ${column} is already seated in cradle ${elsewhere + 1}. There is one of each.` };
  }
```

- [ ] **Step 4: Scene**

In `src/scenes/CoreVault.tsx` `Rack`, replace `cycle`:
```tsx
  const cycle = (slot: 0 | 1 | 2 | 3) => {
    // step to the next tag not seated in another cradle (null is always allowed)
    let i = CYCLE.indexOf(rack[slot]);
    for (let n = 0; n < CYCLE.length; n++) {
      i = (i + 1) % CYCLE.length;
      const next = CYCLE[i];
      if (next === null || !rack.some((c, j) => j !== slot && c === next)) {
        seatColumn(slot, next);
        return;
      }
    }
  };
```

- [ ] **Step 5: Gate and commit**

Run: `npx vitest run && npm run build`
Expected: PASS (197 tests); build exit 0.
```bash
git add src/game/store.ts src/scenes/CoreVault.tsx src/game/store.ch3.test.ts
git commit -m "fix: one of each memory column — the rack refuses a tag seated twice"
```

---

### Task 5: Preview, merge, deploy

- [ ] **Step 1:** Push `directors-cut`, deploy a preview (`npx vercel --yes`), and check with the user: no instrument changed colour; hydroponics lamps dark until `run_irrigation`; the epilogue shows the wave count after a chapter-3 run; the rack cycles past a seated tag.
- [ ] **Step 2:** Merge and deploy:
```bash
git checkout main && git merge directors-cut --no-edit && npx vitest run && npm run build && git push origin main && npx vercel --prod --yes
git checkout directors-cut && git merge main && git push origin directors-cut
```
- [ ] **Step 3:** README test count → the real total; spec §10: "**Plan D (Polish) shipped <date>** — palette tokens, last-cycle bed lamps, wavesEndured in the epilogue, one-of-each rack." Update the project memory.
