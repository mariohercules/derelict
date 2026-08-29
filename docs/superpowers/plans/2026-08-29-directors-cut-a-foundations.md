# Director's Cut — Plan A: Foundations — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lay the structural foundations of the Director's Cut without changing what the player can do yet — chapters and a v2 save with migration, a ten-compartment room graph with a deck map, a reusable two-operator ritual framework (the launch refactored onto it), and Chapter 1's new hook: the sealed log and the "Leave, unknowing" ending.

**Architecture:** The Zustand store stays the single source of truth. The launch countdown becomes an instance of a generic `RitualState` driven by pure functions in `ritual.ts`. Rooms become data (`rooms.ts`) with a status selector; scenes are looked up from a registry; a deck map renders the graph. Persistence moves to a `v2` key and migrates `v1` saves on load. Every text stays localized (EN/pt-BR) and seed-aware.

**Tech Stack:** React 19 + TypeScript + Vite, Zustand vanilla store, Vitest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-26-derelict-directors-cut-design.md` (§3 chapter 1, §4 navigation, §6 rituals, §7 technical deltas, §10 addendum). Base game spec: `docs/superpowers/specs/2026-08-26-derelict-design.md`.

## Global Constraints

- Branch `directors-cut`; merge to `main` and deploy to prod only at the end of this plan (Task 8), after a full playthrough.
- Existing behavior is preserved: the classic ship (`seed 0`) plays exactly as in `v1.0-challenge` except for the additions named here. The 74 existing tests stay green at every commit (updated only where a field was renamed).
- `RitualState` replaces `LaunchState`: `{ active: RitualId | null; phase: 'idle' | 'armed' | 'done'; endsAt: number | null; held: boolean }`. Launch window stays `LAUNCH_WINDOW_MS = 45_000`.
- Ten `RoomId`s: `cryo_bay | engineering | bridge | medbay | crew_quarters | hydroponics | cargo_bay | reactor_room | core_vault | comms_array`. Chapter-2/3 rooms are **sealed** in this plan (visible on the map, not enterable).
- Save keys: `derelict-save-v2` (written), `derelict-save-v1` (read-only, migrated). A v1 save must load with progress intact.
- All player-facing text in both locales in `src/ui/strings.ts`; agent-facing text (tool descriptions, tool payloads) English, in-fiction, keeping the anti-deflection rules (no keypads, self-call imperatives, "tell them to walk through").
- Tool handlers contain no game logic — store actions/selectors only. Handlers never throw at the agent.
- Commit messages end with a blank line then `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Verification gate for every commit: `npx vitest run` and `npm run build` both exit 0 (gate on exit codes, never on grep).

---

### Task 1: Ritual framework — the launch refactored onto a generic two-operator ritual

**Files:**
- Create: `src/game/ritual.ts`, `src/game/ritual.test.ts`
- Modify: `src/game/types.ts`, `src/game/store.ts`, `src/game/persist.ts`, `src/mcp/tools.ts`, `src/scenes/Bridge.tsx`, `src/App.tsx`
- Modify tests: `src/game/store.act3.test.ts`, `src/mcp/tools.test.ts`, `src/game/persist.test.ts`

**Interfaces:**
- Consumes: `LAUNCH_WINDOW_MS` from `src/game/content.ts`; `gameStore`, `ActionResult`.
- Produces:
  - `type RitualId = 'launch'`, `type RitualPhase = 'idle' | 'armed' | 'done'`, `interface RitualState { active: RitualId | null; phase: RitualPhase; endsAt: number | null; held: boolean }` (in `types.ts`; `GameState.ritual: RitualState` replaces `launch`).
  - `ritual.ts`: `RITUALS: Record<RitualId, { id: RitualId; tool: string; windowMs: number }>`, `IDLE_RITUAL: RitualState`, `isArmed(r: RitualState, id: RitualId): boolean`, `ritualExpired(r: RitualState, now: number): boolean`, `armRitual(r, id, now): { next: RitualState; result: ActionResult }`, `confirmRitual(r, id, now): { next: RitualState; result: ActionResult }`.
  - Store: `holdHandle(held: boolean)`, `initiateLaunch(auth, now?)`, `confirmLaunch(now?)` keep their names and semantics.

- [ ] **Step 1: Write the failing tests for the pure ritual functions**

`src/game/ritual.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { IDLE_RITUAL, RITUALS, armRitual, confirmRitual, isArmed, ritualExpired } from './ritual';

const T0 = 1_000_000;
const W = RITUALS.launch.windowMs;

describe('armRitual', () => {
  it('arms from idle with a window', () => {
    const { next, result } = armRitual(IDLE_RITUAL, 'launch', T0);
    expect(result.ok).toBe(true);
    expect(next).toEqual({ active: 'launch', phase: 'armed', endsAt: T0 + W, held: false });
  });

  it('refuses to re-arm while the window is live', () => {
    const armed = armRitual(IDLE_RITUAL, 'launch', T0).next;
    expect(armRitual(armed, 'launch', T0 + 1000).result.ok).toBe(false);
  });

  it('re-arms after the window expires', () => {
    const armed = armRitual(IDLE_RITUAL, 'launch', T0).next;
    const { next, result } = armRitual(armed, 'launch', T0 + W + 1);
    expect(result.ok).toBe(true);
    expect(next.endsAt).toBe(T0 + W + 1 + W);
  });

  it('refuses once the ritual is done', () => {
    const done = { ...IDLE_RITUAL, active: 'launch' as const, phase: 'done' as const };
    expect(armRitual(done, 'launch', T0).result.ok).toBe(false);
  });
});

describe('confirmRitual', () => {
  it('refuses when nothing is armed', () => {
    expect(confirmRitual(IDLE_RITUAL, 'launch', T0).result.ok).toBe(false);
  });

  it('refuses while the handle is not held, leaving the ritual armed', () => {
    const armed = armRitual(IDLE_RITUAL, 'launch', T0).next;
    const { next, result } = confirmRitual(armed, 'launch', T0 + 1000);
    expect(result.ok).toBe(false);
    expect(next.phase).toBe('armed');
  });

  it('resets to idle when the window has elapsed', () => {
    const armed = { ...armRitual(IDLE_RITUAL, 'launch', T0).next, held: true };
    const { next, result } = confirmRitual(armed, 'launch', T0 + W + 1);
    expect(result.ok).toBe(false);
    expect(next).toEqual(IDLE_RITUAL);
  });

  it('completes when held inside the window', () => {
    const armed = { ...armRitual(IDLE_RITUAL, 'launch', T0).next, held: true };
    const { next, result } = confirmRitual(armed, 'launch', T0 + 1000);
    expect(result.ok).toBe(true);
    expect(next.phase).toBe('done');
    expect(next.active).toBe('launch');
  });
});

describe('helpers', () => {
  it('isArmed and ritualExpired read the state correctly', () => {
    const armed = armRitual(IDLE_RITUAL, 'launch', T0).next;
    expect(isArmed(armed, 'launch')).toBe(true);
    expect(isArmed(IDLE_RITUAL, 'launch')).toBe(false);
    expect(ritualExpired(armed, T0 + W)).toBe(false);
    expect(ritualExpired(armed, T0 + W + 1)).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/game/ritual.test.ts`
Expected: FAIL — `./ritual` does not exist.

- [ ] **Step 3: Write `ritual.ts` and the type changes**

`src/game/ritual.ts`:
```ts
// The two-operator rule as a reusable ritual: the agent arms a sequence with a
// tool, the human holds a physical control, and the agent confirms while the
// hold is live and the window is open. One ritual can be armed at a time.
import type { ActionResult, RitualId, RitualState } from './types';
import { LAUNCH_WINDOW_MS } from './content';

export interface RitualDef {
  id: RitualId;
  tool: string; // the agent tool that confirms this ritual
  windowMs: number;
}

export const RITUALS: Record<RitualId, RitualDef> = {
  launch: { id: 'launch', tool: 'confirm_launch', windowMs: LAUNCH_WINDOW_MS },
};

export const IDLE_RITUAL: RitualState = { active: null, phase: 'idle', endsAt: null, held: false };

export function isArmed(r: RitualState, id: RitualId): boolean {
  return r.active === id && r.phase === 'armed';
}

export function ritualExpired(r: RitualState, now: number): boolean {
  return r.phase === 'armed' && r.endsAt !== null && now > r.endsAt;
}

export function armRitual(r: RitualState, id: RitualId, now: number): { next: RitualState; result: ActionResult } {
  if (r.phase === 'done') {
    return { next: r, result: { ok: false, message: 'That sequence has already completed.' } };
  }
  if (r.phase === 'armed' && !ritualExpired(r, now)) {
    return { next: r, result: { ok: false, message: 'A two-operator sequence is already armed.' } };
  }
  const next: RitualState = { active: id, phase: 'armed', endsAt: now + RITUALS[id].windowMs, held: r.held };
  return { next, result: { ok: true, message: 'Sequence armed.' } };
}

export function confirmRitual(r: RitualState, id: RitualId, now: number): { next: RitualState; result: ActionResult } {
  if (!isArmed(r, id)) {
    return { next: r, result: { ok: false, message: 'No sequence is armed.' } };
  }
  if (ritualExpired(r, now)) {
    return { next: IDLE_RITUAL, result: { ok: false, message: 'Window elapsed. Sequence reset. Take a breath and arm it again.' } };
  }
  if (!r.held) {
    return {
      next: r,
      result: { ok: false, message: 'Two-operator rule: confirm refused — the physical handle is not being held. Ask your human to grab it.' },
    };
  }
  return { next: { ...r, phase: 'done' }, result: { ok: true, message: 'Sequence complete.' } };
}
```

In `src/game/types.ts`, replace the launch types:
```ts
export type RitualId = 'launch';
export type RitualPhase = 'idle' | 'armed' | 'done';

export interface RitualState {
  active: RitualId | null;
  phase: RitualPhase;
  endsAt: number | null; // epoch ms
  held: boolean;
}
```
Delete `LaunchPhase` and `LaunchState`. In `GameState`, replace `launch: LaunchState;` with `ritual: RitualState;`.

- [ ] **Step 4: Refactor the store onto the ritual**

In `src/game/store.ts`:
- Add `import { IDLE_RITUAL, RITUALS, armRitual, confirmRitual } from './ritual';` and remove `LAUNCH_WINDOW_MS` from the content import.
- In `initialState`, replace `launch: { phase: 'idle', countdownEndsAt: null, handleHeld: false },` with `ritual: { ...IDLE_RITUAL },`.
- Replace `holdHandle`, `initiateLaunch`, `confirmLaunch` with:

```ts
export function holdHandle(held: boolean): void {
  gameStore.setState((s) => ({ ritual: { ...s.ritual, held } }));
}

export function initiateLaunch(auth: string, now: number = Date.now()): ActionResult {
  const s = gameStore.getState();
  if (s.room !== 'bridge') {
    return { ok: false, message: 'Two-operator rule: the crew member must be on the bridge, hand within reach of the confirm handle. They are below decks. Initiation refused.' };
  }
  if (!s.trajectorySet) return { ok: false, message: 'No trajectory locked. Launching blind is technically possible and universally fatal.' };
  if (String(auth).trim().toUpperCase() !== secretsFor(s.seed).launchAuth) {
    return { ok: false, message: 'Launch authorization rejected.' };
  }
  if (s.ritual.phase === 'done') return { ok: false, message: 'Pod two is already away.' };
  const { next, result } = armRitual(s.ritual, 'launch', now);
  if (!result.ok) return { ok: false, message: 'Launch sequence already in progress.' };
  gameStore.setState({ ritual: next });
  return {
    ok: true,
    message: `Sequence initiated. Two-operator rule in effect: the human must HOLD the confirm handle; then call confirm_launch within ${RITUALS.launch.windowMs / 1000}s.`,
  };
}

export function confirmLaunch(now: number = Date.now()): ActionResult {
  const s = gameStore.getState();
  const { next, result } = confirmRitual(s.ritual, 'launch', now);
  if (!result.ok) {
    gameStore.setState({ ritual: next });
    return result;
  }
  gameStore.setState({ ritual: next, won: true });
  return { ok: true, message: 'Pod two away. Nice flying — both of you.' };
}
```

- [ ] **Step 5: Update the consumers of the old `launch` field**

`src/mcp/tools.ts`:
- Add `import { isArmed } from '../game/ritual';`.
- In `get_ship_status`, replace `launch: s.launch.phase,` with `ritual: { active: s.ritual.active, phase: s.ritual.phase },`.
- `confirm_launch` availability: replace `(s) => s.launch.phase === 'countdown',` with `(s) => isArmed(s.ritual, 'launch'),`.

`src/App.tsx` sound subscription: replace
`if (state.launch.phase === 'countdown' && prevState.launch.phase !== 'countdown') playAlarm();`
with
`if (state.ritual.phase === 'armed' && prevState.ritual.phase !== 'armed') playAlarm();`

`src/scenes/Bridge.tsx` `LaunchConsole`: replace `const launch = useGame((s) => s.launch);` with `const ritual = useGame((s) => s.ritual);` and `const armed = ritual.active === 'launch' && ritual.phase === 'armed';`. Then: the effect depends on `[armed]` and returns early `if (!armed) return;`; `secondsLeft` uses `armed && ritual.endsAt ? Math.max(0, Math.ceil((ritual.endsAt - nowTick) / 1000)) : null`; every `launch.phase === 'countdown'` becomes `armed`; `launch.phase === 'idle'` becomes `ritual.phase === 'idle'`; the button's `disabled={!armed}`; the label uses `ritual.held`.

`src/game/persist.ts` (temporary until Task 3 adds migration): replace the `PHASES` constant with `const PHASES: RitualPhase[] = ['idle', 'armed', 'done'];` (import `RitualPhase` instead of `LaunchPhase`), replace the launch validation block with:
```ts
  if (!p.ritual || typeof p.ritual !== 'object') return false;
  const ritual = p.ritual as unknown as Record<string, unknown>;
  if (!PHASES.includes(ritual.phase as RitualPhase)) return false;
  if (ritual.active !== null && ritual.active !== 'launch') return false;
  if (ritual.endsAt !== null && !isFiniteNumber(ritual.endsAt)) return false;
```
and the sanitization at the end of `loadSavedState` with:
```ts
    const ritual = { ...merged.ritual, held: false };
    if (ritual.phase === 'armed') {
      ritual.active = null;
      ritual.phase = 'idle';
      ritual.endsAt = null;
    }
    return { ...merged, ritual };
```

- [ ] **Step 6: Update the tests that named the old field**

`src/game/store.act3.test.ts`: every `gameStore.getState().launch` becomes `.ritual`; `'countdown'` → `'armed'`; `'launched'` → `'done'`; `countdownEndsAt` → `endsAt`. (The assertions' meaning is unchanged.)

`src/mcp/tools.test.ts` full-run: replace `gameStore.setState((s) => ({ launch: { ...s.launch, handleHeld: true } }));` with `gameStore.setState((s) => ({ ritual: { ...s.ritual, held: true } }));`.

`src/game/persist.test.ts`: the two launch tests become:
```ts
  it('sanitizes an armed ritual on load: back to idle, no handle held', () => {
    const saved = { ...initialState(0), ritual: { active: 'launch', phase: 'armed', endsAt: 123456789, held: true } };
    storage.set(SAVE_KEY, JSON.stringify(saved));
    expect(loadSavedState()?.ritual).toEqual({ active: null, phase: 'idle', endsAt: null, held: false });
  });

  it('keeps a completed ritual as done, but still clears the held flag', () => {
    const saved = { ...initialState(0), ritual: { active: 'launch', phase: 'done', endsAt: null, held: true } };
    storage.set(SAVE_KEY, JSON.stringify(saved));
    expect(loadSavedState()?.ritual).toEqual({ active: 'launch', phase: 'done', endsAt: null, held: false });
  });
```
and the malformed-launch test becomes `{ ...initialState(0), ritual: null }` with the same `toBeNull()` expectation.

- [ ] **Step 7: Run everything**

Run: `npx vitest run && npm run build`
Expected: all suites PASS (74 existing + 9 new), build clean.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: two-operator launch becomes a reusable ritual"
```

---

### Task 2: Chapter, sealed log, ending, checkpoint — state and store

**Files:**
- Modify: `src/game/types.ts`, `src/game/store.ts`, `src/game/persist.ts` (validation only)
- Test: `src/game/store.act3.test.ts` (append), `src/game/persist.test.ts` (append)

**Interfaces:**
- Consumes: Task 1's store.
- Produces:
  - Types: `ChapterId = 1 | 2 | 3`, `EndingId = 'leave_unknowing'`, `Checkpoint = { chapter: ChapterId; room: RoomId }`.
  - `GameState` gains `chapter: ChapterId`, `sealedLogRead: boolean`, `ending: EndingId | null`, `checkpoint: Checkpoint | null`.
  - Store: `breakSeal(): ActionResult` (human, bridge, after trajectory set); `enterRoom('bridge')` records the checkpoint; `confirmLaunch` sets `ending: 'leave_unknowing'`.

- [ ] **Step 1: Write the failing tests**

Append to `src/game/store.act3.test.ts` (inside the file, after the existing describes; add `breakSeal, enterRoom` to the store import and `AUTH_CODE` is not needed):
```ts
describe('chapter 1 hook: the sealed log', () => {
  it('cannot be opened before the pre-launch check (trajectory set)', () => {
    expect(breakSeal().ok).toBe(false);
    expect(gameStore.getState().sealedLogRead).toBe(false);
  });

  it('opens once the trajectory is locked, and only on the bridge', () => {
    takeStarFix();
    computeTrajectory([...STAR_FIX]);
    gameStore.setState({ room: 'engineering' });
    expect(breakSeal().ok).toBe(false);
    gameStore.setState({ room: 'bridge' });
    expect(breakSeal().ok).toBe(true);
    expect(gameStore.getState().sealedLogRead).toBe(true);
  });

  it('winning in chapter 1 records the "leave, unknowing" ending', () => {
    takeStarFix();
    computeTrajectory([...STAR_FIX]);
    initiateLaunch(LAUNCH_AUTH, T0);
    holdHandle(true);
    confirmLaunch(T0 + 1000);
    expect(gameStore.getState().ending).toBe('leave_unknowing');
    expect(gameStore.getState().chapter).toBe(1);
  });
});

describe('checkpoints', () => {
  it('reaching the bridge records the chapter 1 checkpoint', () => {
    resetGame(0);
    gameStore.setState({ doors: { cryo_exit: true, engineering_exit: true }, room: 'engineering', act: 2 });
    expect(gameStore.getState().checkpoint).toBeNull();
    enterRoom('bridge');
    expect(gameStore.getState().checkpoint).toEqual({ chapter: 1, room: 'bridge' });
  });
});
```

Append to `src/game/persist.test.ts`:
```ts
  it('rejects a save with an impossible chapter', () => {
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), chapter: 7 }));
    expect(loadSavedState()).toBeNull();
  });
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/game/store.act3.test.ts src/game/persist.test.ts`
Expected: FAIL — `breakSeal` not exported; `chapter`/`ending`/`checkpoint` undefined.

- [ ] **Step 3: Add the types and store logic**

`src/game/types.ts` additions:
```ts
export type ChapterId = 1 | 2 | 3;
export type EndingId = 'leave_unknowing';

export interface Checkpoint {
  chapter: ChapterId;
  room: RoomId;
}
```
`GameState` gains, after `seed`:
```ts
  chapter: ChapterId;
  sealedLogRead: boolean;
  ending: EndingId | null;
  checkpoint: Checkpoint | null;
```

`src/game/store.ts`:
- `initialState` gains `chapter: 1, sealedLogRead: false, ending: null, checkpoint: null,`.
- In `enterRoom`, after computing `act`, record the checkpoint when arriving at the bridge for the first time:
```ts
  const checkpoint = room === 'bridge' && s.checkpoint === null ? { chapter: s.chapter, room } : s.checkpoint;
  gameStore.setState({ room, act, checkpoint });
```
- New action:
```ts
export function breakSeal(): ActionResult {
  const s = gameStore.getState();
  if (s.room !== 'bridge') return { ok: false, message: 'The sealed log is on the bridge, wedged behind the launch console.' };
  if (!s.trajectorySet) return { ok: false, message: 'The pre-launch check has not run yet. Nothing has surfaced.' };
  if (s.sealedLogRead) return { ok: true, message: 'The seal is already broken.' };
  gameStore.setState({ sealedLogRead: true });
  return { ok: true, message: 'Seal broken. The log is addressed to you by name.' };
}
```
- In `confirmLaunch`'s success branch: `gameStore.setState({ ritual: next, won: true, ending: 'leave_unknowing' });`

`src/game/persist.ts` `validShape` additions (after the seed check):
```ts
  if (p.chapter !== undefined && ![1, 2, 3].includes(p.chapter as number)) return false;
```
(`chapter` is optional here so Task 3's migration can fill it in; the merge over `initialState()` supplies defaults for the other new fields.)

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run && npm run build`
Expected: PASS, build clean.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: chapters, the sealed log, endings, and checkpoints in game state"
```

---

### Task 3: Save v2 with migration from v1

**Files:**
- Modify: `src/game/persist.ts`
- Test: `src/game/persist.test.ts`

**Interfaces:**
- Consumes: `GameState` (Tasks 1–2), `initialState(seed?)`, `CLASSIC_SEED`.
- Produces: `SAVE_KEY = 'derelict-save-v2'`, `LEGACY_SAVE_KEY = 'derelict-save-v1'`, `migrateV1(raw: Record<string, unknown>): Partial<GameState>`, `loadSavedState()` reading v2 then v1, `startPersisting()` writing v2.

- [ ] **Step 1: Write the failing tests**

Replace the import line in `src/game/persist.test.ts` with `import { loadSavedState, startPersisting, migrateV1, SAVE_KEY, LEGACY_SAVE_KEY } from './persist';` and append:
```ts
describe('v1 → v2 migration', () => {
  function v1Save(overrides: Record<string, unknown> = {}) {
    return {
      seed: 0, act: 3, room: 'bridge', auxPower: true, grateRemoved: true, breakersFlipped: ['C', 'A', 'B'],
      doors: { cryo_exit: true, engineering_exit: true },
      powerAllocation: { life_support: 15, doors: 5, medbay: 0, engines: 20, comms: 0 },
      fuseInstalled: '10A', valveSettings: [6, 3, 7], starFixTaken: true, trajectorySet: true,
      launch: { phase: 'countdown', countdownEndsAt: 123456789, handleHeld: true },
      toolCalls: 30, won: false,
      ...overrides,
    };
  }

  it('maps a v1 launch to a ritual and fills the new fields', () => {
    const m = migrateV1(v1Save());
    expect(m.ritual).toEqual({ active: 'launch', phase: 'armed', endsAt: 123456789, held: true });
    expect(m.chapter).toBe(1);
    expect(m.sealedLogRead).toBe(false);
    expect(m.ending).toBeNull();
    expect(m.checkpoint).toEqual({ chapter: 1, room: 'bridge' });
    expect((m as Record<string, unknown>).launch).toBeUndefined();
  });

  it('maps a won v1 save to the leave-unknowing ending and a done ritual', () => {
    const m = migrateV1(v1Save({ won: true, launch: { phase: 'launched', countdownEndsAt: null, handleHeld: false } }));
    expect(m.ending).toBe('leave_unknowing');
    expect(m.ritual?.phase).toBe('done');
  });

  it('loads a v1 save from the legacy key when no v2 save exists, with progress intact', () => {
    storage.set(LEGACY_SAVE_KEY, JSON.stringify(v1Save()));
    const loaded = loadSavedState();
    expect(loaded?.room).toBe('bridge');
    expect(loaded?.trajectorySet).toBe(true);
    expect(loaded?.ritual).toEqual({ active: null, phase: 'idle', endsAt: null, held: false }); // armed → sanitized
    expect(loaded?.chapter).toBe(1);
  });

  it('prefers the v2 save when both exist', () => {
    storage.set(LEGACY_SAVE_KEY, JSON.stringify(v1Save({ room: 'engineering' })));
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), room: 'bridge', doors: { cryo_exit: true, engineering_exit: true } }));
    expect(loadSavedState()?.room).toBe('bridge');
  });

  it('writes v2 only', () => {
    const stop = startPersisting();
    gameStore.setState({ auxPower: true });
    stop();
    expect(storage.has(SAVE_KEY)).toBe(true);
    expect(storage.has(LEGACY_SAVE_KEY)).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/game/persist.test.ts`
Expected: FAIL — `migrateV1`/`LEGACY_SAVE_KEY` not exported.

- [ ] **Step 3: Implement v2 + migration**

Rewrite `src/game/persist.ts` in full:
```ts
import { gameStore, initialState } from './store';
import type { GameState, RitualPhase, RitualState, RoomId, SubsystemId } from './types';
import { CLASSIC_SEED } from './secrets';
import { ROOM_IDS } from './rooms';

export const SAVE_KEY = 'derelict-save-v2';
export const LEGACY_SAVE_KEY = 'derelict-save-v1';

const SUBSYSTEMS: SubsystemId[] = ['life_support', 'doors', 'medbay', 'engines', 'comms'];
const PHASES: RitualPhase[] = ['idle', 'armed', 'done'];

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

// v1 saves (the challenge build) carried a `launch` countdown and no chapter data.
export function migrateV1(raw: Record<string, unknown>): Partial<GameState> {
  const { launch, ...rest } = raw;
  const l = (launch ?? {}) as Record<string, unknown>;
  const phase: RitualPhase = l.phase === 'countdown' ? 'armed' : l.phase === 'launched' ? 'done' : 'idle';
  const ritual: RitualState = {
    active: phase === 'idle' ? null : 'launch',
    phase,
    endsAt: isFiniteNumber(l.countdownEndsAt) ? l.countdownEndsAt : null,
    held: l.handleHeld === true,
  };
  const won = raw.won === true;
  return {
    ...(rest as Partial<GameState>),
    seed: isFiniteNumber(raw.seed) ? raw.seed : CLASSIC_SEED,
    ritual,
    chapter: 1,
    sealedLogRead: false,
    ending: won ? 'leave_unknowing' : null,
    checkpoint: raw.room === 'bridge' ? { chapter: 1, room: 'bridge' } : null,
  };
}

// A save that fails any of these checks is discarded whole: hydrating a
// half-valid save corrupts invariants the store never re-checks.
function validShape(p: Partial<GameState>): boolean {
  if (!isFiniteNumber(p.seed)) return false;
  if (typeof p.act !== 'number' || ![1, 2, 3].includes(p.act)) return false;
  if (p.chapter !== undefined && ![1, 2, 3].includes(p.chapter as number)) return false;
  if (typeof p.room !== 'string' || !ROOM_IDS.includes(p.room as RoomId)) return false;
  if (!p.doors || typeof p.doors !== 'object') return false;
  if (!p.ritual || typeof p.ritual !== 'object') return false;
  const ritual = p.ritual as unknown as Record<string, unknown>;
  if (!PHASES.includes(ritual.phase as RitualPhase)) return false;
  if (ritual.active !== null && ritual.active !== 'launch') return false;
  if (ritual.endsAt !== null && !isFiniteNumber(ritual.endsAt)) return false;
  if (p.ending !== undefined && p.ending !== null && p.ending !== 'leave_unknowing') return false;
  if (p.checkpoint !== undefined && p.checkpoint !== null) {
    const c = p.checkpoint as unknown as Record<string, unknown>;
    if (![1, 2, 3].includes(c.chapter as number) || !ROOM_IDS.includes(c.room as RoomId)) return false;
  }
  if (!p.powerAllocation || typeof p.powerAllocation !== 'object') return false;
  const alloc = p.powerAllocation as Record<string, unknown>;
  if (!SUBSYSTEMS.every((k) => isFiniteNumber(alloc[k]))) return false;
  if (!Array.isArray(p.valveSettings) || p.valveSettings.length !== 3 || !p.valveSettings.every(isFiniteNumber)) {
    return false;
  }
  return true;
}

function readJson(key: string): Record<string, unknown> | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  const parsed = JSON.parse(raw) as unknown;
  return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
}

export function loadSavedState(): GameState | null {
  try {
    let parsed: Partial<GameState> | null = readJson(SAVE_KEY) as Partial<GameState> | null;
    if (!parsed) {
      const legacy = readJson(LEGACY_SAVE_KEY);
      parsed = legacy ? migrateV1(legacy) : null;
    }
    if (!parsed) return null;
    if (parsed.seed === undefined) parsed.seed = CLASSIC_SEED;
    if (!validShape(parsed)) return null;
    // Merge over initialState so old saves survive new fields
    const merged = { ...initialState(), ...parsed } as GameState;
    // Never resurrect an armed ritual: a reload mid-window must not restore a stale
    // deadline or a held handle nobody is actually holding.
    const ritual = { ...merged.ritual, held: false };
    if (ritual.phase === 'armed') {
      ritual.active = null;
      ritual.phase = 'idle';
      ritual.endsAt = null;
    }
    return { ...merged, ritual };
  } catch {
    return null;
  }
}

export function startPersisting(): () => void {
  return gameStore.subscribe((s) => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    } catch {
      // Private mode / quota: play on without saves.
    }
  });
}
```
`ROOM_IDS` comes from Task 4's `rooms.ts`. **If Task 4 has not landed yet when you implement this, define locally `const ROOM_IDS: RoomId[] = ['cryo_bay', 'engineering', 'bridge'];` and Task 4 replaces it with the import.** (Execution order is 1→2→3→4, so use the local constant here and let Task 4 swap it.)

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run && npm run build`
Expected: PASS, build clean. The existing `round-trips the ship seed` and `legacy save without seed` tests still pass (v2 path).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: save v2 with v1 migration"
```

---

### Task 4: Room graph — ten compartments, sealed rooms, `get_deck_map`

**Files:**
- Create: `src/game/rooms.ts`, `src/game/rooms.test.ts`
- Modify: `src/game/types.ts`, `src/game/store.ts`, `src/game/persist.ts` (use `ROOM_IDS`), `src/mcp/tools.ts`, `src/ui/strings.ts`
- Test: `src/game/store.act1.test.ts` (append), `src/mcp/tools.test.ts` (append)

**Interfaces:**
- Consumes: `GameState.chapter`, `doors`.
- Produces:
  - `RoomId` (10 values, see Global Constraints).
  - `rooms.ts`: `interface RoomMeta { id: RoomId; chapter: ChapterId; requires: DoorId | null; x: number; y: number }`, `ROOMS: RoomMeta[]`, `ROOM_IDS: RoomId[]`, `ROOM_BY_ID: Record<RoomId, RoomMeta>`, `type RoomStatus = 'current' | 'open' | 'locked' | 'sealed'`, `roomStatus(s: GameState, id: RoomId): RoomStatus`.
  - Store `enterRoom` refuses sealed rooms.
  - Tool `get_deck_map` (always available).
  - `strings.hud.rooms` has all ten labels in both locales.

- [ ] **Step 1: Write the failing tests**

`src/game/rooms.test.ts`:
```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { ROOMS, ROOM_IDS, roomStatus } from './rooms';
import { gameStore, resetGame } from './store';

beforeEach(() => resetGame(0));

describe('room graph', () => {
  it('has ten compartments, three of them in chapter 1', () => {
    expect(ROOM_IDS).toHaveLength(10);
    expect(ROOMS.filter((r) => r.chapter === 1).map((r) => r.id).sort()).toEqual(['bridge', 'cryo_bay', 'engineering']);
  });

  it('reports the current room, open, locked, and sealed statuses', () => {
    const s = gameStore.getState();
    expect(roomStatus(s, 'cryo_bay')).toBe('current');
    expect(roomStatus(s, 'engineering')).toBe('locked');
    expect(roomStatus(s, 'medbay')).toBe('sealed');
    gameStore.setState({ doors: { cryo_exit: true, engineering_exit: false } });
    expect(roomStatus(gameStore.getState(), 'engineering')).toBe('open');
    expect(roomStatus(gameStore.getState(), 'bridge')).toBe('locked');
  });
});
```

Append to `src/game/store.act1.test.ts` (inside `describe('room movement')`):
```ts
  it('refuses compartments sealed until a later chapter', () => {
    const r = enterRoom('medbay');
    expect(r.ok).toBe(false);
    expect(gameStore.getState().room).toBe('cryo_bay');
  });
```

Append to `src/mcp/tools.test.ts` (inside `describe('tool handlers')`):
```ts
  it('get_deck_map lists every compartment with its status', async () => {
    const out = await call('get_deck_map');
    expect(out.ok).toBe(true);
    expect(out.rooms).toHaveLength(10);
    const byId = Object.fromEntries(out.rooms.map((r: { id: string; status: string }) => [r.id, r.status]));
    expect(byId.cryo_bay).toBe('current');
    expect(byId.engineering).toBe('locked');
    expect(byId.core_vault).toBe('sealed');
  });
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/game/rooms.test.ts src/game/store.act1.test.ts src/mcp/tools.test.ts`
Expected: FAIL — `./rooms` missing; `'medbay'` not a `RoomId` (type error at compile) / `get_deck_map` missing.

- [ ] **Step 3: Implement the room graph**

`src/game/types.ts`: replace the `RoomId` line with
```ts
export type RoomId =
  | 'cryo_bay' | 'engineering' | 'bridge'
  | 'medbay' | 'crew_quarters' | 'hydroponics' | 'cargo_bay'
  | 'reactor_room' | 'core_vault' | 'comms_array';
```

`src/game/rooms.ts`:
```ts
import type { ChapterId, DoorId, GameState, RoomId } from './types';

export interface RoomMeta {
  id: RoomId;
  chapter: ChapterId;
  requires: DoorId | null; // door that must be unlocked to enter
  x: number; // deck-map position (viewBox 400 x 140)
  y: number;
}

// Two decks. Upper: cryo → medbay → quarters → hydroponics → bridge.
// Lower: core vault → reactor → engineering → cargo → comms.
export const ROOMS: RoomMeta[] = [
  { id: 'cryo_bay', chapter: 1, requires: null, x: 60, y: 45 },
  { id: 'medbay', chapter: 2, requires: null, x: 130, y: 45 },
  { id: 'crew_quarters', chapter: 2, requires: null, x: 200, y: 45 },
  { id: 'hydroponics', chapter: 2, requires: null, x: 270, y: 45 },
  { id: 'bridge', chapter: 1, requires: 'engineering_exit', x: 345, y: 45 },
  { id: 'core_vault', chapter: 3, requires: null, x: 60, y: 100 },
  { id: 'reactor_room', chapter: 3, requires: null, x: 130, y: 100 },
  { id: 'engineering', chapter: 1, requires: 'cryo_exit', x: 200, y: 100 },
  { id: 'cargo_bay', chapter: 2, requires: null, x: 270, y: 100 },
  { id: 'comms_array', chapter: 3, requires: null, x: 345, y: 100 },
];

export const ROOM_IDS: RoomId[] = ROOMS.map((r) => r.id);
export const ROOM_BY_ID: Record<RoomId, RoomMeta> = Object.fromEntries(ROOMS.map((r) => [r.id, r])) as Record<RoomId, RoomMeta>;

export type RoomStatus = 'current' | 'open' | 'locked' | 'sealed';

export function roomStatus(s: GameState, id: RoomId): RoomStatus {
  const meta = ROOM_BY_ID[id];
  if (s.room === id) return 'current';
  if (meta.chapter > s.chapter) return 'sealed';
  if (meta.requires && !s.doors[meta.requires]) return 'locked';
  return 'open';
}
```

`src/game/store.ts`: delete the `ROOM_REQUIRES` constant; add `import { ROOM_BY_ID, roomStatus } from './rooms';`; rewrite `enterRoom`:
```ts
export function enterRoom(room: RoomId): ActionResult {
  const s = gameStore.getState();
  const status = roomStatus(s, room);
  if (status === 'sealed') {
    return { ok: false, message: `${room} is sealed. Whatever is behind that bulkhead belongs to a later chapter of this ship.` };
  }
  if (status === 'locked') {
    return { ok: false, message: `The way to ${room} is sealed.` };
  }
  const act = room === 'bridge' ? 3 : room === 'engineering' ? (Math.max(s.act, 2) as 2 | 3) : s.act;
  const checkpoint = room === 'bridge' && s.checkpoint === null ? { chapter: s.chapter, room } : s.checkpoint;
  gameStore.setState({ room, act, checkpoint });
  return { ok: true, message: `Entered ${room}.` };
}
```
(`ROOM_BY_ID` is imported for Task 5's map; if the linter complains about an unused import here, import only `roomStatus`.)

`src/game/persist.ts`: replace the local `ROOM_IDS` constant with `import { ROOM_IDS } from './rooms';`.

`src/mcp/tools.ts`: add `import { ROOMS, roomStatus } from '../game/rooms';` and a new always-on tool right after `get_ship_status`:
```ts
    mkTool(
      'get_deck_map',
      'Read the deck map: every compartment of ISV Cormorant with its status for the crew member — current, open, locked (a door you can release), or sealed (a bulkhead that will not open in this chapter of the ship). Use it to tell the crew member where they can physically go.',
      () => true,
      noInput,
      () => {
        const s = gameStore.getState();
        return {
          ok: true,
          crew_location: s.room,
          chapter: s.chapter,
          rooms: ROOMS.map((r) => ({ id: r.id, chapter: r.chapter, status: roomStatus(s, r.id), requires_door: r.requires })),
        };
      },
      true
    ),
```
Also add `chapter: s.chapter,` to `get_ship_status`'s payload (after `act`).

`src/ui/strings.ts` — `hud.rooms` in both locales gains the seven new rooms:
```ts
    rooms: {
      cryo_bay: 'cryo bay', engineering: 'engineering', bridge: 'bridge',
      medbay: 'medbay', crew_quarters: 'crew quarters', hydroponics: 'hydroponics', cargo_bay: 'cargo bay',
      reactor_room: 'reactor room', core_vault: 'core vault', comms_array: 'comms array',
    },
```
```ts
    rooms: {
      cryo_bay: 'baia criogênica', engineering: 'engenharia', bridge: 'ponte',
      medbay: 'enfermaria', crew_quarters: 'cabines', hydroponics: 'hidroponia', cargo_bay: 'porão de carga',
      reactor_room: 'sala do reator', core_vault: 'cofre do núcleo', comms_array: 'arranjo de comms',
    },
```

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run && npm run build`
Expected: PASS (the `toolAvailability` "starts with only the always-on tools" test now needs `get_deck_map` in its expected list — add it there), build clean.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: ten-compartment room graph with sealed rooms and get_deck_map"
```

---

### Task 5: Scene registry and the deck map

**Files:**
- Create: `src/scenes/registry.tsx`, `src/scenes/SealedCompartment.tsx`, `src/ui/DeckMap.tsx`
- Modify: `src/App.tsx`, `src/ui/strings.ts`, `src/styles/theme.css`

**Interfaces:**
- Consumes: `ROOMS`, `roomStatus`, `enterRoom`, `useGame`, `useStrings`, the three scene components.
- Produces: `SCENES: Record<RoomId, () => JSX.Element>`; `<DeckMap />`; `strings.deck.{title, legendOpen, legendLocked, legendSealed}` and `strings.sealed.{title, body}`.

- [ ] **Step 1: Strings**

Add to the `UIStrings` interface:
```ts
  deck: { title: string; legendOpen: string; legendLocked: string; legendSealed: string };
  sealed: { title: string; body: string };
```
EN:
```ts
  deck: { title: 'Deck map', legendOpen: 'open', legendLocked: 'locked', legendSealed: 'sealed' },
  sealed: {
    title: 'Sealed bulkhead',
    body: 'The door here is welded from the other side, and the ship has no opinion about it yet. Whatever this compartment holds belongs to a later chapter.',
  },
```
PT:
```ts
  deck: { title: 'Mapa do convés', legendOpen: 'aberto', legendLocked: 'trancado', legendSealed: 'selado' },
  sealed: {
    title: 'Anteparo selado',
    body: 'A porta aqui foi soldada do outro lado, e a nave ainda não tem opinião sobre isso. O que este compartimento guarda pertence a um capítulo posterior.',
  },
```

- [ ] **Step 2: Sealed scene and registry**

`src/scenes/SealedCompartment.tsx`:
```tsx
import { useStrings } from '../ui/useLocale';

export function SealedCompartment() {
  const t = useStrings();
  return (
    <div className="scene">
      <div className="panel">
        <h2>{t.sealed.title}</h2>
        <p className="status-dim">{t.sealed.body}</p>
      </div>
    </div>
  );
}
```

`src/scenes/registry.tsx`:
```tsx
import type { JSX } from 'react';
import type { RoomId } from '../game/types';
import { CryoBay } from './CryoBay';
import { Engineering } from './Engineering';
import { Bridge } from './Bridge';
import { SealedCompartment } from './SealedCompartment';

export const SCENES: Record<RoomId, () => JSX.Element> = {
  cryo_bay: CryoBay,
  engineering: Engineering,
  bridge: Bridge,
  medbay: SealedCompartment,
  crew_quarters: SealedCompartment,
  hydroponics: SealedCompartment,
  cargo_bay: SealedCompartment,
  reactor_room: SealedCompartment,
  core_vault: SealedCompartment,
  comms_array: SealedCompartment,
};
```

- [ ] **Step 3: The deck map**

`src/ui/DeckMap.tsx`:
```tsx
import { ROOMS, roomStatus } from '../game/rooms';
import { enterRoom } from '../game/store';
import { useGame } from './useGame';
import { useStrings } from './useLocale';

const FILL = { current: 'var(--amber)', open: '#1d2620', locked: '#10151a', sealed: '#0b0e0c' } as const;
const STROKE = { current: 'var(--amber)', open: 'var(--green)', locked: 'var(--dim)', sealed: '#2a3a30' } as const;

export function DeckMap() {
  const state = useGame((s) => s);
  const t = useStrings();
  return (
    <div className="deckmap" aria-label={t.deck.title}>
      <svg viewBox="0 0 400 140" width="100%" role="group">
        {/* hull silhouette */}
        <path d="M 14 30 L 40 14 L 370 14 L 392 45 L 392 105 L 370 128 L 40 128 L 14 110 Z" fill="#0a0e0c" stroke="#2a3a30" strokeWidth="2" />
        <line x1="20" y1="72" x2="388" y2="72" stroke="#2a3a30" strokeWidth="1" strokeDasharray="3 3" />
        {ROOMS.map((r) => {
          const status = roomStatus(state, r.id);
          const clickable = status === 'open';
          return (
            <g
              key={r.id}
              onClick={clickable ? () => enterRoom(r.id) : undefined}
              style={{ cursor: clickable ? 'pointer' : 'default' }}
              role={clickable ? 'button' : undefined}
              aria-label={`${t.hud.rooms[r.id]} — ${status === 'current' ? '' : status}`}
            >
              <rect x={r.x - 30} y={r.y - 16} width="60" height="32" rx="3"
                fill={FILL[status]} stroke={STROKE[status]} strokeWidth={status === 'current' ? 2 : 1}
                strokeDasharray={status === 'sealed' ? '2 2' : undefined} />
              <text x={r.x} y={r.y + 3} textAnchor="middle" fontSize="7.5" letterSpacing="0.5"
                fill={status === 'current' ? '#0a0e0c' : status === 'sealed' ? '#3d4f45' : 'var(--text)'}>
                {t.hud.rooms[r.id].toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="status-dim" style={{ fontSize: 11 }}>
        <span style={{ color: 'var(--green)' }}>■</span> {t.deck.legendOpen}{' '}
        <span style={{ color: 'var(--dim)' }}>■</span> {t.deck.legendLocked}{' '}
        <span style={{ color: '#2a3a30' }}>■</span> {t.deck.legendSealed}
      </div>
    </div>
  );
}
```
`src/styles/theme.css` append:
```css
.deckmap {
  max-width: 560px;
  margin: 12px auto 0;
  padding: 0 16px;
}
```

- [ ] **Step 4: App uses the registry and shows the map**

In `src/App.tsx`: remove the four scene imports; add `import { SCENES } from './scenes/registry';`, `import { Epilogue } from './scenes/Epilogue';` (Epilogue stays a direct import), `import { DeckMap } from './ui/DeckMap';`. Replace the room ternary in the started branch with:
```tsx
      {won ? (
        <Epilogue />
      ) : (
        <>
          <DeckMap />
          {(() => {
            const Scene = SCENES[room];
            return <Scene />;
          })()}
        </>
      )}
```

- [ ] **Step 5: Verify**

Run: `npx vitest run && npm run build`
Expected: PASS, build clean. Then `npm run dev`: the map shows ten compartments — cryo bay amber, engineering dim-locked, seven sealed with dashed outlines; after the cryo door unlocks, engineering turns green and clicking it moves the player (same as the door button).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: scene registry and deck map navigation"
```

---

### Task 6: The sealed log — bridge panel, `read_sealed_log`, ship status

**Files:**
- Modify: `src/scenes/Bridge.tsx`, `src/mcp/tools.ts`, `src/ui/strings.ts`
- Test: `src/mcp/tools.test.ts` (append)

**Interfaces:**
- Consumes: `breakSeal()`, `sealedLogRead`, `trajectorySet`.
- Produces: `<SealedLog />` panel inside `Bridge`; tool `read_sealed_log` (available when `sealedLogRead`); `get_ship_status.sealed_log: 'none' | 'unread' | 'read'`; strings `bridge.{sealedTitle, sealedFound, breakSeal, sealedLine, sealedAfter}`.

- [ ] **Step 1: Write the failing tests**

Append to `src/mcp/tools.test.ts` inside `describe('tool handlers')`:
```ts
  it('read_sealed_log is offline until the human breaks the seal, then returns the 94-second line', async () => {
    gameStore.setState({ act: 3, room: 'bridge', starFixTaken: true, trajectorySet: true });
    expect(toolAvailability(gameStore.getState()).find((t) => t.name === 'read_sealed_log')!.online).toBe(false);
    const status1 = await call('get_ship_status');
    expect(status1.sealed_log).toBe('unread');
    breakSeal();
    expect(toolAvailability(gameStore.getState()).find((t) => t.name === 'read_sealed_log')!.online).toBe(true);
    const out = await call('read_sealed_log');
    expect(out.ok).toBe(true);
    expect(out.text).toMatch(/94 seconds/);
    const status2 = await call('get_ship_status');
    expect(status2.sealed_log).toBe('read');
  });
```
Add `breakSeal` to the store import at the top of the test file.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/mcp/tools.test.ts`
Expected: FAIL — no `read_sealed_log`, `sealed_log` undefined.

- [ ] **Step 3: Implement**

`src/mcp/tools.ts` — in `get_ship_status`'s payload add:
```ts
          sealed_log: !s.trajectorySet ? 'none' : s.sealedLogRead ? 'read' : 'unread',
```
and add a new tool after `compute_escape_trajectory`:
```ts
    mkTool(
      'read_sealed_log',
      'Read the sealed log the pre-launch check surfaced — addressed to the crew member by name, seal broken by their hand. It is short, and it does not fit the story of this ship.',
      (s) => s.sealedLogRead,
      noInput,
      () => ({
        ok: true,
        addressed_to: 'the medical officer, by name',
        text:
          'PRIME died 94 seconds before the storm. Main computer shutdown logged at T-00:01:34 before first debris impact. ' +
          'Origin of the shutdown command: withheld. If you are reading this, you launched before the ship could explain itself.',
        note: 'This changes nothing about the launch. It changes everything about the ship. Decide together whether to leave now.',
      }),
      true
    ),
```

`src/ui/strings.ts` — `bridge` gains:
```ts
    sealedTitle: string; sealedFound: string; breakSeal: string; sealedLine: string; sealedAfter: string;
```
EN:
```ts
    sealedTitle: 'Pre-launch check — sealed log',
    sealedFound: 'The pre-launch check surfaced a sealed log wedged behind the console. It is addressed to you. By name.',
    breakSeal: 'Break the seal',
    sealedLine: '"PRIME died 94 seconds before the storm."',
    sealedAfter: 'Your AI can read the full entry now. It will not make the launch any easier.',
```
PT:
```ts
    sealedTitle: 'Checagem pré-lançamento — log selado',
    sealedFound: 'A checagem pré-lançamento revelou um log selado encaixado atrás do console. Está endereçado a você. Pelo nome.',
    breakSeal: 'Romper o selo',
    sealedLine: '"PRIME morreu 94 segundos antes da tempestade."',
    sealedAfter: 'Sua IA pode ler a entrada completa agora. Isso não vai facilitar o lançamento.',
```

`src/scenes/Bridge.tsx` — import `breakSeal` from the store and add, between `Viewport` and `LaunchConsole` in the `Bridge` layout:
```tsx
function SealedLog() {
  const trajectorySet = useGame((s) => s.trajectorySet);
  const read = useGame((s) => s.sealedLogRead);
  const t = useStrings();
  if (!trajectorySet) return null;
  return (
    <div className="panel" style={{ borderColor: read ? 'var(--line)' : 'var(--amber)' }}>
      <h2>{t.bridge.sealedTitle}</h2>
      {read ? (
        <>
          <p style={{ fontSize: 17 }}>{t.bridge.sealedLine}</p>
          <p className="status-dim">{t.bridge.sealedAfter}</p>
        </>
      ) : (
        <>
          <p className="status-dim">{t.bridge.sealedFound}</p>
          <button onClick={() => breakSeal()}>{t.bridge.breakSeal}</button>
        </>
      )}
    </div>
  );
}
```
and render `<SealedLog />` after `<Viewport />` in `Bridge()`.

- [ ] **Step 4: Verify**

Run: `npx vitest run && npm run build`
Expected: PASS, build clean.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: the sealed log — chapter 1's hook into the mystery"
```

---

### Task 7: "Leave, unknowing" epilogue and the checkpoint on the start screen

**Files:**
- Modify: `src/scenes/Epilogue.tsx`, `src/App.tsx`, `src/ui/strings.ts`

**Interfaces:**
- Consumes: `sealedLogRead`, `ending`, `loadSavedState()?.checkpoint`.
- Produces: `strings.epilogue.{outroKnowing, outroUnknowing}`, `strings.app.checkpoint(chapter, room)`.

- [ ] **Step 1: Strings**

`epilogue` interface gains `outroKnowing: string; outroUnknowing: string;`; `app` gains `checkpoint: (chapter: number, room: string) => string;`.
EN:
```ts
    outroKnowing:
      'The Cormorant shrinks behind you — dark, patient, and holding its breath. You broke the seal. You read the line. You launched anyway. Ninety-four seconds is a long time to leave unexplained.',
    outroUnknowing:
      'The Cormorant shrinks behind you — dark, patient, and finally at rest. Somewhere behind the launch console, a sealed message you never found keeps its ninety-four seconds to itself.',
```
```ts
    checkpoint: (chapter, room) => `Checkpoint — Chapter ${chapter}: ${room}`,
```
PT:
```ts
    outroKnowing:
      'A Cormorant encolhe atrás de você — escura, paciente, prendendo a respiração. Você rompeu o selo. Leu a linha. Lançou mesmo assim. Noventa e quatro segundos é muito tempo para deixar sem explicação.',
    outroUnknowing:
      'A Cormorant encolhe atrás de você — escura, paciente e finalmente em paz. Em algum lugar atrás do console de lançamento, uma mensagem selada que você nunca encontrou guarda seus noventa e quatro segundos para si.',
```
```ts
    checkpoint: (chapter, room) => `Checkpoint — Capítulo ${chapter}: ${room}`,
```
Keep `outro` in the dictionary (Plan B's endings will reuse the classic line).

- [ ] **Step 2: Epilogue variants**

In `src/scenes/Epilogue.tsx`, read `const read = useGame((s) => s.sealedLogRead);` and replace `<p>{t.epilogue.outro}</p>` with `<p>{read ? t.epilogue.outroKnowing : t.epilogue.outroUnknowing}</p>`.

- [ ] **Step 3: Start screen checkpoint line**

In `src/App.tsx`, replace `const [hasSave, setHasSave] = useState(() => loadSavedState() !== null);` with:
```tsx
  const [saved, setSaved] = useState(() => loadSavedState());
  const hasSave = saved !== null;
```
Update the abandon button's handler to `setSaved(null)` instead of `setHasSave(false)`. Above the buttons `<div>` add:
```tsx
        {saved?.checkpoint && (
          <p className="status-dim">{t.app.checkpoint(saved.checkpoint.chapter, t.hud.rooms[saved.checkpoint.room])}</p>
        )}
```

- [ ] **Step 4: Verify**

Run: `npx vitest run && npm run build`
Expected: PASS, build clean. `npm run dev`: win once without breaking the seal → the "unknowing" outro; win after breaking it → the "knowing" outro; reload after reaching the bridge → the start screen shows the checkpoint line.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: leave-unknowing epilogue variants and checkpoint on the start screen"
```

---

### Task 8: Full playthrough, merge, deploy

**Files:** none new.

- [ ] **Step 1: Classic and seeded playthroughs** (with the user, ChatGPT in-app browser and Chrome+flag): cryo bay → engineering → bridge, deck map navigation both ways, sealed rooms refuse, sealed log appears after the trajectory locks, both epilogue variants, checkpoint line after reload. Verify a **v1 save migrates**: in Chrome DevTools before loading the new build, confirm `localStorage['derelict-save-v1']` exists from an old run; after loading, the game resumes in the same room and `derelict-save-v2` appears.

- [ ] **Step 2: Merge and deploy**

```bash
git checkout main && git merge directors-cut --no-edit && npx vitest run && npm run build && git push origin main && npx vercel --prod --yes
git checkout directors-cut && git merge main
```

- [ ] **Step 3: Record** the outcome in the Director's Cut spec addendum (one line: "Plan A shipped <date>").

---

## Self-review notes

- Spec §3 (Chapter 1 retune: sealed log, early ending, checkpoint) → Tasks 2, 6, 7. §4 navigation (deck map, `get_deck_map`, ten compartments) → Tasks 4, 5. §6 ritual framework → Task 1. §7.1 chapters & save v2 with migration → Tasks 2, 3. §7.2 registry → Task 5. §10 addendum (branch, phased delivery) → Global Constraints + Task 8.
- Type/name consistency: `RitualState { active, phase, endsAt, held }` used identically in Tasks 1, 3, 5–7; `roomStatus`/`ROOMS`/`ROOM_IDS` in Tasks 3–5; `breakSeal` in Tasks 2, 6; `sealedLogRead` in Tasks 2, 6, 7; `checkpoint` shape `{ chapter, room }` in Tasks 2, 3, 7.
- Task 3 notes the `ROOM_IDS` ordering dependency explicitly (local constant until Task 4 lands).
