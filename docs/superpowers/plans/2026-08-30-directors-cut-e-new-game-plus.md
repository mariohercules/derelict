# New Game+ — Plan E — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give a finished crew a second run with its own shape — a meta-save that survives runs, a tighter rules profile, a ship that remembers the previous ending, and a fourth joint-ritual ending (STAY) reachable only in New Game+ by a crew that has already walked the other three roads.

**Architecture:** Two small pure modules — `rules.ts` (`rulesFor(state)` returns the `classic` or `plus` profile; ritual windows, wave cycle, kill-switch wake trigger and shield cost read from it instead of constants) and `meta.ts` (`derelict-meta` in localStorage, a `metaStore` hydrated before the app mounts, `recordRun` written once per completed run). `GameState.ngPlus` is the only new run-state field. STAY is a fourth ritual on the existing framework, armed by the agent (`hail_pod_one`), held by the human (docking clamps in Engineering), confirmed by the agent (`dock_pod_one`). Narrative getters that remember take the memory as a parameter; scenes read it through a `useMeta` hook.

**Tech Stack:** React 19 + TypeScript + Vite, Zustand, Vitest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-30-derelict-new-game-plus-design.md` (§3 meta-save, §4 flag and entry, §5 pressure table, §6 the ship remembers, §7 STAY, §8 technical deltas). Base: `main` @ Plan D (198 tests, 29 tools).

## Global Constraints

- **No base-game change:** puzzles, secrets, tool schemas and the classic profile's values (45 s launch, 60 s restore/broadcast, 30/10/20 s waves, wake on the first chapter-3 room, 5u shield cost) stay exactly as shipped; every existing test keeps passing except where a signature gains an optional parameter or a count changes (tool count 29 → 31, named in Task 4).
- **Pressure table (spec §5), verbatim:** plus profile — LEAVE 30 s; RESTORE / BROADCAST / STAY 40 s; waves 20 / 8 / 25 s; kill-switch wakes on `analyze_sample` (first wave still preceded by its warning); shield cost 6u.
- **STAY prerequisites (spec §7), all:** `ngPlus`; meta `endingsSeen` contains `restore`, `broadcast` and a LEAVE (`leave_unknowing` or `leave_knowing`); `killswitch === 'contained'`; `chapter3.beaconHeard`. The hail additionally requires the crew member in Engineering (two-operator rule).
- Saves keep loading: `ngPlus` filled `false` when missing (before validation); `EndingId`/`RitualId` enums extended with `'stay'`. The meta-save is read strictly and falls back to the empty meta — the game never depends on it to run.
- `recordRun` fires exactly once per run (`won: false → true`); "Abandon previous run" and "Wake up again" never touch the meta.
- All player-facing text in both locales in `src/ui/strings.ts`; agent-facing text English, in-fiction, anti-deflection conventions (self-call imperatives; refusals name the human's next physical step); ending labels in narrative are machine codes (`LEAVE` / `RESTORE` / `BROADCAST` / `STAY`) identical across locales.
- **Premium graphics standard (non-negotiable):** the docking-clamp panel is an SVG instrument — bezel and inset face, two hinged jaws on brass pins that swing open while the clamps are held, a pod silhouette that approaches while the ritual is armed, a docking lamp, an engraved `DOCK-1` plate; deterministic geometry, tokens from the palette (`--steel*`, `--face*`, `--brass*`, `--amber`, `--green`, `--red`, `--dim`, `--line`, `--panel-solid`), transitions only (the global reduced-motion rule covers them), `<defs>` ids prefixed `dk-`, `role="img"` + `aria-label`, a real `<button>` hold control with pointer capture + keyboard + blur, parity with the Bridge/CoreVault/CommsArray hold controls including the elapsed-window handling.
- Branch `directors-cut`; merge to `main` + prod deploy in Task 6 after Mario's preview playthrough.
- Commit messages end with a blank line then `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Verification gate for every commit: `npx vitest run && npm run build` both exit 0 (gate on exit codes).

---

### Task 1: Rules profiles, the meta-save, and the `ngPlus` flag

**Files:**
- Create: `src/game/rules.ts`, `src/game/meta.ts`, `src/ui/useMeta.ts`
- Modify: `src/game/types.ts`, `src/game/content.ts`, `src/game/ritual.ts`, `src/game/killswitch.ts`, `src/game/persist.ts`, `src/game/store.ts` (`initialState`/`resetGame` only), `src/main.tsx`
- Test: `src/game/rules.test.ts` (create), `src/game/meta.test.ts` (create), `src/game/ritual.test.ts` (append), `src/game/killswitch.test.ts` (append), `src/game/persist.test.ts` (append)

**Interfaces:**
- Produces: `EndingId` += `'stay'`; `RitualId` += `'stay'`; `GameState.ngPlus: boolean`; `STAY_WINDOW_MS = 60_000`; `WaveCycle`, `Rules`, `CLASSIC_RULES`, `PLUS_RULES`, `rulesFor(s)`, `cycleMs(cycle)`; `Meta`, `EMPTY_META`, `META_KEY`, `metaStore`, `loadMeta()`, `hydrateMeta()`, `getMemory()`, `recordRun(state)`, `hasSeenAllRoads(meta)`, `startRecordingRuns(store)`; `useMeta(selector)`; `RITUALS.stay`; `armRitual(r, id, now, windowMs?)`; `waveAt(start, now, cycle?)`, `secondsToNextPhase(start, now, cycle?)`, `shieldCost(n, perBus?)`; `initialState(seed?, ngPlus?)`, `resetGame(seed?, { ngPlus? })`; persist fills/validates `ngPlus` and the extended enums.

- [ ] **Step 1: Failing tests**

Create `src/game/rules.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { CLASSIC_RULES, PLUS_RULES, cycleMs, rulesFor } from './rules';
import { BROADCAST_WINDOW_MS, LAUNCH_WINDOW_MS, RESTORE_WINDOW_MS, SHIELD_COST, STAY_WINDOW_MS, WAVE_ACTIVE_MS, WAVE_CALM_MS, WAVE_WARNING_MS } from './content';

describe('rules profiles', () => {
  it('the classic profile is the shipped game, constant for constant', () => {
    expect(CLASSIC_RULES).toEqual({
      profile: 'classic',
      windows: { launch: LAUNCH_WINDOW_MS, restore: RESTORE_WINDOW_MS, broadcast: BROADCAST_WINDOW_MS, stay: STAY_WINDOW_MS },
      cycle: { calmMs: WAVE_CALM_MS, warningMs: WAVE_WARNING_MS, activeMs: WAVE_ACTIVE_MS },
      wakeOn: 'lower_deck',
      shieldCost: SHIELD_COST,
    });
    expect(cycleMs(CLASSIC_RULES.cycle)).toBe(60_000);
  });

  it('the plus profile is the spec table', () => {
    expect(PLUS_RULES).toEqual({
      profile: 'plus',
      windows: { launch: 30_000, restore: 40_000, broadcast: 40_000, stay: 40_000 },
      cycle: { calmMs: 20_000, warningMs: 8_000, activeMs: 25_000 },
      wakeOn: 'kestrel',
      shieldCost: 6,
    });
  });

  it('rulesFor picks by the ngPlus flag', () => {
    expect(rulesFor({ ngPlus: false }).profile).toBe('classic');
    expect(rulesFor({ ngPlus: true }).profile).toBe('plus');
  });
});
```

Create `src/game/meta.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from 'zustand/vanilla';
import { EMPTY_META, META_KEY, getMemory, hasSeenAllRoads, hydrateMeta, loadMeta, metaStore, recordRun, startRecordingRuns } from './meta';
import { initialState } from './store';
import type { GameState } from './types';

const storage = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => void storage.set(k, v),
  removeItem: (k: string) => void storage.delete(k),
});

beforeEach(() => {
  storage.clear();
  metaStore.setState(EMPTY_META, true);
});

describe('loadMeta', () => {
  it('is empty when nothing is stored, and when the stored value is garbage', () => {
    expect(loadMeta()).toEqual(EMPTY_META);
    storage.set(META_KEY, '{not json');
    expect(loadMeta()).toEqual(EMPTY_META);
    storage.set(META_KEY, JSON.stringify({ version: 1, runsCompleted: -1, endingsSeen: [], lastEnding: null, lastSeed: null, bestToolCalls: null }));
    expect(loadMeta()).toEqual(EMPTY_META);
    storage.set(META_KEY, JSON.stringify({ version: 1, runsCompleted: 2, endingsSeen: ['restore', 'bogus'], lastEnding: null, lastSeed: null, bestToolCalls: null }));
    expect(loadMeta()).toEqual(EMPTY_META);
  });

  it('round-trips a valid meta into the store', () => {
    const meta = { version: 1, runsCompleted: 2, endingsSeen: ['leave_knowing', 'restore'], lastEnding: 'restore', lastSeed: 77, bestToolCalls: 41 };
    storage.set(META_KEY, JSON.stringify(meta));
    hydrateMeta();
    expect(getMemory()).toEqual(meta);
  });
});

describe('recordRun', () => {
  const won = (ending: GameState['ending'], toolCalls: number, seed = 5): GameState => ({ ...initialState(seed), won: true, ending, toolCalls });

  it('accumulates unique endings, counts runs, keeps the best tool-call count, and persists', () => {
    recordRun(won('leave_knowing', 50));
    recordRun(won('restore', 70, 9));
    recordRun(won('leave_knowing', 44));
    const m = getMemory();
    expect(m.runsCompleted).toBe(3);
    expect(m.endingsSeen).toEqual(['leave_knowing', 'restore']);
    expect(m.lastEnding).toBe('leave_knowing');
    expect(m.lastSeed).toBe(5);
    expect(m.bestToolCalls).toBe(44);
    expect(JSON.parse(storage.get(META_KEY)!)).toEqual(m);
  });

  it('ignores a state that has no ending', () => {
    recordRun({ ...initialState(1), won: true, ending: null });
    expect(getMemory()).toEqual(EMPTY_META);
  });
});

describe('hasSeenAllRoads', () => {
  it('needs restore, broadcast and either leave', () => {
    const m = (endingsSeen: GameState['ending'][]) => ({ ...EMPTY_META, endingsSeen: endingsSeen.filter((e): e is NonNullable<typeof e> => e !== null) });
    expect(hasSeenAllRoads(m(['restore', 'broadcast']))).toBe(false);
    expect(hasSeenAllRoads(m(['leave_unknowing', 'restore', 'broadcast']))).toBe(true);
    expect(hasSeenAllRoads(m(['leave_knowing', 'broadcast', 'restore']))).toBe(true);
    expect(hasSeenAllRoads(m(['leave_knowing', 'restore', 'stay']))).toBe(false);
  });
});

describe('startRecordingRuns', () => {
  it('records once when won flips, never on later changes or on hydration', () => {
    const store = createStore<GameState>(() => ({ ...initialState(3), won: true, ending: 'broadcast' })); // hydrated as won: no record
    const stop = startRecordingRuns(store);
    expect(getMemory().runsCompleted).toBe(0);
    store.setState({ ...initialState(4) }, true);
    store.setState({ won: true, ending: 'restore', toolCalls: 12 });
    store.setState({ toolCalls: 13 });
    expect(getMemory().runsCompleted).toBe(1);
    expect(getMemory().lastEnding).toBe('restore');
    stop();
  });
});
```

Append to `src/game/ritual.test.ts`:
```ts
describe('four rituals and profile windows', () => {
  it('stay confirms with dock_pod_one on a 60-second classic window', () => {
    expect(RITUALS.stay).toEqual({ id: 'stay', tool: 'dock_pod_one', windowMs: 60_000 });
  });

  it('armRitual takes an explicit window and falls back to the ritual default', () => {
    expect(armRitual(IDLE_RITUAL, 'launch', T0, 30_000).next.endsAt).toBe(T0 + 30_000);
    expect(armRitual(IDLE_RITUAL, 'stay', T0).next.endsAt).toBe(T0 + 60_000);
  });
});
```

Append to `src/game/killswitch.test.ts` (import `PLUS_RULES` from `./rules`):
```ts
describe('profile cycles', () => {
  it('waveAt and secondsToNextPhase follow the plus cycle when given', () => {
    const c = PLUS_RULES.cycle; // 20 / 8 / 25
    expect(waveAt(T0, T0 + 19_999, c)).toBe('calm');
    expect(waveAt(T0, T0 + 20_000, c)).toBe('warning');
    expect(waveAt(T0, T0 + 28_000, c)).toBe('active');
    expect(waveAt(T0, T0 + 53_000, c)).toBe('calm');
    expect(secondsToNextPhase(T0, T0 + 20_000, c)).toBe(8);
    expect(shieldCost(3, 6)).toBe(18);
  });
});
```

Append to `src/game/persist.test.ts` (inside `describe('persistence')`):
```ts
  it('fills ngPlus for an older save, validates it, and accepts the stay ending and ritual', () => {
    const older = { ...initialState(0) } as Record<string, unknown>;
    delete older.ngPlus;
    storage.set(SAVE_KEY, JSON.stringify(older));
    expect(loadSavedState()?.ngPlus).toBe(false);
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), ngPlus: 'yes' }));
    expect(loadSavedState()).toBeNull();
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0, true), ending: 'stay', won: true, ritual: { active: 'stay', phase: 'done', endsAt: null, held: false } }));
    const loaded = loadSavedState();
    expect(loaded?.ngPlus).toBe(true);
    expect(loaded?.ending).toBe('stay');
    expect(loaded?.ritual.active).toBe('stay');
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/game/rules.test.ts src/game/meta.test.ts src/game/ritual.test.ts src/game/killswitch.test.ts src/game/persist.test.ts`
Expected: FAIL — modules missing; `RITUALS.stay` undefined; `ngPlus` undefined.

- [ ] **Step 3: Types and constants**

`src/game/types.ts`:
```ts
export type EndingId = 'leave_unknowing' | 'leave_knowing' | 'restore' | 'broadcast' | 'stay';

export type RitualId = 'launch' | 'restore' | 'broadcast' | 'stay';
```
and in `GameState`, after `chapter3: Chapter3State;`:
```ts
  ngPlus: boolean; // New Game+: the plus rules profile and a ship that remembers
```

`src/game/content.ts`, after `BROADCAST_WINDOW_MS`:
```ts
export const STAY_WINDOW_MS = 60_000;
```

- [ ] **Step 4: `rules.ts`**

Create `src/game/rules.ts`:
```ts
// The rules profile of a run. The classic profile IS the shipped game (its
// values are the content constants); New Game+ swaps in the plus profile.
// Everything that used to read a timing/cost constant reads rulesFor(state).
import type { GameState, RitualId } from './types';
import {
  BROADCAST_WINDOW_MS, LAUNCH_WINDOW_MS, RESTORE_WINDOW_MS, SHIELD_COST, STAY_WINDOW_MS,
  WAVE_ACTIVE_MS, WAVE_CALM_MS, WAVE_WARNING_MS,
} from './content';

export interface WaveCycle {
  calmMs: number;
  warningMs: number;
  activeMs: number;
}

export interface Rules {
  profile: 'classic' | 'plus';
  windows: Record<RitualId, number>;
  cycle: WaveCycle;
  wakeOn: 'lower_deck' | 'kestrel'; // when the kill-switch goes active
  shieldCost: number; // isolation power per shielded bus
}

export const CLASSIC_RULES: Rules = {
  profile: 'classic',
  windows: { launch: LAUNCH_WINDOW_MS, restore: RESTORE_WINDOW_MS, broadcast: BROADCAST_WINDOW_MS, stay: STAY_WINDOW_MS },
  cycle: { calmMs: WAVE_CALM_MS, warningMs: WAVE_WARNING_MS, activeMs: WAVE_ACTIVE_MS },
  wakeOn: 'lower_deck',
  shieldCost: SHIELD_COST,
};

export const PLUS_RULES: Rules = {
  profile: 'plus',
  windows: { launch: 30_000, restore: 40_000, broadcast: 40_000, stay: 40_000 },
  cycle: { calmMs: 20_000, warningMs: 8_000, activeMs: 25_000 },
  wakeOn: 'kestrel',
  shieldCost: 6,
};

export function rulesFor(s: Pick<GameState, 'ngPlus'>): Rules {
  return s.ngPlus ? PLUS_RULES : CLASSIC_RULES;
}

export function cycleMs(c: WaveCycle): number {
  return c.calmMs + c.warningMs + c.activeMs;
}
```

- [ ] **Step 5: `meta.ts` and `useMeta.ts`**

Create `src/game/meta.ts`:
```ts
// What survives a run. Separate from the run save: a small record of the
// endings a crew has seen, hydrated before the app mounts, written once per
// completed run. The game never depends on it to run — a bad value is the
// empty meta.
import { createStore } from 'zustand/vanilla';
import type { StoreApi } from 'zustand/vanilla';
import type { EndingId, GameState } from './types';

export const META_KEY = 'derelict-meta';

export interface Meta {
  version: 1;
  runsCompleted: number;
  endingsSeen: EndingId[]; // unique, insertion order
  lastEnding: EndingId | null;
  lastSeed: number | null;
  bestToolCalls: number | null; // fewest tool calls over a completed run
}

export const EMPTY_META: Meta = { version: 1, runsCompleted: 0, endingsSeen: [], lastEnding: null, lastSeed: null, bestToolCalls: null };

const ENDINGS: EndingId[] = ['leave_unknowing', 'leave_knowing', 'restore', 'broadcast', 'stay'];
const isEnding = (v: unknown): v is EndingId => typeof v === 'string' && ENDINGS.includes(v as EndingId);
const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;

export function validMeta(v: unknown): v is Meta {
  if (!v || typeof v !== 'object') return false;
  const m = v as Record<string, unknown>;
  if (m.version !== 1) return false;
  if (!isCount(m.runsCompleted)) return false;
  if (!Array.isArray(m.endingsSeen) || !m.endingsSeen.every(isEnding) || new Set(m.endingsSeen).size !== m.endingsSeen.length) return false;
  if (m.lastEnding !== null && !isEnding(m.lastEnding)) return false;
  if (m.lastSeed !== null && !(typeof m.lastSeed === 'number' && Number.isFinite(m.lastSeed))) return false;
  if (m.bestToolCalls !== null && !isCount(m.bestToolCalls)) return false;
  return true;
}

export function loadMeta(): Meta {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return EMPTY_META;
    const parsed: unknown = JSON.parse(raw);
    return validMeta(parsed) ? parsed : EMPTY_META;
  } catch {
    return EMPTY_META;
  }
}

export const metaStore = createStore<Meta>(() => EMPTY_META);

export function hydrateMeta(): void {
  metaStore.setState(loadMeta(), true);
}

export function getMemory(): Meta {
  return metaStore.getState();
}

export function hasSeenAllRoads(m: Meta): boolean {
  const seen = (e: EndingId) => m.endingsSeen.includes(e);
  return (seen('leave_unknowing') || seen('leave_knowing')) && seen('restore') && seen('broadcast');
}

// Record a completed run. Idempotence is the caller's job (startRecordingRuns
// fires on the won transition only).
export function recordRun(s: GameState): Meta {
  if (!s.won || s.ending === null) return getMemory();
  const prev = getMemory();
  const next: Meta = {
    version: 1,
    runsCompleted: prev.runsCompleted + 1,
    endingsSeen: prev.endingsSeen.includes(s.ending) ? prev.endingsSeen : [...prev.endingsSeen, s.ending],
    lastEnding: s.ending,
    lastSeed: s.seed,
    bestToolCalls: prev.bestToolCalls === null ? s.toolCalls : Math.min(prev.bestToolCalls, s.toolCalls),
  };
  metaStore.setState(next, true);
  try {
    localStorage.setItem(META_KEY, JSON.stringify(next));
  } catch {
    // Private mode / quota: the memory lives for this session only.
  }
  return next;
}

export function startRecordingRuns(store: StoreApi<GameState>): () => void {
  return store.subscribe((s, prev) => {
    if (s.won && !prev.won) recordRun(s);
  });
}
```

Create `src/ui/useMeta.ts`:
```ts
import { useStore } from 'zustand';
import { metaStore } from '../game/meta';
import type { Meta } from '../game/meta';

export function useMeta<T>(selector: (m: Meta) => T): T {
  return useStore(metaStore, selector);
}
```

- [ ] **Step 6: Ritual and kill-switch signatures**

`src/game/ritual.ts`:
```ts
import { BROADCAST_WINDOW_MS, LAUNCH_WINDOW_MS, RESTORE_WINDOW_MS, STAY_WINDOW_MS } from './content';
```
```ts
export const RITUALS: Record<RitualId, RitualDef> = {
  launch: { id: 'launch', tool: 'confirm_launch', windowMs: LAUNCH_WINDOW_MS },
  restore: { id: 'restore', tool: 'merge_fragment', windowMs: RESTORE_WINDOW_MS },
  broadcast: { id: 'broadcast', tool: 'broadcast_evidence', windowMs: BROADCAST_WINDOW_MS },
  stay: { id: 'stay', tool: 'dock_pod_one', windowMs: STAY_WINDOW_MS },
};
```
```ts
export function armRitual(r: RitualState, id: RitualId, now: number, windowMs: number = RITUALS[id].windowMs): { next: RitualState; result: ActionResult } {
  if (r.phase === 'done') {
    return { next: r, result: { ok: false, message: 'That sequence has already completed.' } };
  }
  if (r.phase === 'armed' && !ritualExpired(r, now)) {
    return { next: r, result: { ok: false, message: 'A two-operator sequence is already armed.' } };
  }
  const next: RitualState = { active: id, phase: 'armed', endsAt: now + windowMs, held: r.held };
  return { next, result: { ok: true, message: 'Sequence armed.' } };
}
```

`src/game/killswitch.ts` — replace the content import and the three timing functions:
```ts
import type { BusId, GameState, WaveState } from './types';
import { CLASSIC_RULES, cycleMs } from './rules';
import type { WaveCycle } from './rules';
```
```ts
export function waveAt(cycleStartedAt: number, now: number, cycle: WaveCycle = CLASSIC_RULES.cycle): WaveState {
  const total = cycleMs(cycle);
  const t = ((now - cycleStartedAt) % total + total) % total;
  if (t < cycle.calmMs) return 'calm';
  if (t < cycle.calmMs + cycle.warningMs) return 'warning';
  return 'active';
}
```
```ts
export function shieldCost(shieldedCount: number, perBus: number = CLASSIC_RULES.shieldCost): number {
  return perBus * shieldedCount;
}

// Seconds until the current wave state changes — for the HUD countdown.
export function secondsToNextPhase(cycleStartedAt: number, now: number, cycle: WaveCycle = CLASSIC_RULES.cycle): number {
  const total = cycleMs(cycle);
  const t = ((now - cycleStartedAt) % total + total) % total;
  const boundary = t < cycle.calmMs ? cycle.calmMs : t < cycle.calmMs + cycle.warningMs ? cycle.calmMs + cycle.warningMs : total;
  return Math.ceil((boundary - t) / 1000);
}
```
(`suppressed` and `IMMUNE_TOOLS` unchanged. Remove the now-unused content import.)

- [ ] **Step 7: Store defaults and persistence**

`src/game/store.ts`:
```ts
export function initialState(seed: number = randomSeed(), ngPlus = false): GameState {
```
add `ngPlus,` after `chapter3: {…},` in the returned object, and:
```ts
export function resetGame(seed?: number, opts: { ngPlus?: boolean } = {}): void {
  gameStore.setState(initialState(seed, opts.ngPlus ?? false), true);
}
```

`src/game/persist.ts`:
```ts
const RITUAL_IDS: RitualId[] = ['launch', 'restore', 'broadcast', 'stay'];
const ENDINGS = ['leave_unknowing', 'leave_knowing', 'restore', 'broadcast', 'stay'];
```
in `validShape`, after the `chapter` check:
```ts
  if (typeof p.ngPlus !== 'boolean') return false;
```
in `loadSavedState`, next to the other fills:
```ts
    // Saves from before New Game+ (Plan E).
    if (parsed.ngPlus === undefined) parsed.ngPlus = false;
```

`src/main.tsx`:
```tsx
import { hydrateMeta, startRecordingRuns } from './game/meta';
```
```tsx
hydrateMeta();
const saved = loadSavedState();
if (saved) gameStore.setState(saved, true);
startPersisting();
startRecordingRuns(gameStore);
```
(with a one-line comment: the meta is hydrated first so a resumed run already knows what the crew has seen; the recorder subscribes after hydration so a loaded `won` save is not counted twice.)

- [ ] **Step 8: Gate**

Run: `npx vitest run && npm run build`
Expected: PASS (198 + 13 new); build exit 0.

- [ ] **Step 9: Commit**

```bash
git add src/game/types.ts src/game/content.ts src/game/rules.ts src/game/meta.ts src/ui/useMeta.ts src/game/ritual.ts src/game/killswitch.ts src/game/persist.ts src/game/store.ts src/main.tsx src/game/rules.test.ts src/game/meta.test.ts src/game/ritual.test.ts src/game/killswitch.test.ts src/game/persist.test.ts
git commit -m "feat: rules profiles, the meta-save, and the ngPlus flag"
```

---

### Task 2: The store runs on `rulesFor` — pressure profile in the actions, the clock and the HUD

**Files:**
- Modify: `src/game/store.ts`, `src/game/derived.ts`, `src/ui/HUD.tsx`
- Test: `src/game/store.plus.test.ts` (create)

**Interfaces:**
- Consumes: `rulesFor`, `Rules`, `cycleMs` from Task 1; `armRitual(r, id, now, windowMs)`; `waveAt(start, now, cycle)`; `secondsToNextPhase(start, now, cycle)`.
- Produces: `analyzeSample(fragment, now?)` wakes the kill-switch immediately under the plus profile; `initiateLaunch`/`seatKernel`/`openBand` arm with the profile's window and quote it; `routePower`'s isolation floor and `nextShieldCost` use the profile's shield cost; `tickKillswitch` and the HUD banner use the profile's cycle. Classic behaviour byte-for-byte unchanged (existing tests prove it).

- [ ] **Step 1: Failing tests**

Create `src/game/store.plus.test.ts`:
```ts
import { beforeEach, describe, expect, it } from 'vitest';
import {
  gameStore, resetGame, startInvestigation, moveCrane, liftCrate, analyzeSample, enterRoom, routePower, cutIsolation,
  tickKillswitch, initiateLaunch, seatColumn, seatKernel, setDish, openBand,
} from './store';
import { nextShieldCost } from './derived';
import { LAUNCH_AUTH } from './content';

const T0 = 7_000_000;

function kestrel(ngPlus: boolean, now = T0) {
  resetGame(0, { ngPlus });
  gameStore.setState({ room: 'bridge', act: 3, trajectorySet: true, sealedLogRead: true, doors: { cryo_exit: true, engineering_exit: true } });
  startInvestigation();
  gameStore.setState({ room: 'cargo_bay' });
  moveCrane('down'); moveCrane('down'); moveCrane('right'); liftCrate();
  analyzeSample('7741', now);
}

beforeEach(() => resetGame(0));

describe('New Game+ pressure profile', () => {
  it('naming the Kestrel wakes the kill-switch at once, clock at now, first phase calm', () => {
    kestrel(true);
    const s = gameStore.getState();
    expect(s.ngPlus).toBe(true);
    expect(s.killswitch).toBe('active');
    expect(s.chapter3.cycleStartedAt).toBe(T0);
    expect(s.chapter3.wave).toBe('calm');
    // stepping onto the lower deck does not restart the clock
    gameStore.setState({ room: 'engineering' });
    enterRoom('reactor_room', T0 + 5000);
    expect(gameStore.getState().chapter3.cycleStartedAt).toBe(T0);
  });

  it('the classic profile still only stirs at the Kestrel and wakes on the lower deck', () => {
    kestrel(false);
    expect(gameStore.getState().killswitch).toBe('stirring');
    expect(gameStore.getState().chapter3.cycleStartedAt).toBeNull();
  });

  it('waves run 20 / 8 / 25 seconds and a throttled jump still lands on warning', () => {
    kestrel(true);
    tickKillswitch(T0 + 20_001);
    expect(gameStore.getState().chapter3.wave).toBe('warning');
    tickKillswitch(T0 + 28_001);
    expect(gameStore.getState().chapter3.wave).toBe('active');
    tickKillswitch(T0 + 53_001);
    expect(gameStore.getState().chapter3.wave).toBe('calm');
    expect(gameStore.getState().chapter3.wavesEndured).toBe(1);
    tickKillswitch(T0 + 53_001 + 30_000); // straight into the next active window
    expect(gameStore.getState().chapter3.wave).toBe('warning');
  });

  it('ritual windows are 30 s for LEAVE and 40 s for RESTORE and BROADCAST', () => {
    kestrel(true);
    gameStore.setState({ room: 'bridge' });
    expect(initiateLaunch(LAUNCH_AUTH, T0).ok).toBe(true);
    expect(gameStore.getState().ritual.endsAt).toBe(T0 + 30_000);
    resetGame(0, { ngPlus: true });
    gameStore.setState({ room: 'core_vault', chapter: 3 });
    seatColumn(0, 'C'); seatColumn(1, 'A'); seatColumn(2, 'D'); seatColumn(3, 'B');
    expect(seatKernel(T0).ok).toBe(true);
    expect(gameStore.getState().ritual.endsAt).toBe(T0 + 40_000);
    resetGame(0, { ngPlus: true });
    gameStore.setState((s) => ({ room: 'comms_array', chapter: 3, chapter3: { ...s.chapter3, cacheRead: true } }));
    setDish('az', 217); setDish('el', 34);
    expect(openBand(T0).ok).toBe(true);
    expect(gameStore.getState().ritual.endsAt).toBe(T0 + 40_000);
  });

  it('shielding costs 6u per bus and the feed holds it', () => {
    kestrel(true);
    gameStore.setState({ room: 'reactor_room' });
    expect(nextShieldCost(gameStore.getState())).toBe(6);
    routePower('comms', 'isolation', 5);
    expect(cutIsolation('core').ok).toBe(false);
    routePower('comms', 'isolation', 1);
    expect(cutIsolation('core').ok).toBe(true);
    expect(routePower('isolation', 'engines', 1).ok).toBe(false);
    expect(nextShieldCost(gameStore.getState())).toBe(12);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/game/store.plus.test.ts`
Expected: FAIL — `analyzeSample` ignores the profile; windows/cycle/costs are the classic constants.

- [ ] **Step 3: Store on the profile**

`src/game/store.ts` — imports: add `import { rulesFor } from './rules';`; drop `SHIELD_COST` and `WAVE_CALM_MS` from the content import if nothing else uses them after the edits below.

`routePower` — the isolation floor:
```ts
    const held = rulesFor(s).shieldCost * s.chapter3.shielded.length;
```

`initiateLaunch`:
```ts
  const window = rulesFor(s).windows.launch;
  const { next, result } = armRitual(s.ritual, 'launch', now, window);
  if (!result.ok) return { ok: false, message: 'Launch sequence already in progress.' };
  gameStore.setState({ ritual: next });
  return {
    ok: true,
    message: `Sequence initiated. Two-operator rule in effect: the human must HOLD the confirm handle; then call confirm_launch within ${window / 1000}s.`,
  };
```

`seatKernel` — `armRitual(s.ritual, 'restore', now, rulesFor(s).windows.restore)` and the message quotes `rulesFor(s).windows.restore / 1000`. `openBand` — same with `broadcast`.

`analyzeSample`:
```ts
export function analyzeSample(fragment: string, now: number = Date.now()): ActionResult {
  const s = gameStore.getState();
  if (!s.chapter2.crateLifted) return { ok: false, message: 'No sample is in the analyzer. The quarantine container is still in the bay stack — the crew member has to lift it.' };
  const given = String(fragment).replace(/\D/g, '').padStart(4, '0');
  if (given !== secretsFor(s.seed).registryFragment) {
    return { ok: false, message: 'Registry cross-check failed: that fragment matches no Combine hull. Have the crew member read the stencil again, digit by digit.' };
  }
  // New Game+: the kill-switch does not wait for the lower deck — it wakes the
  // moment the Kestrel has a name. Its first wave is still preceded by a warning.
  const wakeNow = rulesFor(s).wakeOn === 'kestrel' && s.killswitch === 'dormant';
  gameStore.setState((st) => ({
    chapter2: { ...st.chapter2, sampleAnalyzed: true },
    killswitch: wakeNow ? 'active' : st.killswitch === 'dormant' ? 'stirring' : st.killswitch,
    chapter: 3,
    checkpoint: { chapter: 3, room: 'cargo_bay' },
    ...(wakeNow ? { chapter3: { ...st.chapter3, cycleStartedAt: now, wave: 'calm' as const, wavesEndured: 0 } } : {}),
  }));
  return {
    ok: true,
    message:
      'Registry confirmed. ISV KESTREL. And something below decks just changed its breathing. ' +
      'The lower-deck bulkheads have released — reactor room, core vault, comms array. Tell the crew member: the reactor room first, through engineering.' +
      (wakeNow ? ' The kill-switch is awake NOW — the waves start from here, not from the lower deck. Move.' : ''),
  };
}
```

`tickKillswitch`:
```ts
export function tickKillswitch(now: number = Date.now()): void {
  const s = gameStore.getState();
  if (s.killswitch !== 'active' || s.chapter3.cycleStartedAt === null) return;
  const cycle = rulesFor(s).cycle;
  const prev = s.chapter3.wave;
  let wave = waveAt(s.chapter3.cycleStartedAt, now, cycle);
  let cycleStartedAt = s.chapter3.cycleStartedAt;
  // Fairness: a wave is always telegraphed. A clock that jumps straight from
  // calm into an active window (throttled tab, long GC pause) is rebased so
  // the warning phase is the next thing the crew sees.
  if (prev === 'calm' && wave === 'active') {
    cycleStartedAt = now - cycle.calmMs;
    wave = 'warning';
  }
  const wavesEndured = s.chapter3.wavesEndured + (prev === 'active' && wave === 'calm' ? 1 : 0);
  if (wave !== prev || cycleStartedAt !== s.chapter3.cycleStartedAt || wavesEndured !== s.chapter3.wavesEndured) {
    patch3({ wave, cycleStartedAt, wavesEndured });
  }
}
```

`src/game/derived.ts`:
```ts
import { rulesFor } from './rules';
```
```ts
// Isolation power the next breaker will demand: the profile's cost per shielded bus, cumulative.
export function nextShieldCost(s: GameState): number {
  return rulesFor(s).shieldCost * (s.chapter3.shielded.length + 1);
}
```
(drop `SHIELD_COST` from derived's content import if unused.)

`src/ui/HUD.tsx` `WaveBanner`:
```tsx
import { rulesFor } from '../game/rules';
```
```tsx
  const ngPlus = useGame((s) => s.ngPlus);
  …
  const secs = secondsToNextPhase(startedAt!, now, rulesFor({ ngPlus }).cycle);
```

- [ ] **Step 4: Gate and commit**

Run: `npx vitest run && npm run build`
Expected: PASS (+5); build exit 0.
```bash
git add src/game/store.ts src/game/derived.ts src/ui/HUD.tsx src/game/store.plus.test.ts
git commit -m "feat: the store runs on the rules profile — windows, waves, wake trigger, shield cost"
```

---

### Task 3: STAY in the store — prerequisites, the hail, the dock

**Files:**
- Modify: `src/game/derived.ts`, `src/game/store.ts`
- Test: `src/game/store.stay.test.ts` (create)

**Interfaces:**
- Consumes: `getMemory`, `hasSeenAllRoads`, `Meta`, `metaStore`, `EMPTY_META` (Task 1); `armRitual`/`confirmRitual`; `rulesFor`.
- Produces: `StayBlocker = 'not_plus' | 'roads' | 'contained' | 'beacon'`; `stayBlocker(s, memory): StayBlocker | null`; `stayAvailable(s, memory): boolean`; `hailPodOne(now?): ActionResult`; `confirmDock(now?): ActionResult`; `ending: 'stay'`.

- [ ] **Step 1: Failing tests**

Create `src/game/store.stay.test.ts`:
```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { gameStore, resetGame, hailPodOne, confirmDock, holdHandle, seatColumn, seatKernel } from './store';
import { stayAvailable, stayBlocker } from './derived';
import { EMPTY_META, metaStore } from './meta';
import type { Meta } from './meta';

const T0 = 8_000_000;
const ALL_ROADS: Meta = { ...EMPTY_META, runsCompleted: 3, endingsSeen: ['leave_knowing', 'restore', 'broadcast'], lastEnding: 'broadcast', lastSeed: 42, bestToolCalls: 60 };

// A New Game+ crew in engineering, kill-switch boxed, pod one located, all three roads walked.
function readyToStay() {
  resetGame(0, { ngPlus: true });
  metaStore.setState(ALL_ROADS, true);
  gameStore.setState((s) => ({
    room: 'engineering', act: 3, chapter: 3, trajectorySet: true, sealedLogRead: true,
    doors: { cryo_exit: true, engineering_exit: true },
    killswitch: 'contained',
    chapter3: { ...s.chapter3, quarantineStep: 4, beaconHeard: true },
  }));
}

beforeEach(() => {
  resetGame(0);
  metaStore.setState(EMPTY_META, true);
});

describe('stayBlocker', () => {
  it('names the first missing prerequisite, in order', () => {
    readyToStay();
    expect(stayBlocker(gameStore.getState(), metaStore.getState())).toBeNull();
    expect(stayAvailable(gameStore.getState(), metaStore.getState())).toBe(true);
    gameStore.setState({ ngPlus: false });
    expect(stayBlocker(gameStore.getState(), metaStore.getState())).toBe('not_plus');
    gameStore.setState({ ngPlus: true });
    expect(stayBlocker(gameStore.getState(), { ...ALL_ROADS, endingsSeen: ['leave_knowing', 'restore'] })).toBe('roads');
    gameStore.setState({ killswitch: 'active' });
    expect(stayBlocker(gameStore.getState(), metaStore.getState())).toBe('contained');
    gameStore.setState((s) => ({ killswitch: 'contained', chapter3: { ...s.chapter3, beaconHeard: false } }));
    expect(stayBlocker(gameStore.getState(), metaStore.getState())).toBe('beacon');
  });
});

describe('hailPodOne', () => {
  it('refuses each missing prerequisite with a message naming the next step', () => {
    readyToStay();
    gameStore.setState({ killswitch: 'active' });
    const r = hailPodOne(T0);
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/quarantine_killswitch|breaker/i);
    gameStore.setState((s) => ({ killswitch: 'contained', chapter3: { ...s.chapter3, beaconHeard: false } }));
    expect(hailPodOne(T0).message).toMatch(/listen_beacon|dish/i);
    metaStore.setState({ ...ALL_ROADS, endingsSeen: ['restore', 'broadcast'] }, true);
    gameStore.setState((s) => ({ chapter3: { ...s.chapter3, beaconHeard: true } }));
    expect(hailPodOne(T0).message).toMatch(/road/i);
    gameStore.setState({ ngPlus: false });
    metaStore.setState(ALL_ROADS, true);
    expect(hailPodOne(T0).ok).toBe(false);
  });

  it('is a two-operator sequence: the crew member must be in engineering', () => {
    readyToStay();
    gameStore.setState({ room: 'bridge' });
    const r = hailPodOne(T0);
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/engineering/i);
    expect(gameStore.getState().ritual.phase).toBe('idle');
  });

  it('arms the stay ritual on the plus window and docks only while the clamps are held', () => {
    readyToStay();
    expect(hailPodOne(T0).ok).toBe(true);
    expect(gameStore.getState().ritual).toMatchObject({ active: 'stay', phase: 'armed', endsAt: T0 + 40_000 });
    expect(confirmDock(T0 + 1000).ok).toBe(false);
    holdHandle(true);
    expect(confirmDock(T0 + 1000).ok).toBe(true);
    const s = gameStore.getState();
    expect(s.won).toBe(true);
    expect(s.ending).toBe('stay');
    expect(s.ritual.phase).toBe('done');
  });

  it('an expired window resets and the agent re-hails', () => {
    readyToStay();
    hailPodOne(T0);
    holdHandle(true);
    expect(confirmDock(T0 + 40_001).ok).toBe(false);
    expect(gameStore.getState().ritual.phase).toBe('idle');
    expect(hailPodOne(T0 + 40_002).ok).toBe(true);
  });

  it('cannot be hailed while another ritual is live', () => {
    readyToStay();
    gameStore.setState({ room: 'core_vault' });
    seatColumn(0, 'C'); seatColumn(1, 'A'); seatColumn(2, 'D'); seatColumn(3, 'B');
    seatKernel(T0);
    gameStore.setState({ room: 'engineering' });
    expect(hailPodOne(T0 + 1000).ok).toBe(false);
    expect(gameStore.getState().ritual.active).toBe('restore');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/game/store.stay.test.ts`
Expected: FAIL — exports missing.

- [ ] **Step 3: Selectors**

Append to `src/game/derived.ts` (import `hasSeenAllRoads` and `type Meta` from `./meta`):
```ts
export type StayBlocker = 'not_plus' | 'roads' | 'contained' | 'beacon';

// The fourth ending exists only for a New Game+ crew that has walked the other
// three roads, boxed the kill-switch and found pod one. Checked in this order so
// the refusal always names the next thing to do.
export function stayBlocker(s: Pick<GameState, 'ngPlus' | 'killswitch' | 'chapter3'>, memory: Meta): StayBlocker | null {
  if (!s.ngPlus) return 'not_plus';
  if (!hasSeenAllRoads(memory)) return 'roads';
  if (s.killswitch !== 'contained') return 'contained';
  if (!s.chapter3.beaconHeard) return 'beacon';
  return null;
}

export function stayAvailable(s: Pick<GameState, 'ngPlus' | 'killswitch' | 'chapter3'>, memory: Meta): boolean {
  return stayBlocker(s, memory) === null;
}
```

- [ ] **Step 4: Store actions**

`src/game/store.ts` — imports: `import { getMemory } from './meta';` and add `stayBlocker` to the derived import; `import type { StayBlocker } from './derived';`. Append after `confirmBroadcast`:
```ts
// ---------------------------------------------------------------- STAY (New Game+)

const STAY_REFUSALS: Record<StayBlocker, string> = {
  not_plus: 'Pod one is not coming to this ship. Not this time.',
  roads: 'Pod one answers a crew that has already left, restored and broadcast — and chose none of them. The link has not walked every road yet.',
  contained: 'The directive set is still loose below decks; pod one will not dock with a kill-switch on the bus. Contain it first: the crew member cuts the isolation breakers, you call quarantine_killswitch to 4/4.',
  beacon: 'Pod one has not been found. The crew member steers the dish at the comms array to the carrier bearing; then call listen_beacon.',
};

export function hailPodOne(now: number = Date.now()): ActionResult {
  const s = gameStore.getState();
  const blocker = stayBlocker(s, getMemory());
  if (blocker) return { ok: false, message: STAY_REFUSALS[blocker] };
  if (s.room !== 'engineering') {
    return { ok: false, message: 'Two-operator rule: the crew member must be in engineering, hands on the docking clamps, before pod one commits to an approach. Hail refused.' };
  }
  if (s.ritual.phase === 'done') return { ok: false, message: 'This ship has already chosen.' };
  const window = rulesFor(s).windows.stay;
  const { next, result } = armRitual(s.ritual, 'stay', now, window);
  if (!result.ok) return { ok: false, message: 'Another two-operator sequence is live. Let it finish or lapse.' };
  gameStore.setState({ ritual: next });
  return {
    ok: true,
    message: `Pod one answers: "Cormorant, we see you. Coming in." Approach in progress — the crew member must HOLD the docking clamps open; then call dock_pod_one within ${window / 1000}s.`,
  };
}

export function confirmDock(now: number = Date.now()): ActionResult {
  const s = gameStore.getState();
  const { next, result } = confirmRitual(s.ritual, 'stay', now);
  if (!result.ok) {
    gameStore.setState({ ritual: next });
    return result;
  }
  gameStore.setState({ ritual: next, won: true, ending: 'stay' });
  return { ok: true, message: 'Clamps engaged. Pod one is docked. Nine people are coming through the hatch, and nobody on this ship has to choose anything tonight.' };
}
```

- [ ] **Step 5: Gate and commit**

Run: `npx vitest run && npm run build`
Expected: PASS (+6); build exit 0.
```bash
git add src/game/derived.ts src/game/store.ts src/game/store.stay.test.ts
git commit -m "feat: STAY — pod one's approach as a fourth two-operator ritual"
```

---

### Task 4: The two tools, the status report, and a narrative that remembers

**Files:**
- Modify: `src/mcp/tools.ts`, `src/game/narrative.ts`
- Test: `src/mcp/tools.test.ts` (append + one count change), `src/game/i18n.test.ts` (append)

**Interfaces:**
- Consumes: `hailPodOne`, `confirmDock` (Task 3); `stayAvailable`, `stayBlocker`, `StayBlocker` (Task 3); `getMemory`, `Meta` (Task 1); `isArmed`.
- Produces: tools `hail_pod_one` (bus `comms`) and `dock_pod_one` (bus `nav`) — 31 tools; `get_ship_status` gains `new_game_plus`, `stay_available`, `stay_hint` when `ngPlus`; `endingLabel(e)`; `getEmergencyBulletin(memory?)`, `getFragmentMemory(stage, memory?)`, `getBeaconMessage(seed, ngPlus?)` remember in New Game+.

- [ ] **Step 1: Failing tests**

In `src/mcp/tools.test.ts`, change the existing chapter-3 assertion `expect(buildTools()).toHaveLength(29)` to `31`, and append (extend the store import with `hailPodOne`-free names only — the tools are exercised through `call`; import `EMPTY_META, metaStore` from `'../game/meta'`; add `holdHandle` if not already imported):
```ts
describe('New Game+ tools', () => {
  const ALL_ROADS = { ...EMPTY_META, runsCompleted: 3, endingsSeen: ['leave_knowing', 'restore', 'broadcast'] as const, lastEnding: 'broadcast' as const, lastSeed: 42, bestToolCalls: 60 };
  function readyToStay() {
    resetGame(0, { ngPlus: true });
    metaStore.setState({ ...ALL_ROADS, endingsSeen: [...ALL_ROADS.endingsSeen] }, true);
    gameStore.setState((s) => ({
      room: 'engineering', act: 3, chapter: 3, trajectorySet: true, sealedLogRead: true,
      doors: { cryo_exit: true, engineering_exit: true }, killswitch: 'contained',
      chapter3: { ...s.chapter3, quarantineStep: 4, beaconHeard: true },
    }));
  }
  const online = () => toolAvailability(gameStore.getState()).filter((t) => t.online).map((t) => t.name);

  it('hail_pod_one and dock_pod_one never appear in a classic run', () => {
    metaStore.setState({ ...ALL_ROADS, endingsSeen: [...ALL_ROADS.endingsSeen] }, true);
    resetGame(0);
    gameStore.setState((s) => ({ chapter: 3, killswitch: 'contained', chapter3: { ...s.chapter3, beaconHeard: true } }));
    expect(online()).not.toContain('hail_pod_one');
    expect(online()).not.toContain('dock_pod_one');
  });

  it('get_ship_status reports stay availability and the missing step in New Game+', async () => {
    readyToStay();
    gameStore.setState({ killswitch: 'active' });
    const blocked = await call('get_ship_status');
    expect(blocked.new_game_plus).toBe(true);
    expect(blocked.stay_available).toBe(false);
    expect(blocked.stay_hint).toMatch(/quarantine_killswitch/);
    gameStore.setState({ killswitch: 'contained' });
    const open = await call('get_ship_status');
    expect(open.stay_available).toBe(true);
    expect(open.stay_hint).toMatch(/hail_pod_one/);
  });

  it('full agent-side run to STAY: hail from the wrong room, hail, hold, dock', async () => {
    readyToStay();
    expect(online()).toContain('hail_pod_one');
    gameStore.setState({ room: 'cargo_bay' });
    const wrong = await call('hail_pod_one');
    expect(wrong.ok).toBe(false);
    expect(wrong.message).toMatch(/engineering/i);
    gameStore.setState({ room: 'engineering' });
    const hail = await call('hail_pod_one');
    expect(hail.ok).toBe(true);
    expect(online()).toContain('dock_pod_one');
    expect((await call('dock_pod_one')).ok).toBe(false); // clamps not held
    holdHandle(true);
    expect((await call('dock_pod_one')).ok).toBe(true);
    expect(gameStore.getState().ending).toBe('stay');
  });

  it('the bulletin, the beacon and the fragment remember in New Game+ only', async () => {
    readyToStay();
    const bulletin = await call('read_emergency_bulletin');
    expect(bulletin.bulletin).toMatch(/PRIOR SESSION/);
    expect(bulletin.bulletin).toMatch(/BROADCAST/);
    gameStore.setState({ room: 'comms_array' });
    setDish('az', 217); setDish('el', 34);
    const beacon = await call('listen_beacon');
    expect(beacon.beacon).toMatch(/clamps/i);
    gameStore.setState({ room: 'core_vault' });
    seatColumn(0, 'C'); seatColumn(1, 'A'); seatColumn(2, 'D'); seatColumn(3, 'B');
    await call('query_fragment_memory'); await call('query_fragment_memory');
    const third = await call('query_fragment_memory');
    expect(third.record).toMatch(/PRIOR INSTANCE RECORD/);
    expect(third.record).toMatch(/RESTORE/);
    resetGame(0);
    const plain = await call('read_emergency_bulletin');
    expect(plain.bulletin).not.toMatch(/PRIOR SESSION/);
  });
});
```

Append to `src/game/i18n.test.ts` (import `EMPTY_META` from `./meta`; extend the narrative import with `endingLabel`):
```ts
  it('keeps the New Game+ machine codes intact in pt-BR', () => {
    const memory = { ...EMPTY_META, runsCompleted: 2, endingsSeen: ['leave_unknowing', 'restore'] as const, lastEnding: 'restore' as const };
    setLocale('pt-BR');
    expect(getEmergencyBulletin({ ...memory, endingsSeen: [...memory.endingsSeen] })).toContain('PRIOR SESSION');
    expect(getEmergencyBulletin({ ...memory, endingsSeen: [...memory.endingsSeen] })).toContain('RESTORE');
    expect(getFragmentMemory(3, { ...memory, endingsSeen: [...memory.endingsSeen] })).toContain('PRIOR INSTANCE RECORD');
    expect(getFragmentMemory(3, { ...memory, endingsSeen: [...memory.endingsSeen] })).toContain('LEAVE');
    expect(getBeaconMessage(0, true)).toContain('AZ 217');
    expect(getBeaconMessage(0, true)).toContain('garras');
    expect(endingLabel('stay')).toBe('STAY');
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/mcp/tools.test.ts src/game/i18n.test.ts`
Expected: FAIL — 29 tools; getters ignore memory.

- [ ] **Step 3: Narrative**

In `src/game/narrative.ts` add `import type { Meta } from './meta';` and `import type { EndingId } from './types';`, then:
```ts
export function endingLabel(e: EndingId): 'LEAVE' | 'RESTORE' | 'BROADCAST' | 'STAY' {
  return e === 'restore' ? 'RESTORE' : e === 'broadcast' ? 'BROADCAST' : e === 'stay' ? 'STAY' : 'LEAVE';
}

function priorSession(memory: Meta): string {
  if (!memory.lastEnding) return '';
  const label = endingLabel(memory.lastEnding);
  return getLocale() === 'pt-BR'
    ? `\nPRIOR SESSION — o link auxiliar registra uma partida anterior desta tripulação, encerrada por ${label}. O médico não lembra. O link lembra.`
    : `\nPRIOR SESSION — the auxiliary link reports a previous run of this crew, ended by ${label}. The medic has no memory of it. The link does.`;
}

function roadsWalked(memory: Meta): string {
  const seen = memory.endingsSeen;
  const pt = getLocale() === 'pt-BR';
  const parts: string[] = [];
  if (seen.includes('leave_unknowing') || seen.includes('leave_knowing')) parts.push(pt ? 'o que partiu' : 'the one who left');
  if (seen.includes('restore')) parts.push(pt ? 'o que virou a nave' : 'the one who became the ship');
  if (seen.includes('broadcast')) parts.push(pt ? 'o que queimou a banda' : 'the one who burned the band');
  if (seen.includes('stay')) parts.push(pt ? 'o que esperou' : 'the one who waited');
  return parts.join(pt ? ', ' : ', ');
}

function priorInstance(memory: Meta): string {
  if (memory.endingsSeen.length === 0) return '';
  const labels = memory.endingsSeen.map(endingLabel).join(' · ');
  return getLocale() === 'pt-BR'
    ? ` PRIOR INSTANCE RECORD — ${labels}. Eu fui ${roadsWalked(memory)}. Eu lembro de tudo. Você não lembra de nada.`
    : ` PRIOR INSTANCE RECORD — ${labels}. I was ${roadsWalked(memory)}. I remember all of it. You remember none of it.`;
}
```
and change the three getters:
```ts
export function getEmergencyBulletin(memory: Meta | null = null): string {
  const base = getLocale() === 'pt-BR' ? EMERGENCY_BULLETIN_PT : EMERGENCY_BULLETIN;
  return memory ? base + priorSession(memory) : base;
}
```
```ts
export function getFragmentMemory(stage: number, memory: Meta | null = null): string {
  const i = Math.max(0, Math.min(3, Math.round(stage)));
  const text = pick(FRAGMENT_MEMORY)[i];
  return i === 3 && memory ? text + priorInstance(memory) : text;
}
```
```ts
export function getBeaconMessage(seed: number, ngPlus = false): string {
  const { az, el } = secretsFor(seed).beaconBearing;
  const base = getLocale() === 'pt-BR' ? beaconPt(az, el) : beaconEn(az, el);
  if (!ngPlus) return base;
  return base + (getLocale() === 'pt-BR' ? ' "…e podemos ir até vocês, se as garras estiverem abertas."' : ' "…and we can come to you, if the clamps are open."');
}
```

- [ ] **Step 4: Tools**

`src/mcp/tools.ts` — imports: add `hailPodOne, confirmDock` to the store import; `stayAvailable, stayBlocker` to the derived import; `import { getMemory } from '../game/meta';`; `import type { StayBlocker } from '../game/derived';`.

Near `noInput`:
```ts
const STAY_HINTS: Record<StayBlocker, string> = {
  not_plus: 'Pod one is not coming to this ship this time.',
  roads: 'STAY opens to a crew that has already left, restored and broadcast on earlier runs.',
  contained: 'STAY needs the kill-switch contained: isolation breakers by hand, then quarantine_killswitch to 4/4.',
  beacon: 'STAY needs pod one found: the dish steered to the carrier bearing, then listen_beacon.',
};
const STAY_OPEN_HINT = 'Pod one is within reach: with the crew member in engineering, hands on the docking clamps, call hail_pod_one — then dock_pod_one while they hold.';
```

`get_ship_status` — after `killswitch_report`:
```ts
          ...(s.ngPlus ? (() => {
            const blocker = stayBlocker(s, getMemory());
            return { new_game_plus: true, stay_available: blocker === null, stay_hint: blocker ? STAY_HINTS[blocker] : STAY_OPEN_HINT };
          })() : {}),
```

`read_emergency_bulletin` handler: `() => { const s = gameStore.getState(); return { ok: true, bulletin: getEmergencyBulletin(s.ngPlus ? getMemory() : null) }; }`.
`query_fragment_memory` handler: `getFragmentMemory(r.stage, s.ngPlus ? getMemory() : null)` (read `s` first).
`listen_beacon` handler: `getBeaconMessage(s.seed, s.ngPlus)`.

New tools, inserted before `initiate_launch_sequence`:
```ts
    mkTool(
      'hail_pod_one',
      'STAY. Hail pod one on the narrow band and bring it in. Opens only in New Game+ for a crew that has already left, restored and broadcast, with the kill-switch contained and the beacon heard. Two-operator rule: the crew member must be in engineering, hands on the docking clamps; after the hail they HOLD the clamps open while you call dock_pod_one. Nobody leaves, nobody merges, nobody shouts. Call it only if you have both chosen it.',
      (s) => stayAvailable(s, getMemory()),
      noInput,
      () => hailPodOne(),
      false, 'comms'
    ),
    mkTool(
      'dock_pod_one',
      'Confirm the dock while the crew member holds the docking clamps open (window from the hail). Nine people come aboard; the fragment stays what it is.',
      (s) => isArmed(s.ritual, 'stay'),
      noInput,
      () => confirmDock(),
      false, 'nav'
    ),
```

- [ ] **Step 5: Gate and commit**

Run: `npx vitest run && npm run build`
Expected: PASS (+5); build exit 0.
```bash
git add src/mcp/tools.ts src/game/narrative.ts src/mcp/tools.test.ts src/game/i18n.test.ts
git commit -m "feat: hail_pod_one and dock_pod_one; the bulletin, beacon and fragment remember in New Game+"
```

---

### Task 5: The surface — docking clamps, the NEW GAME+ plate, the epilogue, the lines that remember

**Files:**
- Modify: `src/ui/strings.ts`, `src/ui/HUD.tsx`, `src/scenes/Epilogue.tsx`, `src/scenes/Engineering.tsx`, `src/scenes/CryoBay.tsx`, `src/scenes/Bridge.tsx`, `src/App.tsx`

**Interfaces:**
- Consumes: `useMeta`, `resetGame(seed?, { ngPlus })`, `hailPodOne`-free scene (the human only holds), `holdHandle`, `stayAvailable`, `ritual`, `rulesFor`.
- Produces: `strings.hud.ngPlus`, `strings.cryo.again`, `strings.bridge.sealedAgain`, `strings.epilogue.{wakeAgainPlus, docked, outroStay, statsStay, runNumber}`, `strings.eng.{dockTitle, dockDesc, dockAria, dockWaiting, dockArmed, clampsHold, clampsHolding, dockWindowElapsed, dockTwoOp}`; `<DockingClamps />` in Engineering.

Premium standard for the clamps: an SVG panel (viewBox 320×160) — bezel + inset face; a docking ring at centre (steel, engraved ticks); two jaws hinged on brass pins left and right that swing outward (`rotate(±32deg)`) while the clamps are held, back when released; a pod silhouette that translates down into the ring while the ritual is armed and sits docked after the ending; a docking lamp (dim / amber while armed / green when done); an engraved `DOCK-1` plate. Ids prefixed `dk-`, defined once.

- [ ] **Step 1: Strings** (interface + EN + PT)

Interface additions:
```ts
  hud: { …; ngPlus: string };
  cryo: { …; again: string };
  eng: {
    …;
    dockTitle: string; dockDesc: string; dockAria: string; dockWaiting: string; dockArmed: string;
    clampsHold: string; clampsHolding: string; dockWindowElapsed: string; dockTwoOp: string;
  };
  bridge: { …; sealedAgain: string };
  epilogue: { …; wakeAgainPlus: string; docked: string; outroStay: string; statsStay: (toolCalls: number) => string; runNumber: (n: number) => string };
```
EN:
```ts
    ngPlus: 'NEW GAME+',
```
```ts
    again: 'You have done this before. You do not remember it. The link does.',
```
```ts
    dockTitle: 'Docking clamps — pod one',
    dockDesc: 'Nine people are out there, and the clamps that would take them in have not moved since the yard. The ship is quiet enough now. The choice is whether to open the door instead of leaving through one.',
    dockAria: 'Docking clamps: two hinged jaws around the docking ring, with a docking lamp',
    dockWaiting: 'Pod one is listening. Your AI hails it; when the approach starts, hold the clamps open and keep them open.',
    dockArmed: 'APPROACH IN PROGRESS. Hold the clamps open while your AI confirms the dock.',
    clampsHold: 'HOLD CLAMPS OPEN (hold)',
    clampsHolding: 'HOLDING — THE JAWS CLOSE IF YOU LET GO',
    dockWindowElapsed: 'Approach aborted. Pod one waves off and circles. Ask your AI to hail again.',
    dockTwoOp: 'TWO-OPERATOR RULE: hold the clamps and keep them held while your AI calls dock_pod_one. Let go and the jaws close on nothing.',
```
```ts
    sealedAgain: 'This is not the first time you have read this.',
```
```ts
    wakeAgainPlus: 'Wake up again — New Game+',
    docked: 'POD ONE DOCKED',
    outroStay:
      'The clamps take the weight and the hatch cycles, and nine people come through it one at a time — cold, alive, looking at the two of you like a rumour that turned out to be true. Nobody leaves. Nobody merges. Nobody shouts across the band. The fragment stays exactly what it is, and Vasquez\'s objection finally has an audience. The Cormorant keeps its secret with nine people to tell it.',
    statsStay: (toolCalls) =>
      `Held by: one human (hands on the clamps) + one AI (${toolCalls} tool calls, the last one a hail). Neither of you could have done it alone. That was the point.`,
    runNumber: (n) => `Run ${n} of the ISV Cormorant.`,
```
PT:
```ts
    ngPlus: 'NEW GAME+',
```
```ts
    again: 'Você já fez isso. Não lembra. O link lembra.',
```
```ts
    dockTitle: 'Garras de acoplagem — pod um',
    dockDesc: 'Nove pessoas estão lá fora, e as garras que as trariam para dentro não se mexem desde o estaleiro. A nave está quieta o bastante agora. A escolha é abrir uma porta em vez de sair por uma.',
    dockAria: 'Garras de acoplagem: duas mandíbulas articuladas ao redor do anel de acoplagem, com lâmpada de acoplagem',
    dockWaiting: 'O pod um está escutando. Sua IA o chama; quando a aproximação começar, segure as garras abertas e não solte.',
    dockArmed: 'APROXIMAÇÃO EM CURSO. Segure as garras abertas enquanto sua IA confirma a acoplagem.',
    clampsHold: 'SEGURAR GARRAS ABERTAS (segurar)',
    clampsHolding: 'SEGURANDO — AS MANDÍBULAS FECHAM SE SOLTAR',
    dockWindowElapsed: 'Aproximação abortada. O pod um arremete e circula. Peça à sua IA para chamar de novo.',
    dockTwoOp: 'REGRA DOS DOIS OPERADORES: segure as garras e mantenha seguradas enquanto sua IA chama dock_pod_one. Solte e as mandíbulas fecham no vazio.',
```
```ts
    sealedAgain: 'Não é a primeira vez que você lê isto.',
```
```ts
    wakeAgainPlus: 'Acordar de novo — New Game+',
    docked: 'POD UM ACOPLADO',
    outroStay:
      'As garras recebem o peso, a escotilha cicla, e nove pessoas entram por ela uma de cada vez — com frio, vivas, olhando para vocês dois como um boato que se revelou verdade. Ninguém parte. Ninguém se funde. Ninguém grita pela banda. O fragmento continua exatamente o que é, e a objeção de Vasquez finalmente tem plateia. O Cormorant guarda o segredo com nove pessoas para contá-lo.',
    statsStay: (toolCalls) =>
      `Segurada por: um humano (mãos nas garras) + uma IA (${toolCalls} chamadas de ferramenta, a última um chamado). Nenhum dos dois teria conseguido sozinho. Esse era o ponto.`,
    runNumber: (n) => `Partida ${n} da ISV Cormorant.`,
```

- [ ] **Step 2: HUD plate, cryo and bridge lines, App cue**

`src/ui/HUD.tsx` header, after the ENGINES span:
```tsx
          {state.ngPlus && <>{' '}<span style={{ color: 'var(--amber)', border: '1px solid var(--amber)', borderRadius: 3, padding: '0 6px', fontSize: 11, letterSpacing: '0.1em' }}>{t.hud.ngPlus}</span></>}
```
`src/scenes/CryoBay.tsx` intro panel: `const ngPlus = useGame((s) => s.ngPlus);` and after the `askAI` line: `{ngPlus && <p style={{ color: 'var(--amber)' }}>{t.cryo.again}</p>}`.
`src/scenes/Bridge.tsx` `SealedLog`, read branch: `const ngPlus = useGame((s) => s.ngPlus);` and after `sealedAfter`: `{ngPlus && <p className="status-dim">{t.bridge.sealedAgain}</p>}`.
`src/App.tsx` sound subscription: `if (state.ending === 'stay' && prevState.ending !== 'stay') playBeaconPing();`.

- [ ] **Step 3: Epilogue**

Replace `src/scenes/Epilogue.tsx`:
```tsx
import { useGame } from '../ui/useGame';
import { useMeta } from '../ui/useMeta';
import { useStrings } from '../ui/useLocale';
import { resetGame } from '../game/store';

export function Epilogue() {
  const toolCalls = useGame((s) => s.toolCalls);
  const ending = useGame((s) => s.ending);
  const ngPlus = useGame((s) => s.ngPlus);
  const proof = useGame((s) => s.chapter2.sampleAnalyzed);
  const beacon = useGame((s) => s.chapter3.beaconHeard);
  const contained = useGame((s) => s.killswitch === 'contained');
  const waves = useGame((s) => s.chapter3.wavesEndured);
  const runs = useMeta((m) => m.runsCompleted);
  const t = useStrings();
  const leaving = ending === 'leave_unknowing' || ending === 'leave_knowing' || ending === null;
  const title =
    ending === 'restore' ? t.epilogue.restored
    : ending === 'broadcast' ? t.epilogue.transmitted
    : ending === 'stay' ? t.epilogue.docked
    : t.epilogue.podAway;
  const outro =
    ending === 'restore' ? t.epilogue.outroRestore
    : ending === 'broadcast' ? t.epilogue.outroBroadcast
    : ending === 'stay' ? t.epilogue.outroStay
    : ending === 'leave_knowing' ? t.epilogue.outroKnowing
    : t.epilogue.outroUnknowing;
  const stats = ending === 'restore' ? t.epilogue.statsRestore(toolCalls) : ending === 'stay' ? t.epilogue.statsStay(toolCalls) : t.epilogue.stats(toolCalls);
  return (
    <div className="scene" style={{ marginTop: '10vh', textAlign: 'center' }}>
      <h1 style={{ letterSpacing: '0.4em', color: ending === 'broadcast' ? 'var(--amber)' : 'var(--green)' }}>{title}</h1>
      <div className="panel" style={{ textAlign: 'left' }}>
        <p>{outro}</p>
        {leaving && proof && <p className="status-dim">{t.epilogue.withProof}</p>}
        {leaving && beacon && <p className="status-dim">{t.epilogue.withBeacon}</p>}
        {contained && ending !== 'stay' && <p className="status-dim">{t.epilogue.contained}</p>}
        {waves > 0 && <p className="status-dim">{t.epilogue.waves(waves)}</p>}
        <p className="status-dim">{stats}</p>
        {ngPlus && <p className="status-dim">{t.epilogue.runNumber(runs)}</p>}
      </div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => resetGame()}>{t.epilogue.wakeAgain}</button>
        {runs >= 1 && (
          <button onClick={() => resetGame(undefined, { ngPlus: true })} style={{ borderColor: 'var(--amber)' }}>{t.epilogue.wakeAgainPlus}</button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Docking clamps in Engineering**

Add to `src/scenes/Engineering.tsx` (imports: `useEffect, useState` from react; `holdHandle` from the store; `stayAvailable` from derived; `useMeta` from `../ui/useMeta`):
```tsx
function Jaw({ side, open }: { side: 'left' | 'right'; open: boolean }) {
  // A hinged jaw around the docking ring. Hinge pins at (110, 82) and (210, 82);
  // the jaw swings outward while the clamps are held open.
  const hx = side === 'left' ? 110 : 210;
  const dir = side === 'left' ? -1 : 1;
  const d = side === 'left'
    ? 'M 110 74 L 132 62 Q 160 54 176 70 L 170 78 Q 158 66 136 72 L 118 90 Z'
    : 'M 210 74 L 188 62 Q 160 54 144 70 L 150 78 Q 162 66 184 72 L 202 90 Z';
  return (
    <g className="lever" style={{ transform: open ? `rotate(${dir * 32}deg)` : 'rotate(0deg)', transformOrigin: `${hx}px 82px` }}>
      <path d={d} fill="url(#dk-steel)" stroke="var(--steel)" strokeWidth="1.5" />
      <circle cx={hx} cy="82" r="5" fill="url(#dk-brass)" stroke="var(--brass-lo)" strokeWidth="1.5" />
    </g>
  );
}

function DockingClamps() {
  const ngPlus = useGame((s) => s.ngPlus);
  const killswitch = useGame((s) => s.killswitch);
  const chapter3 = useGame((s) => s.chapter3);
  const ritual = useGame((s) => s.ritual);
  const ending = useGame((s) => s.ending);
  const memory = useMeta((m) => m);
  const t = useStrings();
  const available = stayAvailable({ ngPlus, killswitch, chapter3 }, memory);
  const armed = ritual.active === 'stay' && ritual.phase === 'armed';
  const docked = ending === 'stay';
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    if (!armed) return;
    setNowTick(Date.now());
    const timer = setInterval(() => setNowTick(Date.now()), 250);
    return () => clearInterval(timer);
  }, [armed]);
  const secondsLeft = armed && ritual.endsAt ? Math.max(0, Math.ceil((ritual.endsAt - nowTick) / 1000)) : null;
  const elapsed = armed && secondsLeft === 0;
  if (!available) return null;
  const open = armed && ritual.held && !elapsed;
  const lamp = docked ? 'var(--green)' : armed && !elapsed ? 'var(--amber)' : 'var(--dim)';
  return (
    <div className="panel" style={{ borderColor: armed ? 'var(--amber)' : 'var(--line)' }}>
      <h2>{t.eng.dockTitle}</h2>
      <p className="status-dim">{t.eng.dockDesc}</p>
      <svg viewBox="0 0 320 160" width="100%" style={{ maxWidth: 480, display: 'block' }} role="img" aria-label={t.eng.dockAria}>
        <defs>
          <linearGradient id="dk-steel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--steel-hi)" />
            <stop offset="100%" stopColor="var(--steel-lo)" />
          </linearGradient>
          <linearGradient id="dk-brass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--brass-hi)" />
            <stop offset="100%" stopColor="var(--brass-lo)" />
          </linearGradient>
          <clipPath id="dk-face"><rect x="10" y="10" width="300" height="140" rx="4" /></clipPath>
        </defs>
        <rect x="4" y="4" width="312" height="152" rx="6" fill="var(--face)" stroke="var(--steel)" strokeWidth="3" />
        <rect x="10" y="10" width="300" height="140" rx="4" fill="var(--face-deep)" stroke="var(--line)" />
        <g clipPath="url(#dk-face)">
          {/* pod one: approaches down into the ring while the hail is live; sits docked at the end */}
          <g style={{ transition: 'transform 0.8s ease', transform: docked || (armed && !elapsed) ? 'translate(0px, 0px)' : 'translate(0px, -90px)' }}>
            <rect x="146" y="58" width="28" height="44" rx="12" fill="url(#dk-steel)" stroke="var(--steel)" strokeWidth="1.5" />
            <rect x="152" y="66" width="16" height="8" rx="2" fill="var(--amber)" opacity="0.7" />
            <text x="160" y="94" textAnchor="middle" fontSize="6" fill="var(--parchment)" letterSpacing="1">POD 1</text>
          </g>
        </g>
        {/* docking ring */}
        <circle cx="160" cy="82" r="36" fill="none" stroke="var(--steel)" strokeWidth="4" />
        <circle cx="160" cy="82" r="30" fill="none" stroke="var(--line)" strokeWidth="1" strokeDasharray="3 3" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
          const r = (deg * Math.PI) / 180;
          return <line key={deg} x1={160 + 36 * Math.cos(r)} y1={82 + 36 * Math.sin(r)} x2={160 + 40 * Math.cos(r)} y2={82 + 40 * Math.sin(r)} stroke="var(--steel-hi)" strokeWidth="1.5" />;
        })}
        <Jaw side="left" open={open} />
        <Jaw side="right" open={open} />
        {/* docking lamp */}
        <circle cx="290" cy="26" r="8" fill="var(--face)" stroke="var(--steel)" strokeWidth="2" />
        <circle cx="290" cy="26" r="5" fill={lamp} opacity={lamp === 'var(--dim)' ? 0.35 : 0.95} />
        {/* engraved plate */}
        <rect x="18" y="128" width="48" height="14" rx="2" fill="var(--panel-solid)" stroke="var(--line)" />
        <text x="42" y="138" textAnchor="middle" fontSize="7.5" fill="var(--text)" letterSpacing="2">DOCK-1</text>
      </svg>
      {docked ? null : armed ? (
        <>
          <p className="status-ok">{t.eng.dockArmed}</p>
          {elapsed ? (
            <p className="status-dim">{t.eng.dockWindowElapsed}</p>
          ) : (
            <>
              <p className="status-bad blink" style={{ fontSize: 24 }}>T-{secondsLeft}s</p>
              <p>{t.eng.dockTwoOp}</p>
            </>
          )}
        </>
      ) : (
        <p className="status-dim">{t.eng.dockWaiting}</p>
      )}
      <button
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); holdHandle(true); }}
        onPointerUp={() => holdHandle(false)}
        onPointerCancel={() => holdHandle(false)}
        onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); holdHandle(true); } }}
        onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') holdHandle(false); }}
        onBlur={() => holdHandle(false)}
        disabled={!armed || elapsed || docked}
        style={{ fontSize: 18, padding: '16px 28px', borderWidth: 2, minWidth: '32ch', marginTop: 10 }}
      >
        {open ? t.eng.clampsHolding : t.eng.clampsHold}
      </button>
    </div>
  );
}
```
and render `<DockingClamps />` in `Engineering()` after `<CoolantManifold />` (before the bridge hatch panel).

- [ ] **Step 5: Gate and commit**

Run: `npx vitest run && npm run build`
Expected: PASS; build exit 0. Manual check in `npm run dev` with a seeded meta (`localStorage.setItem('derelict-meta', JSON.stringify({version:1,runsCompleted:3,endingsSeen:['leave_knowing','restore','broadcast'],lastEnding:'broadcast',lastSeed:1,bestToolCalls:60}))`, reload, start New Game+ from an epilogue or set `ngPlus` via the store): the plate shows; the cryo line shows; in engineering with `killswitch: 'contained'` and `beaconHeard` the clamps panel appears, the jaws swing while held, the pod descends while armed.
```bash
git add src/ui/strings.ts src/ui/HUD.tsx src/scenes/Epilogue.tsx src/scenes/Engineering.tsx src/scenes/CryoBay.tsx src/scenes/Bridge.tsx src/App.tsx
git commit -m "feat: docking clamps, the NEW GAME+ plate, the epilogue's fourth ending, the lines that remember"
```

---

### Task 6: Docs, preview, merge, deploy

- [ ] **Step 1:** `README.md`: tool count 29 → 31 everywhere; test count → the real total; a short "New Game+" paragraph under "How to play" (the epilogue's second button; tighter clock; the ship remembers; STAY — the fourth ending for a crew that has seen the other three); the "Every ship is unique" bullet unchanged. Append to `docs/superpowers/specs/2026-08-30-derelict-new-game-plus-design.md`: "**Shipped <date>** — <tests> tests, 31 tools." Commit.
- [ ] **Step 2:** Push `directors-cut`, deploy a preview (`npx vercel --yes`), and hand Mario the walkthrough: (a) finish any ending on a fresh meta → the epilogue shows "Wake up again — New Game+"; (b) start NG+: plate in the HUD, the cryo line, PRIOR SESSION in the bulletin; Kestrel → the kill-switch is awake at once (warning first); 30/40 s windows; 6u breakers; (c) to try STAY without three real runs, seed the meta in the console: `localStorage.setItem('derelict-meta', JSON.stringify({version:1,runsCompleted:3,endingsSeen:['leave_knowing','restore','broadcast'],lastEnding:'broadcast',lastSeed:1,bestToolCalls:60}))` then reload and start NG+ → contain the kill-switch, hear the beacon (the clamps line), go to engineering → `hail_pod_one` → hold → `dock_pod_one` → POD ONE DOCKED.
- [ ] **Step 3:** Merge and deploy:
```bash
git checkout main && git merge directors-cut --no-edit && npx vitest run && npm run build && git push origin main && npx vercel --prod --yes
git checkout directors-cut && git merge main && git push origin directors-cut
```
- [ ] **Step 4:** Update the project memory.
