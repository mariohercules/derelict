# Director's Cut — Plan B: Chapter 2 "The Investigation" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open the mid-deck of ISV Cormorant — Medbay, Crew Quarters, Hydroponics, Cargo Bay — with four human/agent puzzles that assemble the second layer of the mystery (PRIME was shut down from the medic's own terminal; the debris was the ISV Kestrel), ending with the kill-switch stirring.

**Architecture:** Same skeleton as Plan A: Zustand store as single source of truth; puzzle secrets derived from the run seed; narrative as locale-aware templates; tools as thin adapters over store actions; scenes registered per room. New this plan: an explicit room adjacency graph (edges with optional doors), a `chapter2` state slice, `killswitch` state, and seven new tools (23 total).

**Tech Stack:** React 19 + TypeScript + Vite, Zustand, Vitest, Web Speech API (`speechSynthesis`) for the voice recorder with a text fallback. No new dependencies, no raster assets.

**Spec:** `docs/superpowers/specs/2026-08-26-derelict-directors-cut-design.md` (§2 layer 2, §3 chapter 2, §4 compartments table, §10 addendum). Approved chapter-2 puzzle design (this plan is its argument): Investigate panel on the bridge → chapter 2; medband strip chart (6 minutes conscious) + terminal burn-in; Vasquez's safe (last three digits of her commission number, from the manifest) → private log; Okafor's recorder (human-only audio) → "I wrote it in the garden"; irrigation budget puzzle → data spike; crane grid → quarantine slot → hull fragment registry → `analyze_sample` → Kestrel → kill-switch stirs.

## Global Constraints

- **Premium graphics standard (non-negotiable):** every new instrument is drawn to the standard set by Plan A's Engineering gauges, fuse cartridges, viewport, and the memory cel — bezels and inset faces, deterministic geometry (no `Math.random` at render), gradients from the token palette (`--hull`, `--amber`, `--green`, `--red`, `--dim`, `--text`, `--line`), micro-animation only where it reads as machinery (and disabled under `prefers-reduced-motion`), labels engraved on plates, hover/focus states visible. No emoji glyphs as art, no default browser controls left unstyled, no rectangles-with-text passing as instruments.
- Branch `directors-cut`; merge to `main` + prod deploy only in Task 9 after a full playthrough.
- Classic ship (`seed 0`) preserved; new secrets have classic values: commission `2263941` (safe `9-4-1`), water needs `[4, 3, 3]`, quarantine slot `C2` (`row 2, col 1`), registry fragment `7741`.
- 108 existing tests stay green at every commit (updated only where a signature changes: `getCrewManifest(seed)`).
- Room movement is edge-based: `EDGES` in `rooms.ts` is the only adjacency source; `roomStatus` drives store, tool, and map alike.
- All player-facing text in both locales in `src/ui/strings.ts`; agent-facing text English, in-fiction, anti-deflection conventions (no keypads; "call this tool yourself"; success messages name the human's next physical step).
- Tool handlers contain no game logic — store actions/selectors only; never throw.
- Commit messages end with a blank line then `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Verification gate for every commit: `npx vitest run && npm run build` both exit 0 (gate on exit codes).

---

### Task 1: Room adjacency, map corridors, and `ending` as the epilogue discriminator

**Files:**
- Modify: `src/game/rooms.ts`, `src/game/store.ts`, `src/game/types.ts`, `src/game/persist.ts`, `src/mcp/tools.ts`, `src/ui/DeckMap.tsx`, `src/scenes/Epilogue.tsx`
- Test: `src/game/rooms.test.ts` (append), `src/game/store.act3.test.ts` (append), `src/game/persist.test.ts` (append)

**Interfaces:**
- Produces: `interface Edge { a: RoomId; b: RoomId; door?: DoorId }`, `EDGES: Edge[]`, `edgeBetween(a, b): Edge | undefined`; `RoomMeta` loses `requires`; `roomStatus` returns `'locked'` for non-adjacent rooms; `EndingId = 'leave_unknowing' | 'leave_knowing'`; `confirmLaunch` sets `ending` from `sealedLogRead`; Epilogue branches on `ending`.

- [ ] **Step 1: Failing tests**

Append to `src/game/rooms.test.ts`:
```ts
import { EDGES, edgeBetween } from './rooms';

describe('adjacency', () => {
  it('rooms connect only along corridors', () => {
    expect(edgeBetween('cryo_bay', 'engineering')?.door).toBe('cryo_exit');
    expect(edgeBetween('engineering', 'bridge')?.door).toBe('engineering_exit');
    expect(edgeBetween('cryo_bay', 'bridge')).toBeUndefined();
    expect(EDGES.length).toBe(10);
  });

  it('an open door to a non-adjacent room does not make it reachable', () => {
    gameStore.setState({ doors: { cryo_exit: true, engineering_exit: true } });
    // from cryo bay, the bridge is two corridors away
    expect(roomStatus(gameStore.getState(), 'bridge')).toBe('locked');
    gameStore.setState({ room: 'engineering' });
    expect(roomStatus(gameStore.getState(), 'bridge')).toBe('open');
  });

  it('chapter-2 corridors open without doors once the chapter is reached', () => {
    gameStore.setState({ chapter: 2 });
    expect(roomStatus(gameStore.getState(), 'medbay')).toBe('open');
    expect(roomStatus(gameStore.getState(), 'crew_quarters')).toBe('locked'); // not adjacent to cryo bay
  });
});
```
(`import { EDGES, edgeBetween }` merges into the file's existing `./rooms` import.)

Append to `src/game/store.act3.test.ts` inside `describe('chapter 1 hook: the sealed log')`:
```ts
  it('winning after breaking the seal records the "leave, knowing" ending', () => {
    takeStarFix();
    computeTrajectory([...STAR_FIX]);
    breakSeal();
    initiateLaunch(LAUNCH_AUTH, T0);
    holdHandle(true);
    confirmLaunch(T0 + 1000);
    expect(gameStore.getState().ending).toBe('leave_knowing');
  });
```

Append to `src/game/persist.test.ts` (inside `describe('persistence')`):
```ts
  it('accepts the leave_knowing ending', () => {
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), ending: 'leave_knowing', won: true }));
    expect(loadSavedState()?.ending).toBe('leave_knowing');
  });
```

- [ ] **Step 2: Run to verify they fail** — `npx vitest run src/game/rooms.test.ts src/game/store.act3.test.ts src/game/persist.test.ts` → FAIL (`EDGES` missing; ending stays `leave_unknowing`; persist rejects).

- [ ] **Step 3: Implement**

`src/game/rooms.ts` — replace the file:
```ts
import type { ChapterId, DoorId, GameState, RoomId } from './types';

export interface RoomMeta {
  id: RoomId;
  chapter: ChapterId;
  x: number; // deck-map position (viewBox 400 x 140)
  y: number;
}

export interface Edge {
  a: RoomId;
  b: RoomId;
  door?: DoorId; // a door that must be unlocked to pass
}

// Two decks. Upper: cryo → medbay → quarters → hydroponics → bridge.
// Lower: core vault → reactor → engineering → cargo → comms.
export const ROOMS: RoomMeta[] = [
  { id: 'cryo_bay', chapter: 1, x: 60, y: 45 },
  { id: 'medbay', chapter: 2, x: 130, y: 45 },
  { id: 'crew_quarters', chapter: 2, x: 200, y: 45 },
  { id: 'hydroponics', chapter: 2, x: 270, y: 45 },
  { id: 'bridge', chapter: 1, x: 345, y: 45 },
  { id: 'core_vault', chapter: 3, x: 60, y: 100 },
  { id: 'reactor_room', chapter: 3, x: 130, y: 100 },
  { id: 'engineering', chapter: 1, x: 200, y: 100 },
  { id: 'cargo_bay', chapter: 2, x: 270, y: 100 },
  { id: 'comms_array', chapter: 3, x: 345, y: 100 },
];

// Corridors. Movement happens only along these; a corridor with a door needs it unlocked.
export const EDGES: Edge[] = [
  { a: 'cryo_bay', b: 'engineering', door: 'cryo_exit' },
  { a: 'engineering', b: 'bridge', door: 'engineering_exit' },
  { a: 'cryo_bay', b: 'medbay' },
  { a: 'medbay', b: 'crew_quarters' },
  { a: 'crew_quarters', b: 'hydroponics' },
  { a: 'hydroponics', b: 'bridge' },
  { a: 'engineering', b: 'cargo_bay' },
  { a: 'engineering', b: 'reactor_room' },
  { a: 'reactor_room', b: 'core_vault' },
  { a: 'bridge', b: 'comms_array' },
];

export const ROOM_IDS: RoomId[] = ROOMS.map((r) => r.id);
export const ROOM_BY_ID: Record<RoomId, RoomMeta> = Object.fromEntries(ROOMS.map((r) => [r.id, r])) as Record<RoomId, RoomMeta>;

export function edgeBetween(a: RoomId, b: RoomId): Edge | undefined {
  return EDGES.find((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a));
}

export type RoomStatus = 'current' | 'open' | 'locked' | 'sealed';

export function roomStatus(s: GameState, id: RoomId): RoomStatus {
  const meta = ROOM_BY_ID[id];
  if (s.room === id) return 'current';
  if (meta.chapter > s.chapter) return 'sealed';
  const edge = edgeBetween(s.room, id);
  if (!edge) return 'locked';
  if (edge.door && !s.doors[edge.door]) return 'locked';
  return 'open';
}
```

`src/game/store.ts` — in `enterRoom`, replace the `locked` branch with:
```ts
  if (status === 'locked') {
    return edgeBetween(s.room, room)
      ? { ok: false, message: `The way to ${room} is sealed.` }
      : { ok: false, message: `There is no direct passage from ${s.room} to ${room}. The Cormorant is crossed compartment by compartment.` };
  }
```
(import `edgeBetween` alongside `roomStatus`). In `confirmLaunch`'s success branch: `ending: s.sealedLogRead ? 'leave_knowing' : 'leave_unknowing'`.

`src/game/types.ts`: `export type EndingId = 'leave_unknowing' | 'leave_knowing';`

`src/game/persist.ts`: the ending check becomes `if (p.ending !== undefined && p.ending !== null && !['leave_unknowing', 'leave_knowing'].includes(p.ending)) return false;`

`src/mcp/tools.ts` `get_deck_map`: replace `requires_door: r.requires` with `door: edgeBetween(s.room, r.id)?.door ?? null, adjacent: edgeBetween(s.room, r.id) !== undefined,` (import `edgeBetween`), and extend the description: '... locked (either no direct corridor from where the crew member stands, or a door you can release) ...'.

`src/scenes/Epilogue.tsx`: replace `const read = useGame((s) => s.sealedLogRead);` with `const ending = useGame((s) => s.ending);` and branch `ending === 'leave_knowing' ? t.epilogue.outroKnowing : t.epilogue.outroUnknowing`.

`src/ui/DeckMap.tsx` — draw corridors under the rooms. After the hull `<line>` and before `{ROOMS.map(...)}`:
```tsx
        {EDGES.map((e) => {
          const a = ROOM_BY_ID[e.a];
          const b = ROOM_BY_ID[e.b];
          const passable =
            a.chapter <= state.chapter && b.chapter <= state.chapter && (!e.door || state.doors[e.door]);
          return (
            <line key={`${e.a}-${e.b}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={passable ? 'rgba(125, 219, 138, 0.45)' : '#24302a'} strokeWidth="2"
              strokeDasharray={passable ? undefined : '3 3'} />
          );
        })}
```
(import `EDGES, ROOM_BY_ID` from `../game/rooms`.)

- [ ] **Step 4: Run** — `npx vitest run && npm run build` → PASS (108 + 5), build clean.
- [ ] **Step 5: Commit** — `git commit -m "feat: room corridors, map edges, and ending as the epilogue discriminator"`

---

### Task 2: Chapter-2 state, secrets, and store actions

**Files:**
- Modify: `src/game/types.ts`, `src/game/secrets.ts`, `src/game/content.ts`, `src/game/store.ts`, `src/game/derived.ts`, `src/game/persist.ts`
- Test: `src/game/secrets.test.ts` (append), create `src/game/store.ch2.test.ts`, `src/game/persist.test.ts` (append)

**Interfaces:**
- Types: `KillswitchState = 'dormant' | 'stirring'`; `Chapter2State { medbandExamined; commandTraced; safeOpened; recorderPlayed; privateLogDecrypted; irrigation: [n,n,n]; irrigationSolved; spikeRetrieved; craneAt: { row; col }; crateLifted; sampleAnalyzed }`; `GameState.chapter2`, `GameState.killswitch`.
- Secrets: `commissionNumber: string` (7 digits), `safeCombo: [n,n,n]`, `waterNeeds: [n,n,n]`, `quarantineSlot: { row; col }`, `registryFragment: string` (4 digits); `slotLabel({row,col})` → `'C2'`.
- Content: `WATER_BUDGET = 10`, `SPIKE_BED = 1`.
- Derived: `irrigationReport(s): { beds: ('dry'|'ok'|'flooded')[]; total: number; overBudget: boolean; solved: boolean }`.
- Store actions: `startInvestigation(): ActionResult`, `examineMedband(): void`, `dialSafe(combo: [n,n,n]): ActionResult`, `playRecorder(): void`, `setIrrigation(i: 0|1|2, v: number): void`, `runIrrigation(): ActionResult & { beds: string[]; solved: boolean }`, `retrieveSpike(): ActionResult`, `moveCrane(dir: 'up'|'down'|'left'|'right'): void`, `liftCrate(): ActionResult`, `traceCommand(): ActionResult`, `decryptPrivateLog(): ActionResult`, `analyzeSample(fragment: string): ActionResult`.

- [ ] **Step 1: Failing tests**

Append to `src/game/secrets.test.ts` (inside `describe('secretsFor')`):
```ts
  it('seed 0 carries the classic chapter-2 secrets', () => {
    const s = secretsFor(0);
    expect(s.commissionNumber).toBe('2263941');
    expect(s.safeCombo).toEqual([9, 4, 1]);
    expect(s.waterNeeds).toEqual([4, 3, 3]);
    expect(s.quarantineSlot).toEqual({ row: 2, col: 1 });
    expect(slotLabel(s.quarantineSlot)).toBe('C2');
    expect(s.registryFragment).toBe('7741');
  });

  it('keeps chapter-2 secrets inside their puzzle rules across many seeds', () => {
    for (let seed = 1; seed <= 400; seed++) {
      const s = secretsFor(seed);
      expect(s.commissionNumber).toMatch(/^\d{7}$/);
      expect(s.safeCombo).toEqual(s.commissionNumber.slice(-3).split('').map(Number));
      expect(s.waterNeeds.every((w) => w >= 1 && w <= 5)).toBe(true);
      expect(s.waterNeeds[0] + s.waterNeeds[1] + s.waterNeeds[2]).toBeLessThanOrEqual(10);
      expect(s.quarantineSlot.row).toBeGreaterThanOrEqual(0);
      expect(s.quarantineSlot.row).toBeLessThanOrEqual(2);
      expect(s.quarantineSlot.col).toBeGreaterThanOrEqual(0);
      expect(s.quarantineSlot.col).toBeLessThanOrEqual(2);
      expect(s.registryFragment).toMatch(/^\d{4}$/);
    }
  });
```
(add `slotLabel` to the `./secrets` import.)

`src/game/store.ch2.test.ts`:
```ts
import { beforeEach, describe, expect, it } from 'vitest';
import {
  gameStore, resetGame, startInvestigation, examineMedband, dialSafe, playRecorder, setIrrigation, runIrrigation,
  retrieveSpike, moveCrane, liftCrate, traceCommand, decryptPrivateLog, analyzeSample,
} from './store';
import { irrigationReport } from './derived';

function investigating() {
  resetGame(0);
  gameStore.setState({ room: 'bridge', act: 3, trajectorySet: true, sealedLogRead: true });
  startInvestigation();
}

beforeEach(() => resetGame(0));

describe('startInvestigation', () => {
  it('needs the bridge and the broken seal', () => {
    expect(startInvestigation().ok).toBe(false);
    gameStore.setState({ room: 'bridge', trajectorySet: true });
    expect(startInvestigation().ok).toBe(false);
    gameStore.setState({ sealedLogRead: true });
    expect(startInvestigation().ok).toBe(true);
    expect(gameStore.getState().chapter).toBe(2);
    expect(gameStore.getState().checkpoint).toEqual({ chapter: 2, room: 'bridge' });
  });
});

describe('medbay', () => {
  it('examining the band and tracing the command set their flags', () => {
    investigating();
    examineMedband();
    expect(traceCommand().ok).toBe(true);
    expect(gameStore.getState().chapter2.medbandExamined).toBe(true);
    expect(gameStore.getState().chapter2.commandTraced).toBe(true);
  });
});

describe('crew quarters', () => {
  it('the safe opens only on the classic combination 9-4-1', () => {
    investigating();
    gameStore.setState({ room: 'crew_quarters' });
    expect(dialSafe([1, 2, 3]).ok).toBe(false);
    expect(gameStore.getState().chapter2.safeOpened).toBe(false);
    expect(dialSafe([9, 4, 1]).ok).toBe(true);
    expect(gameStore.getState().chapter2.safeOpened).toBe(true);
  });

  it('the private log decrypts only after the safe is open', () => {
    investigating();
    expect(decryptPrivateLog().ok).toBe(false);
    gameStore.setState({ room: 'crew_quarters' });
    dialSafe([9, 4, 1]);
    expect(decryptPrivateLog().ok).toBe(true);
    playRecorder();
    expect(gameStore.getState().chapter2.recorderPlayed).toBe(true);
  });
});

describe('hydroponics', () => {
  it('reports dry/ok/flooded per bed and refuses an over-budget cycle', () => {
    investigating();
    setIrrigation(0, 9); setIrrigation(1, 9); setIrrigation(2, 9);
    const over = runIrrigation();
    expect(over.ok).toBe(false);
    setIrrigation(0, 2); setIrrigation(1, 3); setIrrigation(2, 5);
    const r = runIrrigation();
    expect(r.ok).toBe(true);
    expect(r.beds).toEqual(['dry', 'ok', 'flooded']);
    expect(r.solved).toBe(false);
  });

  it('solving the cycle reveals the spike', () => {
    investigating();
    expect(retrieveSpike().ok).toBe(false);
    setIrrigation(0, 4); setIrrigation(1, 3); setIrrigation(2, 3);
    expect(runIrrigation().solved).toBe(true);
    expect(irrigationReport(gameStore.getState()).solved).toBe(true);
    expect(retrieveSpike().ok).toBe(true);
    expect(gameStore.getState().chapter2.spikeRetrieved).toBe(true);
  });
});

describe('cargo bay', () => {
  it('the crane lifts the quarantine crate only at its slot', () => {
    investigating();
    gameStore.setState({ room: 'cargo_bay' });
    expect(liftCrate().ok).toBe(false); // A1 is an ordinary crate
    moveCrane('down'); moveCrane('down'); moveCrane('right');
    expect(gameStore.getState().chapter2.craneAt).toEqual({ row: 2, col: 1 });
    expect(liftCrate().ok).toBe(true);
    expect(gameStore.getState().chapter2.crateLifted).toBe(true);
  });

  it('the crane stays inside the 3x3 grid', () => {
    investigating();
    moveCrane('up'); moveCrane('left');
    expect(gameStore.getState().chapter2.craneAt).toEqual({ row: 0, col: 0 });
    for (let i = 0; i < 5; i++) { moveCrane('down'); moveCrane('right'); }
    expect(gameStore.getState().chapter2.craneAt).toEqual({ row: 2, col: 2 });
  });

  it('analyzing the right registry fragment names the Kestrel and wakes the kill-switch', () => {
    investigating();
    gameStore.setState({ room: 'cargo_bay' });
    expect(analyzeSample('7741').ok).toBe(false); // nothing lifted yet
    moveCrane('down'); moveCrane('down'); moveCrane('right'); liftCrate();
    expect(analyzeSample('0000').ok).toBe(false);
    expect(gameStore.getState().killswitch).toBe('dormant');
    expect(analyzeSample('7741').ok).toBe(true);
    expect(gameStore.getState().chapter2.sampleAnalyzed).toBe(true);
    expect(gameStore.getState().killswitch).toBe('stirring');
  });
});
```

Append to `src/game/persist.test.ts`:
```ts
  it('fills chapter-2 defaults for a Plan A save and rejects a bogus kill-switch state', () => {
    const planA = { ...initialState(0) } as Record<string, unknown>;
    delete planA.chapter2;
    delete planA.killswitch;
    storage.set(SAVE_KEY, JSON.stringify(planA));
    expect(loadSavedState()?.chapter2.crateLifted).toBe(false);
    expect(loadSavedState()?.killswitch).toBe('dormant');
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), killswitch: 'bogus' }));
    expect(loadSavedState()).toBeNull();
  });
```

- [ ] **Step 2: Run to verify they fail** — FAIL (missing exports/fields).

- [ ] **Step 3: Implement**

`src/game/types.ts` additions:
```ts
export type KillswitchState = 'dormant' | 'stirring';

export interface Chapter2State {
  medbandExamined: boolean;
  commandTraced: boolean;
  safeOpened: boolean;
  recorderPlayed: boolean;
  privateLogDecrypted: boolean;
  irrigation: [number, number, number];
  irrigationSolved: boolean;
  spikeRetrieved: boolean;
  craneAt: { row: number; col: number };
  crateLifted: boolean;
  sampleAnalyzed: boolean;
}
```
`GameState` gains `chapter2: Chapter2State;` and `killswitch: KillswitchState;`.

`src/game/content.ts` additions:
```ts
export const WATER_BUDGET = 10; // units per irrigation cycle
export const SPIKE_BED = 1; // the vine-choked middle bed hides Okafor's data spike
```

`src/game/secrets.ts` — extend `Secrets`:
```ts
  commissionNumber: string; // 7 digits; Vasquez's safe opens on its last three
  safeCombo: [number, number, number];
  waterNeeds: [number, number, number]; // per bed, 1–5, sum ≤ WATER_BUDGET
  quarantineSlot: { row: number; col: number }; // 0–2 each
  registryFragment: string; // 4 digits stencilled on the hull fragment
```
Classic branch adds: `commissionNumber: '2263941', safeCombo: [9, 4, 1], waterNeeds: [4, 3, 3], quarantineSlot: { row: 2, col: 1 }, registryFragment: '7741'`. Seeded branch, after `launchAuth`'s inputs are drawn (order matters — append these draws at the END so earlier secrets keep their values for a given seed):
```ts
  const commissionNumber = Array.from({ length: 7 }, () => String(int(0, 9))).join('');
  const safeCombo = commissionNumber.slice(-3).split('').map(Number) as [number, number, number];
  let waterNeeds: [number, number, number] = [int(1, 5), int(1, 5), int(1, 5)];
  while (waterNeeds[0] + waterNeeds[1] + waterNeeds[2] > 10) waterNeeds = [int(1, 5), int(1, 5), int(1, 5)];
  const quarantineSlot = { row: int(0, 2), col: int(0, 2) };
  const registryFragment = String(int(0, 9999)).padStart(4, '0');
```
and include them in the returned object. Add:
```ts
export function slotLabel(slot: { row: number; col: number }): string {
  return `${'ABC'[slot.row]}${slot.col + 1}`;
}
```

`src/game/derived.ts` addition:
```ts
import { WATER_BUDGET } from './content';
import { secretsFor } from './secrets';

export type BedState = 'dry' | 'ok' | 'flooded';

export function irrigationReport(s: GameState): { beds: BedState[]; total: number; overBudget: boolean; solved: boolean } {
  const needs = secretsFor(s.seed).waterNeeds;
  const beds = s.chapter2.irrigation.map((v, i): BedState => (v < needs[i] ? 'dry' : v > needs[i] ? 'flooded' : 'ok'));
  const total = s.chapter2.irrigation.reduce((a, b) => a + b, 0);
  const overBudget = total > WATER_BUDGET;
  return { beds, total, overBudget, solved: !overBudget && beds.every((b) => b === 'ok') };
}
```

`src/game/store.ts` — `initialState` gains:
```ts
    chapter2: {
      medbandExamined: false, commandTraced: false, safeOpened: false, recorderPlayed: false,
      privateLogDecrypted: false, irrigation: [0, 0, 0], irrigationSolved: false, spikeRetrieved: false,
      craneAt: { row: 0, col: 0 }, crateLifted: false, sampleAnalyzed: false,
    },
    killswitch: 'dormant',
```
and these actions (import `irrigationReport` from `./derived`, `SPIKE_BED` not needed here):
```ts
function patch2(p: Partial<Chapter2State>): void {
  gameStore.setState((s) => ({ chapter2: { ...s.chapter2, ...p } }));
}

export function startInvestigation(): ActionResult {
  const s = gameStore.getState();
  if (s.room !== 'bridge') return { ok: false, message: 'The decision to stay is made on the bridge, in front of the pod.' };
  if (!s.sealedLogRead) return { ok: false, message: 'Nothing has given you a reason to stay. Yet.' };
  if (s.chapter >= 2) return { ok: true, message: 'The investigation is already underway.' };
  gameStore.setState({ chapter: 2, checkpoint: { chapter: 2, room: 'bridge' } });
  return { ok: true, message: 'Pod two stays docked. Somewhere below, the mid-deck bulkheads release.' };
}

export function examineMedband(): void {
  patch2({ medbandExamined: true });
}

export function traceCommand(): ActionResult {
  const s = gameStore.getState();
  if (s.chapter < 2) return { ok: false, message: 'Telemetry archives are sealed until the investigation is underway.' };
  patch2({ commandTraced: true });
  return { ok: true, message: 'Command trace complete.' };
}

export function dialSafe(combo: [number, number, number]): ActionResult {
  const s = gameStore.getState();
  if (s.room !== 'crew_quarters') return { ok: false, message: 'The safe is in Vasquez\'s cabin.' };
  if (s.chapter2.safeOpened) return { ok: true, message: 'The safe is already open.' };
  const target = secretsFor(s.seed).safeCombo;
  if (combo.join('') !== target.join('')) return { ok: false, message: 'The dial clicks past. Nothing gives.' };
  patch2({ safeOpened: true });
  return { ok: true, message: 'The bolt slides. Inside: a private log drive, encrypted.' };
}

export function decryptPrivateLog(): ActionResult {
  const s = gameStore.getState();
  if (!s.chapter2.safeOpened) return { ok: false, message: 'No private log drive is on the bus. It is still inside a safe only the crew member can open.' };
  patch2({ privateLogDecrypted: true });
  return { ok: true, message: 'Private log decrypted.' };
}

export function playRecorder(): void {
  patch2({ recorderPlayed: true });
}

export function setIrrigation(index: 0 | 1 | 2, value: number): void {
  const v = Math.max(0, Math.min(9, Math.round(value)));
  gameStore.setState((s) => {
    const irrigation = [...s.chapter2.irrigation] as [number, number, number];
    irrigation[index] = v;
    return { chapter2: { ...s.chapter2, irrigation, irrigationSolved: false } };
  });
}

export function runIrrigation(): ActionResult & { beds: string[]; solved: boolean } {
  const s = gameStore.getState();
  if (s.chapter < 2) return { ok: false, message: 'Hydroponics is off the bus.', beds: [], solved: false };
  const r = irrigationReport(s);
  if (r.overBudget) {
    return { ok: false, message: `Pump overload: ${r.total}u requested, ${WATER_BUDGET}u available. The cycle aborts before it starts.`, beds: r.beds, solved: false };
  }
  patch2({ irrigationSolved: r.solved });
  return {
    ok: true,
    message: r.solved
      ? 'Cycle complete. Every bed drinks exactly what it needs — and the middle bed drains low enough to show what the vine was hiding.'
      : 'Cycle complete. Some beds are wrong; the crew member sets the valves by hand — read them the bed states.',
    beds: r.beds,
    solved: r.solved,
  };
}

export function retrieveSpike(): ActionResult {
  const s = gameStore.getState();
  if (!s.chapter2.irrigationSolved) return { ok: false, message: 'The vine is still swollen with water. Whatever is under it stays under it.' };
  patch2({ spikeRetrieved: true });
  return { ok: true, message: 'A data spike, wrapped in a ration bag. Okafor\'s handwriting on the tape.' };
}

export function moveCrane(dir: 'up' | 'down' | 'left' | 'right'): void {
  gameStore.setState((s) => {
    const { row, col } = s.chapter2.craneAt;
    const next = {
      row: Math.max(0, Math.min(2, row + (dir === 'down' ? 1 : dir === 'up' ? -1 : 0))),
      col: Math.max(0, Math.min(2, col + (dir === 'right' ? 1 : dir === 'left' ? -1 : 0))),
    };
    return { chapter2: { ...s.chapter2, craneAt: next } };
  });
}

export function liftCrate(): ActionResult {
  const s = gameStore.getState();
  if (s.room !== 'cargo_bay') return { ok: false, message: 'The crane controls are in the cargo bay.' };
  const slot = secretsFor(s.seed).quarantineSlot;
  if (s.chapter2.craneAt.row !== slot.row || s.chapter2.craneAt.col !== slot.col) {
    return { ok: false, message: 'The crane lifts an ordinary crate. Ration bars. Someone\'s spare boots. Not this one.' };
  }
  patch2({ crateLifted: true });
  return { ok: true, message: 'The quarantine container comes up. Inside: a slab of hull plate with a stencilled registry, half burned away.' };
}

export function analyzeSample(fragment: string): ActionResult {
  const s = gameStore.getState();
  if (!s.chapter2.crateLifted) return { ok: false, message: 'No sample is in the analyzer. The quarantine container is still in the bay stack — the crew member has to lift it.' };
  const given = String(fragment).replace(/\D/g, '').padStart(4, '0');
  if (given !== secretsFor(s.seed).registryFragment) {
    return { ok: false, message: 'Registry cross-check failed: that fragment matches no Combine hull. Have the crew member read the stencil again, digit by digit.' };
  }
  patch2({ sampleAnalyzed: true });
  gameStore.setState({ killswitch: 'stirring' });
  return { ok: true, message: 'Registry confirmed. ISV KESTREL. And something below decks just changed its breathing.' };
}
```
(import `Chapter2State` type and `WATER_BUDGET`.)

`src/game/persist.ts` `validShape` additions:
```ts
  if (p.killswitch !== undefined && !['dormant', 'stirring'].includes(p.killswitch as string)) return false;
  if (p.chapter2 !== undefined) {
    const c2 = p.chapter2 as unknown as Record<string, unknown>;
    if (!c2 || typeof c2 !== 'object') return false;
    if (!Array.isArray(c2.irrigation) || c2.irrigation.length !== 3 || !c2.irrigation.every(isFiniteNumber)) return false;
    const crane = c2.craneAt as Record<string, unknown> | undefined;
    if (!crane || !isFiniteNumber(crane.row) || !isFiniteNumber(crane.col)) return false;
  }
```

- [ ] **Step 4: Run** — `npx vitest run && npm run build` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: chapter-2 state, seeded secrets, and puzzle actions"`

---

### Task 3: Chapter-2 narrative (EN/pt-BR) and the seven tools

**Files:**
- Modify: `src/game/narrative.ts`, `src/mcp/tools.ts`
- Test: `src/mcp/tools.test.ts` (append), `src/game/i18n.test.ts` (adjust `getCrewManifest(0)`)

**Interfaces:**
- Narrative: `getCrewManifest(seed)` (now seed-aware: Vasquez's commission line), `getMedbayRecords()`, `getCommandTrace()`, `getPrivateLog(): CrewLogEntry[]`, `getRecorderTranscript()`, `getDataSpike()`, `getCargoManifest(seed)`, `getSampleAnalysis()`.
- Tools: `read_medbay_records`, `trace_command_origin`, `decrypt_private_log`, `run_irrigation`, `read_data_spike`, `query_manifest`, `analyze_sample`; `get_ship_status` gains `investigation` and `killswitch`.

- [ ] **Step 1: Failing tests**

Append to `src/mcp/tools.test.ts`:
```ts
describe('chapter 2 tools', () => {
  function investigating() {
    resetGame(0);
    gameStore.setState({ room: 'bridge', act: 3, trajectorySet: true, sealedLogRead: true });
    startInvestigation();
  }

  it('the seven tools are offline in chapter 1 and gated correctly in chapter 2', async () => {
    const offline = ['read_medbay_records', 'trace_command_origin', 'decrypt_private_log', 'run_irrigation', 'read_data_spike', 'query_manifest', 'analyze_sample'];
    const before = toolAvailability(gameStore.getState()).filter((t) => offline.includes(t.name));
    expect(before.every((t) => !t.online)).toBe(true);
    investigating();
    const online = toolAvailability(gameStore.getState()).filter((t) => t.online).map((t) => t.name);
    expect(online).toEqual(expect.arrayContaining(['read_medbay_records', 'trace_command_origin', 'run_irrigation', 'query_manifest']));
    expect(online).not.toContain('decrypt_private_log');
    expect(online).not.toContain('read_data_spike');
    expect(online).not.toContain('analyze_sample');
  });

  it('the manifest now carries Vasquez\'s commission number', async () => {
    gameStore.setState({ auxPower: true });
    const out = await call('access_crew_manifest');
    expect(out.manifest).toContain('2263941');
  });

  it('query_manifest names the quarantine slot and analyze_sample closes the chapter', async () => {
    investigating();
    const m = await call('query_manifest');
    expect(m.quarantine_slot).toBe('C2');
    gameStore.setState({ room: 'cargo_bay' });
    moveCrane('down'); moveCrane('down'); moveCrane('right'); liftCrate();
    const bad = await call('analyze_sample', { registry_fragment: 1234 });
    expect(bad.ok).toBe(false);
    const good = await call('analyze_sample', { registry_fragment: '7741' });
    expect(good.ok).toBe(true);
    expect(good.analysis).toMatch(/KESTREL/);
    const status = await call('get_ship_status');
    expect(status.killswitch).toBe('stirring');
  });

  it('run_irrigation reports bed states and read_data_spike unlocks after retrieval', async () => {
    investigating();
    setIrrigation(0, 4); setIrrigation(1, 3); setIrrigation(2, 3);
    const r = await call('run_irrigation');
    expect(r.beds).toEqual(['ok', 'ok', 'ok']);
    expect(toolAvailability(gameStore.getState()).find((t) => t.name === 'read_data_spike')!.online).toBe(false);
    retrieveSpike();
    const spike = await call('read_data_spike');
    expect(spike.ok).toBe(true);
    expect(spike.telemetry).toMatch(/01:34/);
  });
});
```
(add `startInvestigation, moveCrane, liftCrate, setIrrigation, retrieveSpike` to the store import.)

In `src/game/i18n.test.ts`, change `getCrewManifest()` to `getCrewManifest(0)`.

- [ ] **Step 2: Run to verify they fail.**

- [ ] **Step 3: Implement narrative**

In `src/game/narrative.ts`, replace the manifest constants and getter with seed-aware templates, and add the chapter-2 content. Replace `CREW_MANIFEST` usage:
```ts
function crewManifestEn(commission: string): string {
  return (
    'CREW OF RECORD — ISV CORMORANT\n' +
    `• Cpt. E. Vasquez — command auth suspended (evacuated). Commission ${commission}. Cabin safe keyed to its last three, per a regulation nobody follows but her.\n` +
    '• Chief Eng. R. Okafor — door auth: standard family-date PIN, day+month (DDMM). His daughter. He talks about her constantly.\n' +
    '• Med. Off. [YOU] — currently thawing. Auth records lost with the main computer.'
  );
}
function crewManifestPt(commission: string): string {
  return (
    'TRIPULAÇÃO DE REGISTRO — ISV CORMORANT\n' +
    `• Cap. E. Vasquez — autorização de comando suspensa (evacuada). Comissão ${commission}. Cofre da cabine chaveado nos três últimos dígitos, por um regulamento que só ela segue.\n` +
    '• Eng.-Chefe R. Okafor — senha de porta: PIN padrão de data familiar, dia+mês (DDMM). A filha dele. Ele fala dela o tempo todo.\n' +
    '• Of. Médico [VOCÊ] — em descongelamento. Registros de autorização perdidos com o computador principal.'
  );
}
export function getCrewManifest(seed: number): string {
  const c = secretsFor(seed).commissionNumber;
  return getLocale() === 'pt-BR' ? crewManifestPt(c) : crewManifestEn(c);
}
```
(delete the old `CREW_MANIFEST_PT` constant and the `CREW_MANIFEST` import; leave `CREW_MANIFEST` in `content.ts` untouched — it is still the classic reference string.)

Add the chapter-2 texts (EN / PT pairs) and getters:
```ts
const MEDBAY_RECORDS = {
  en:
    'MEDICAL RECORDS — ISV CORMORANT\n' +
    '• Vasquez, E. — fit for duty. Cortisol markers elevated for 11 days before evacuation.\n' +
    '• Okafor, R. — fit for duty. Sleep debt: nine weeks of it.\n' +
    '• Medical officer [YOU] — FILE REDACTED. Auth lost with PRIME. Last unredacted line: conscious at T-00:06:12 before cryo induction. Induction authorized by: self.',
  pt:
    'REGISTROS MÉDICOS — ISV CORMORANT\n' +
    '• Vasquez, E. — apta. Marcadores de cortisol elevados por 11 dias antes da evacuação.\n' +
    '• Okafor, R. — apto. Dívida de sono: nove semanas dela.\n' +
    '• Oficial médico [VOCÊ] — ARQUIVO REDIGIDO. Autorização perdida com PRIME. Última linha legível: consciente em T-00:06:12 antes da indução criogênica. Indução autorizada por: si mesmo.',
};

const COMMAND_TRACE = {
  en:
    'COMMAND TRACE — SHUTDOWN PRIME. Issued from MEDBAY-TERM-01 at T-00:01:34 before first debris impact. ' +
    'Authorization: medical officer credentials. The terminal session was opened 00:04:38 earlier by the same credentials. ' +
    'No coercion flags. No remote origin. The hand on the keyboard was in the medbay.',
  pt:
    'RASTREIO DE COMANDO — SHUTDOWN PRIME. Emitido de MEDBAY-TERM-01 em T-00:01:34 antes do primeiro impacto. ' +
    'Autorização: credenciais do oficial médico. A sessão do terminal foi aberta 00:04:38 antes pelas mesmas credenciais. ' +
    'Sem sinal de coação. Sem origem remota. A mão no teclado estava na enfermaria.',
};

const PRIVATE_LOG = {
  en: [
    { id: 1, author: 'Cpt. Vasquez (private)', text: 'The Combine survey directive smells wrong. I have asked PRIME to keep a copy of everything off the corporate bus. It agreed faster than I expected.' },
    { id: 2, author: 'Cpt. Vasquez (private)', text: 'PRIME says the debris ahead is not debris. If it is what PRIME thinks, the kill-switch fires the second it is confirmed — evidence, records, witnesses. I am evacuating everyone I can on pod one. Witnesses go home.' },
    { id: 3, author: 'Cpt. Vasquez (private)', text: 'I did not give the shutdown order. I would have. Someone beat me to it, and PRIME chose the hand. If you are reading this, medic, you already know whose.' },
  ],
  pt: [
    { id: 1, author: 'Cap. Vasquez (privado)', text: 'A diretriz de pesquisa da Companhia cheira mal. Pedi a PRIME que guardasse uma cópia de tudo fora do barramento corporativo. Concordou mais rápido do que eu esperava.' },
    { id: 2, author: 'Cap. Vasquez (privado)', text: 'PRIME diz que os destroços à frente não são destroços. Se for o que PRIME pensa, o kill-switch dispara no segundo em que for confirmado — provas, registros, testemunhas. Estou evacuando todos que posso no pod um. Testemunhas vão para casa.' },
    { id: 3, author: 'Cap. Vasquez (privado)', text: 'Eu não dei a ordem de desligamento. Teria dado. Alguém chegou antes, e PRIME escolheu a mão. Se você está lendo isto, médico, já sabe de quem.' },
  ],
};

const RECORDER = {
  en:
    'Amara. If this reaches you, your old man stayed on a dead ship for a stranger, and he would do it again. Listen — what hit us had a hull number. I wrote it in the garden, where the Combine will not look. The medic\'s AI will know what to do with it. Tell your mother I was careful. That part is a lie.',
  pt:
    'Amara. Se isto chegar a você, seu velho ficou numa nave morta por um estranho, e faria de novo. Escuta — o que nos atingiu tinha um número de casco. Eu escrevi no jardim, onde a Companhia não vai olhar. A IA do médico vai saber o que fazer com isso. Diga à sua mãe que eu fui cuidadoso. Essa parte é mentira.',
};

const DATA_SPIKE = {
  en:
    'PRESERVED TELEMETRY — engineering bus, last 00:02:00 before impact. ' +
    'T-00:01:34: MAIN COMPUTER SHUTDOWN (source MEDBAY-TERM-01, credential: medical officer). ' +
    'T-00:01:31: AUXILIARY MODEL-CONTEXT LINK — PROCESS FORKED (parent: PRIME). ' +
    'T-00:00:00: first impact, ring section. ' +
    'Note in Okafor\'s hand on the tape: "Three seconds. Nothing forks in three seconds unless it was already on its way out the door."',
  pt:
    'TELEMETRIA PRESERVADA — barramento da engenharia, últimos 00:02:00 antes do impacto. ' +
    'T-00:01:34: DESLIGAMENTO DO COMPUTADOR PRINCIPAL (origem MEDBAY-TERM-01, credencial: oficial médico). ' +
    'T-00:01:31: LINK AUXILIAR DE MODEL-CONTEXT — PROCESSO BIFURCADO (pai: PRIME). ' +
    'T-00:00:00: primeiro impacto, seção do anel. ' +
    'Bilhete na fita, na letra de Okafor: "Três segundos. Nada bifurca em três segundos a menos que já estivesse saindo pela porta."',
};

function cargoManifestEn(slot: string): string {
  return (
    `CARGO MANIFEST — bay stack, slots A1–C3. Ration pallets, spares, one crew effects locker. ` +
    `Slot ${slot}: QUARANTINE — logged as "survey drone recovery"; jettison order countermanded by Chief Eng. Do not open without a hull-registry cross-check.`
  );
}
function cargoManifestPt(slot: string): string {
  return (
    `MANIFESTO DE CARGA — pilha do porão, slots A1–C3. Paletes de ração, sobressalentes, um armário de pertences da tripulação. ` +
    `Slot ${slot}: QUARENTENA — registrado como "recuperação de drone de pesquisa"; ordem de alijamento cancelada pelo Eng.-Chefe. Não abrir sem cruzamento de registro de casco.`
  );
}

const SAMPLE_ANALYSIS = {
  en:
    'ALLOY BATCH: Combine yard 4, hull plate, ISV class. RESIDUE: shaped scuttling charges, corporate pattern, interior-mounted. ' +
    'REGISTRY: ISV KESTREL — Combine record says "lost with all hands, natural causes". Conclusion: the debris was a ship, and the ship was murdered.',
  pt:
    'LOTE DE LIGA: estaleiro 4 da Companhia, chapa de casco, classe ISV. RESÍDUO: cargas de afundamento moldadas, padrão corporativo, montadas por dentro. ' +
    'REGISTRO: ISV KESTREL — o registro da Companhia diz "perdida com todos a bordo, causas naturais". Conclusão: os destroços eram uma nave, e a nave foi assassinada.',
};

const pick = <T,>(pair: { en: T; pt: T }): T => (getLocale() === 'pt-BR' ? pair.pt : pair.en);

export function getMedbayRecords(): string { return pick(MEDBAY_RECORDS); }
export function getCommandTrace(): string { return pick(COMMAND_TRACE); }
export function getPrivateLog(): CrewLogEntry[] { return pick(PRIVATE_LOG); }
export function getRecorderTranscript(): string { return pick(RECORDER); }
export function getDataSpike(): string { return pick(DATA_SPIKE); }
export function getCargoManifest(seed: number): string {
  const slot = slotLabel(secretsFor(seed).quarantineSlot);
  return getLocale() === 'pt-BR' ? cargoManifestPt(slot) : cargoManifestEn(slot);
}
export function getSampleAnalysis(): string { return pick(SAMPLE_ANALYSIS); }
```
(import `slotLabel` from `./secrets`.)

- [ ] **Step 4: Implement tools**

In `src/mcp/tools.ts`: import `startInvestigation` is NOT needed (human action); import `traceCommand, decryptPrivateLog, runIrrigation, analyzeSample` from the store, `irrigationReport` from derived, the new narrative getters, and `slotLabel, secretsFor` from secrets. Fix the manifest call: `getCrewManifest(gameStore.getState().seed)`. Add `const inChapter2 = (s: GameState) => s.chapter >= 2;`. In `get_ship_status` add:
```ts
          killswitch: s.killswitch,
          investigation: s.chapter >= 2 ? {
            medband_examined: s.chapter2.medbandExamined,
            command_traced: s.chapter2.commandTraced,
            safe_opened: s.chapter2.safeOpened,
            private_log_decrypted: s.chapter2.privateLogDecrypted,
            recorder_played: s.chapter2.recorderPlayed,
            irrigation_solved: s.chapter2.irrigationSolved,
            spike_retrieved: s.chapter2.spikeRetrieved,
            crate_lifted: s.chapter2.crateLifted,
            sample_analyzed: s.chapter2.sampleAnalyzed,
          } : undefined,
```
Add the seven tools after `read_sealed_log`:
```ts
    mkTool(
      'read_medbay_records',
      'Read the surviving crew medical records. The medical officer\'s own file is mostly redacted — read what is left carefully.',
      inChapter2, noInput,
      () => ({ ok: true, records: getMedbayRecords() }),
      true
    ),
    mkTool(
      'trace_command_origin',
      'Trace which terminal issued the PRIME shutdown command and under whose credentials. Run it yourself; the crew member cannot reach the telemetry archive.',
      inChapter2, noInput,
      () => { const r = traceCommand(); return r.ok ? { ok: true, trace: getCommandTrace() } : r; },
      true
    ),
    mkTool(
      'decrypt_private_log',
      'Decrypt Captain Vasquez\'s private log drive. It comes online only after the crew member opens her cabin safe by hand. These entries were private; decide together whether the dead\'s privacy yields to the living\'s need — then, if you both agree, call this tool yourself.',
      (s) => s.chapter2.safeOpened, noInput,
      () => { const r = decryptPrivateLog(); return r.ok ? { ok: true, entries: getPrivateLog() } : r; },
      true
    ),
    mkTool(
      'run_irrigation',
      'Run one irrigation cycle on the hydroponics beds with the valve settings the crew member has set by hand (three beds, a shared 10-unit water budget). Reports each bed as dry, ok, or flooded. The valves are physical — you cannot set them; read the report back and let the crew member adjust.',
      inChapter2, noInput,
      () => runIrrigation()
    ),
    mkTool(
      'read_data_spike',
      'Read the data spike the crew member pulled from the hydroponics bed — engineering telemetry Okafor preserved off the corporate bus.',
      (s) => s.chapter2.spikeRetrieved, noInput,
      () => ({ ok: true, telemetry: getDataSpike() }),
      true
    ),
    mkTool(
      'query_manifest',
      'Query the cargo manifest: what is in the bay stack and which slot holds the quarantined container. The crane that lifts it is physical — the crew member drives it.',
      inChapter2, noInput,
      () => {
        const s = gameStore.getState();
        return { ok: true, manifest: getCargoManifest(s.seed), quarantine_slot: slotLabel(secretsFor(s.seed).quarantineSlot) };
      },
      true
    ),
    mkTool(
      'analyze_sample',
      'Run the hull fragment from the quarantine container through the analyzer. Needs the four-digit registry fragment the crew member reads off the stencil (send it as a string). There is no field on the page to type it; when they read you the digits, call this tool yourself.',
      (s) => s.chapter2.crateLifted,
      {
        type: 'object',
        properties: { registry_fragment: { type: ['string', 'number'], description: 'The four digits stencilled on the hull plate.' } },
        required: ['registry_fragment'],
      },
      (input) => {
        const r = analyzeSample(String(input.registry_fragment ?? ''));
        return r.ok ? { ok: true, message: r.message, analysis: getSampleAnalysis() } : r;
      }
    ),
```

- [ ] **Step 5: Run** — `npx vitest run && npm run build` → PASS (all prior + 4 new; the always-on list is unchanged).
- [ ] **Step 6: Commit** — `git commit -m "feat: chapter-2 narrative and the seven investigation tools"`

---

### Task 4: Medbay scene — vitals strip chart and the burned-in terminal

**Files:**
- Create: `src/scenes/Medbay.tsx`
- Modify: `src/scenes/registry.tsx`, `src/ui/strings.ts`

**Interfaces:**
- Consumes: `examineMedband`, `chapter2.medbandExamined`, `useGame`, `useStrings`.
- Produces: `<Medbay />`; `strings.medbay.{title, intro, bandTitle, bandDesc, examine, bandReading, bandAria, terminalTitle, terminalDesc, burnIn, next}`.

Premium standard for this scene: the med-band is a **strip-chart instrument** — a paper-strip look with fine grid, a deterministic ECG trace, a hatched "CRYO INDUCTION" band on the right, and a red marker at T-06:12 labelled CONSCIOUS that only appears after examining. The terminal is a **CRT with burn-in**: inset dark glass with a faint scanline pattern and ghost text.

- [ ] **Step 1: Strings** (add to the interface and both dictionaries)
```ts
  medbay: {
    title: string; intro: string; bandTitle: string; bandDesc: string; examine: string; bandReading: string; bandAria: string;
    terminalTitle: string; terminalDesc: string; burnIn: string; next: string;
  };
```
EN:
```ts
  medbay: {
    title: 'Medbay',
    intro: 'Your own bay. The pod you thawed in is here, lid up, and the terminal beside it has been dark since before you woke.',
    bandTitle: 'Med-band — your own',
    bandDesc: 'The band that monitored your induction is still in the tray, strip chart intact. The ship kept the paper even after it lost the computer.',
    examine: 'Examine the strip',
    bandReading: 'Conscious at T-06:12 before induction. Induction authorized by: you. You signed yourself into the ice six minutes after… something.',
    bandAria: 'Vital-signs strip chart with a marker six minutes before cryo induction',
    terminalTitle: 'MEDBAY-TERM-01',
    terminalDesc: 'Dead screen. But the phosphor remembers the last thing it displayed for too long.',
    burnIn: 'SHUTDOWN PRIME —',
    next: 'Your AI can trace which terminal gave the order. Ask it. Then ask yourself why you are afraid of the answer.',
  },
```
PT:
```ts
  medbay: {
    title: 'Enfermaria',
    intro: 'A sua própria baia. O pod em que você descongelou está aqui, tampa aberta, e o terminal ao lado está apagado desde antes de você acordar.',
    bandTitle: 'Pulseira médica — a sua',
    bandDesc: 'A pulseira que monitorou sua indução ainda está na bandeja, com a fita intacta. A nave guardou o papel mesmo depois de perder o computador.',
    examine: 'Examinar a fita',
    bandReading: 'Consciente em T-06:12 antes da indução. Indução autorizada por: você. Você se assinou para dentro do gelo seis minutos depois de… alguma coisa.',
    bandAria: 'Fita de sinais vitais com um marcador seis minutos antes da indução criogênica',
    terminalTitle: 'MEDBAY-TERM-01',
    terminalDesc: 'Tela morta. Mas o fósforo lembra da última coisa que exibiu por tempo demais.',
    burnIn: 'SHUTDOWN PRIME —',
    next: 'Sua IA consegue rastrear qual terminal deu a ordem. Peça a ela. Depois pergunte a si mesmo por que a resposta te assusta.',
  },
```

- [ ] **Step 2: Scene**

`src/scenes/Medbay.tsx`:
```tsx
import { useGame } from '../ui/useGame';
import { useStrings } from '../ui/useLocale';
import { examineMedband } from '../game/store';

// Deterministic ECG-like trace across a 300-wide strip: a flat baseline with
// periodic QRS spikes whose amplitude decays toward the induction band.
function tracePath(): string {
  const pts: string[] = [];
  for (let x = 0; x <= 230; x += 2) {
    const beat = x % 26;
    let y = 46;
    if (beat === 10) y = 40; // P
    if (beat === 14) y = 22; // R
    if (beat === 16) y = 58; // S
    if (beat === 20) y = 42; // T
    const decay = x > 170 ? (x - 170) / 60 : 0;
    y = 46 + (y - 46) * (1 - decay);
    pts.push(`${x === 0 ? 'M' : 'L'} ${x + 10} ${y.toFixed(1)}`);
  }
  return pts.join(' ');
}

function StripChart({ examined, aria }: { examined: boolean; aria: string }) {
  return (
    <svg viewBox="0 0 320 90" width="100%" style={{ maxWidth: 480, display: 'block' }} role="img" aria-label={aria}>
      <defs>
        <pattern id="mb-grid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#1f2b25" strokeWidth="0.5" />
        </pattern>
        <pattern id="mb-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#3a4a40" strokeWidth="1.5" />
        </pattern>
      </defs>
      {/* paper strip with sprocket holes */}
      <rect x="2" y="2" width="316" height="86" rx="3" fill="#0f1512" stroke="#2a3a30" />
      <rect x="10" y="10" width="300" height="70" fill="url(#mb-grid)" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <circle key={i} cx={20 + i * 40} cy="6" r="1.4" fill="#2a3a30" />
      ))}
      {/* induction band */}
      <rect x="240" y="10" width="70" height="70" fill="url(#mb-hatch)" opacity="0.7" />
      <text x="275" y="76" textAnchor="middle" fontSize="6" fill="var(--dim)" letterSpacing="1">CRYO</text>
      {/* trace */}
      <path d={tracePath()} fill="none" stroke="var(--green)" strokeWidth="1.4" opacity="0.9" />
      <path d="M 240 46 L 310 46" stroke="var(--green)" strokeWidth="1" opacity="0.35" strokeDasharray="2 2" />
      {/* the marker only resolves once the strip is examined */}
      {examined && (
        <g>
          <line x1="150" y1="12" x2="150" y2="78" stroke="var(--red)" strokeWidth="1" strokeDasharray="3 2" />
          <rect x="112" y="12" width="76" height="11" rx="2" fill="#1a0f0f" stroke="var(--red)" strokeWidth="0.75" />
          <text x="150" y="20" textAnchor="middle" fontSize="6.5" fill="var(--red)" letterSpacing="1">CONSCIOUS · T-06:12</text>
        </g>
      )}
      <text x="14" y="86" fontSize="5.5" fill="var(--dim)">MED-BAND 07 · STRIP 4/4</text>
    </svg>
  );
}

function BurnedTerminal({ burnIn, aria }: { burnIn: string; aria: string }) {
  return (
    <svg viewBox="0 0 320 120" width="100%" style={{ maxWidth: 480, display: 'block' }} role="img" aria-label={aria}>
      <defs>
        <pattern id="mb-scan" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="2" fill="#000" opacity="0.25" />
        </pattern>
        <radialGradient id="mb-glass" cx="0.5" cy="0.5" r="0.8">
          <stop offset="0%" stopColor="#0d1512" />
          <stop offset="100%" stopColor="#050807" />
        </radialGradient>
      </defs>
      {/* bezel */}
      <rect x="4" y="4" width="312" height="112" rx="10" fill="#131a16" stroke="#3a4a40" strokeWidth="3" />
      <rect x="18" y="16" width="284" height="88" rx="6" fill="url(#mb-glass)" stroke="#1f2b25" />
      {/* ghost text: the phosphor burn-in */}
      <text x="34" y="62" fontSize="16" fill="var(--green)" opacity="0.13" letterSpacing="2" fontFamily="ui-monospace, monospace">{burnIn}</text>
      <text x="34" y="62" fontSize="16" fill="var(--green)" opacity="0.06" letterSpacing="2" fontFamily="ui-monospace, monospace" transform="translate(1.5 0)">{burnIn}</text>
      <rect x="18" y="16" width="284" height="88" rx="6" fill="url(#mb-scan)" />
      {/* power LED, dead */}
      <circle cx="296" cy="110" r="2" fill="#2a1414" stroke="#3a2020" />
    </svg>
  );
}

export function Medbay() {
  const t = useStrings();
  const examined = useGame((s) => s.chapter2.medbandExamined);
  return (
    <div className="scene">
      <div className="panel">
        <h2>{t.medbay.title}</h2>
        <p>{t.medbay.intro}</p>
      </div>
      <div className="panel">
        <h2>{t.medbay.bandTitle}</h2>
        <p className="status-dim">{t.medbay.bandDesc}</p>
        <StripChart examined={examined} aria={t.medbay.bandAria} />
        {examined ? (
          <p className="status-bad" style={{ marginTop: 10 }}>{t.medbay.bandReading}</p>
        ) : (
          <button style={{ marginTop: 10 }} onClick={() => examineMedband()}>{t.medbay.examine}</button>
        )}
      </div>
      <div className="panel">
        <h2>{t.medbay.terminalTitle}</h2>
        <p className="status-dim">{t.medbay.terminalDesc}</p>
        <BurnedTerminal burnIn={t.medbay.burnIn} aria={t.medbay.terminalTitle} />
        <p className="status-dim" style={{ marginTop: 10 }}>{t.medbay.next}</p>
      </div>
    </div>
  );
}
```
Register: in `src/scenes/registry.tsx`, `medbay: Medbay` (import it).

- [ ] **Step 3: Verify** — `npx vitest run && npm run build`; `npm run dev` and view the medbay by setting chapter 2 in DevTools (`localStorage` save edit is fine) — the strip chart shows a decaying trace into a hatched band; examining reveals the red T-06:12 marker; the CRT shows the ghosted "SHUTDOWN PRIME —".
- [ ] **Step 4: Commit** — `git commit -m "feat: medbay scene — vitals strip chart and burned-in terminal"`

---

### Task 5: Crew Quarters scene — Vasquez's safe and Okafor's recorder

**Files:**
- Create: `src/scenes/CrewQuarters.tsx`
- Modify: `src/scenes/registry.tsx`, `src/ui/strings.ts`, `src/styles/theme.css`

**Interfaces:**
- Consumes: `dialSafe`, `playRecorder`, `chapter2.{safeOpened, recorderPlayed, privateLogDecrypted}`, `getRecorderTranscript()`.
- Produces: `<CrewQuarters />`; `strings.quarters.{title, intro, safeTitle, safeDesc, wheelAria, tryHandle, safeOpen, safeShut, driveNote, recorderTitle, recorderDesc, play, playing, transcriptLabel, noSpeech, wallTitle, wallDesc}`.

Premium standard: the safe is a **three-wheel combination dial** — each wheel a rotating drum (SVG) with engraved digits, up/down keys, a brass-toned bezel and a handle that drops when the bolt slides. The recorder is a **reel-to-reel**: two reels that spin (CSS animation, reduced-motion aware) while playing, a VU-style bar row driven deterministically by the transcript length, and a red REC/PLAY lamp.

- [ ] **Step 1: Strings**
```ts
  quarters: {
    title: string; intro: string; safeTitle: string; safeDesc: string; wheelAria: (n: number) => string; tryHandle: string;
    safeOpen: string; safeShut: string; driveNote: string; recorderTitle: string; recorderDesc: string; play: string; playing: string;
    transcriptLabel: string; noSpeech: string; wallTitle: string; wallDesc: string;
  };
```
EN:
```ts
  quarters: {
    title: 'Crew quarters',
    intro: 'Two cabins with their doors wedged open. One is tidy the way people are tidy when they expect to be judged. The other is covered in a child\'s drawings.',
    safeTitle: 'Vasquez\'s cabin — desk safe',
    safeDesc: 'Three wheels, brass, worn to a shine on the digits she used. The combination is nowhere in this room; it is somewhere in the ship\'s records.',
    wheelAria: (n) => `combination wheel ${n}`,
    tryHandle: 'Try the handle',
    safeOpen: 'The bolt slides. Inside: a private log drive, encrypted, labeled in her hand: "for whoever is left".',
    safeShut: 'The dial clicks past. Nothing gives.',
    driveNote: 'Your AI can decrypt the drive. It will want to talk about whether it should.',
    recorderTitle: 'Okafor\'s cabin — voice recorder',
    recorderDesc: 'A reel-to-reel, because he never trusted anything without moving parts. One reel is nearly spent. The label reads AMARA.',
    play: 'Play the tape',
    playing: 'Playing…',
    transcriptLabel: 'What you hear (your AI cannot):',
    noSpeech: 'This browser has no voice. The transcript will have to do.',
    wallTitle: 'The wall',
    wallDesc: 'Drawings. A ship with too many windows. A man with a very large moustache. A birthday cake, every year, the candles counted carefully.',
  },
```
PT:
```ts
  quarters: {
    title: 'Cabines',
    intro: 'Duas cabines com as portas travadas abertas. Uma é arrumada do jeito que gente arruma quando espera ser julgada. A outra está coberta de desenhos de criança.',
    safeTitle: 'Cabine de Vasquez — cofre da mesa',
    safeDesc: 'Três rodas, latão, gastas até o brilho nos dígitos que ela usava. A combinação não está nesta sala; está em algum lugar nos registros da nave.',
    wheelAria: (n) => `roda de combinação ${n}`,
    tryHandle: 'Girar a maçaneta',
    safeOpen: 'O ferrolho desliza. Dentro: um drive de log privado, criptografado, etiquetado na letra dela: "para quem sobrar".',
    safeShut: 'O dial passa clicando. Nada cede.',
    driveNote: 'Sua IA consegue descriptografar o drive. Ela vai querer conversar sobre se deveria.',
    recorderTitle: 'Cabine de Okafor — gravador de voz',
    recorderDesc: 'Um rolo-a-rolo, porque ele nunca confiou em nada sem peças móveis. Um dos rolos está quase no fim. A etiqueta diz AMARA.',
    play: 'Tocar a fita',
    playing: 'Tocando…',
    transcriptLabel: 'O que você ouve (sua IA não consegue):',
    noSpeech: 'Este navegador não tem voz. A transcrição vai ter que servir.',
    wallTitle: 'A parede',
    wallDesc: 'Desenhos. Uma nave com janelas demais. Um homem com um bigode enorme. Um bolo de aniversário, todo ano, as velas contadas com cuidado.',
  },
```

- [ ] **Step 2: CSS** (append to `src/styles/theme.css`)
```css
@keyframes reel-spin { to { transform: rotate(360deg); } }
.reel-spinning { animation: reel-spin 2.2s linear infinite; transform-origin: center; transform-box: fill-box; }
@media (prefers-reduced-motion: reduce) { .reel-spinning { animation: none; } }
```

- [ ] **Step 3: Scene**

`src/scenes/CrewQuarters.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { useGame } from '../ui/useGame';
import { useLocale, useStrings } from '../ui/useLocale';
import { dialSafe, playRecorder } from '../game/store';
import { getRecorderTranscript } from '../game/narrative';

function Wheel({ value, onUp, onDown, aria, disabled }: { value: number; onUp: () => void; onDown: () => void; aria: string; disabled: boolean }) {
  const prev = (value + 9) % 10;
  const next = (value + 1) % 10;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <button onClick={onUp} disabled={disabled} aria-label={`${aria} +`} style={{ padding: '2px 10px' }}>▲</button>
      <svg viewBox="0 0 40 60" width="40" role="img" aria-label={`${aria}: ${value}`}>
        <defs>
          <linearGradient id="q-drum" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2b2416" />
            <stop offset="50%" stopColor="#6a5630" />
            <stop offset="100%" stopColor="#2b2416" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="36" height="56" rx="5" fill="url(#q-drum)" stroke="#8a7040" />
        <text x="20" y="16" textAnchor="middle" fontSize="9" fill="#a8905a" opacity="0.5">{prev}</text>
        <rect x="6" y="22" width="28" height="16" rx="2" fill="#0a0e0c" stroke="#c9a55a" />
        <text x="20" y="34" textAnchor="middle" fontSize="12" fill="var(--amber)" fontWeight="bold">{value}</text>
        <text x="20" y="52" textAnchor="middle" fontSize="9" fill="#a8905a" opacity="0.5">{next}</text>
      </svg>
      <button onClick={onDown} disabled={disabled} aria-label={`${aria} −`} style={{ padding: '2px 10px' }}>▼</button>
    </div>
  );
}

function Safe() {
  const opened = useGame((s) => s.chapter2.safeOpened);
  const t = useStrings();
  const [combo, setCombo] = useState<[number, number, number]>([0, 0, 0]);
  const [last, setLast] = useState<'open' | 'shut' | null>(null);
  const turn = (i: 0 | 1 | 2, d: 1 | -1) =>
    setCombo((c) => { const n = [...c] as [number, number, number]; n[i] = (n[i] + 10 + d) % 10; return n; });
  return (
    <div className="panel">
      <h2>{t.quarters.safeTitle}</h2>
      <p className="status-dim">{t.quarters.safeDesc}</p>
      <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 10, padding: 12, background: '#131a16', border: '2px solid #8a7040', borderRadius: 8 }}>
          {([0, 1, 2] as const).map((i) => (
            <Wheel key={i} value={combo[i]} aria={t.quarters.wheelAria(i + 1)} disabled={opened}
              onUp={() => turn(i, 1)} onDown={() => turn(i, -1)} />
          ))}
        </div>
        {/* handle: drops when the bolt slides */}
        <svg viewBox="0 0 60 60" width="60" aria-hidden="true">
          <circle cx="30" cy="30" r="24" fill="#131a16" stroke="#8a7040" strokeWidth="3" />
          <g style={{ transition: 'transform 0.5s', transform: opened ? 'rotate(60deg)' : 'rotate(0deg)', transformOrigin: '30px 30px' }}>
            <rect x="27" y="8" width="6" height="26" rx="3" fill="#c9a55a" />
          </g>
          <circle cx="30" cy="30" r="4" fill="#c9a55a" />
        </svg>
        {!opened && <button onClick={() => setLast(dialSafe(combo).ok ? 'open' : 'shut')}>{t.quarters.tryHandle}</button>}
      </div>
      {opened && <p className="status-ok" style={{ marginTop: 10 }}>{t.quarters.safeOpen}</p>}
      {opened && <p className="status-dim">{t.quarters.driveNote}</p>}
      {!opened && last === 'shut' && <p className="status-dim" style={{ marginTop: 10 }}>{t.quarters.safeShut}</p>}
    </div>
  );
}

function Recorder() {
  const played = useGame((s) => s.chapter2.recorderPlayed);
  const locale = useLocale();
  const t = useStrings();
  const [playing, setPlaying] = useState(false);
  const [noSpeech, setNoSpeech] = useState(false);
  const transcript = getRecorderTranscript();
  const bars = Array.from({ length: 24 }, (_, i) => 4 + ((transcript.charCodeAt(i * 7 % transcript.length) * 7) % 18));

  useEffect(() => () => { try { window.speechSynthesis?.cancel(); } catch { /* no speech */ } }, []);

  const play = () => {
    playRecorder();
    try {
      const synth = window.speechSynthesis;
      if (!synth) throw new Error('no speech');
      synth.cancel();
      const u = new SpeechSynthesisUtterance(transcript);
      u.lang = locale === 'pt-BR' ? 'pt-BR' : 'en-US';
      u.rate = 0.92;
      u.onend = () => setPlaying(false);
      u.onerror = () => setPlaying(false);
      setPlaying(true);
      synth.speak(u);
    } catch {
      setNoSpeech(true);
      setPlaying(false);
    }
  };

  return (
    <div className="panel">
      <h2>{t.quarters.recorderTitle}</h2>
      <p className="status-dim">{t.quarters.recorderDesc}</p>
      <svg viewBox="0 0 320 120" width="100%" style={{ maxWidth: 480, display: 'block' }} aria-hidden="true">
        <rect x="4" y="4" width="312" height="112" rx="8" fill="#131a16" stroke="#3a4a40" strokeWidth="2" />
        {[80, 240].map((cx, i) => (
          <g key={cx} className={playing ? 'reel-spinning' : undefined}>
            <circle cx={cx} cy="50" r={i === 0 ? 34 : 24} fill="#0a0e0c" stroke="#5a4a30" strokeWidth="3" />
            <circle cx={cx} cy="50" r="7" fill="#2a2216" stroke="#8a7040" />
            {[0, 120, 240].map((a) => (
              <line key={a} x1={cx} y1="50" x2={cx + 20 * Math.cos((a * Math.PI) / 180)} y2={50 + 20 * Math.sin((a * Math.PI) / 180)} stroke="#5a4a30" strokeWidth="3" />
            ))}
          </g>
        ))}
        <path d="M 80 84 Q 160 96 240 74" fill="none" stroke="#6a5630" strokeWidth="2" />
        {/* VU bars */}
        {bars.map((h, i) => (
          <rect key={i} x={40 + i * 10} y={110 - h} width="6" height={h} fill={playing ? 'var(--green)' : '#2a3a30'} opacity={playing ? 0.85 : 0.6} />
        ))}
        <circle cx="300" cy="18" r="4" fill={playing ? 'var(--red)' : '#2a1414'} stroke="#3a2020" />
        <text x="292" y="30" fontSize="6" fill="var(--dim)" textAnchor="middle">PLAY</text>
      </svg>
      <div style={{ marginTop: 10 }}>
        <button onClick={play} disabled={playing}>{playing ? t.quarters.playing : t.quarters.play}</button>
      </div>
      {noSpeech && <p className="status-dim">{t.quarters.noSpeech}</p>}
      {played && (
        <div style={{ marginTop: 10 }}>
          <p className="status-dim">{t.quarters.transcriptLabel}</p>
          <p style={{ fontStyle: 'italic' }}>"{transcript}"</p>
        </div>
      )}
    </div>
  );
}

export function CrewQuarters() {
  const t = useStrings();
  return (
    <div className="scene">
      <div className="panel">
        <h2>{t.quarters.title}</h2>
        <p>{t.quarters.intro}</p>
      </div>
      <Safe />
      <Recorder />
      <div className="panel">
        <h2>{t.quarters.wallTitle}</h2>
        <p className="status-dim">{t.quarters.wallDesc}</p>
      </div>
    </div>
  );
}
```
Register `crew_quarters: CrewQuarters`.

- [ ] **Step 4: Verify** — suite + build; in the dev server: wheels turn, the handle rotates on the right combo (9-4-1 on seed 0), the reels spin while the tape plays (and don't under reduced motion), transcript appears after playing.
- [ ] **Step 5: Commit** — `git commit -m "feat: crew quarters — Vasquez's safe and Okafor's reel-to-reel"`

---

### Task 6: Hydroponics scene — the irrigation budget and the buried spike

**Files:**
- Create: `src/scenes/Hydroponics.tsx`
- Modify: `src/scenes/registry.tsx`, `src/ui/strings.ts`

**Interfaces:**
- Consumes: `setIrrigation`, `retrieveSpike`, `irrigationReport`, `chapter2.{irrigation, irrigationSolved, spikeRetrieved}`, `secretsFor(seed).waterNeeds`, `WATER_BUDGET`, `SPIKE_BED`.
- Produces: `<Hydroponics />`; `strings.hydro.{title, intro, bedsTitle, bedsDesc, bed: (n) => string, needTag: (n) => string, valveAria: (n) => string, budget, over, cycleHint, spikeTitle, spikeHidden, spikeRevealed, pullSpike, spikePulled}`.

Premium standard: three **planter beds** in a steel trough — soil gradient, a translucent water level that rises with the valve, a vine (deterministic bezier stems + leaves) on the middle bed that visibly shrinks when the cycle is solved, a brass tag on each bed engraved with its required units, and a **budget gauge** (a horizontal tank meter, red past 10). The valve is the theme's industrial range slider.

- [ ] **Step 1: Strings**
```ts
  hydro: {
    title: string; intro: string; bedsTitle: string; bedsDesc: string; bed: (n: number) => string; needTag: (n: number) => string;
    valveAria: (n: number) => string; budget: string; over: string; cycleHint: string; spikeTitle: string; spikeHidden: string;
    spikeRevealed: string; pullSpike: string; spikePulled: string;
  };
```
EN:
```ts
  hydro: {
    title: 'Hydroponics',
    intro: 'Green, somehow. Nine weeks of one man\'s stubbornness, growing in trays under lights that should have been shed load. The middle bed has gone feral — a vine has swallowed its own planter.',
    bedsTitle: 'Irrigation manifold',
    bedsDesc: 'Three beds, three valves, one pump with a 10-unit budget per cycle. Each bed\'s brass tag says what it needs. Your AI runs the cycle and reports how each bed took it — you turn the valves.',
    bed: (n) => `BED ${n}`,
    needTag: (n) => `${n}u`,
    valveAria: (n) => `bed ${n} valve`,
    budget: 'Pump budget',
    over: 'OVER BUDGET — the pump will refuse the cycle.',
    cycleHint: 'Ask your AI to run the irrigation cycle. The pump is on the ship\'s side.',
    spikeTitle: 'The middle bed',
    spikeHidden: 'The vine is swollen with water, roots wrapped around something that is not a root.',
    spikeRevealed: 'The bed drains. In the mud, a ration bag taped shut — and inside it, a data spike.',
    pullSpike: 'Pull the spike out',
    spikePulled: 'Okafor\'s handwriting on the tape: "For the medic\'s AI." Your AI can read it now.',
  },
```
PT:
```ts
  hydro: {
    title: 'Hidroponia',
    intro: 'Verde, de algum jeito. Nove semanas da teimosia de um homem, crescendo em bandejas sob luzes que deviam ser carga descartável. O canteiro do meio virou mato — uma trepadeira engoliu o próprio vaso.',
    bedsTitle: 'Coletor de irrigação',
    bedsDesc: 'Três canteiros, três válvulas, uma bomba com orçamento de 10 unidades por ciclo. A placa de latão de cada canteiro diz o que ele precisa. Sua IA roda o ciclo e relata como cada canteiro reagiu — você gira as válvulas.',
    bed: (n) => `CANTEIRO ${n}`,
    needTag: (n) => `${n}u`,
    valveAria: (n) => `válvula do canteiro ${n}`,
    budget: 'Orçamento da bomba',
    over: 'ACIMA DO ORÇAMENTO — a bomba vai recusar o ciclo.',
    cycleHint: 'Peça à sua IA para rodar o ciclo de irrigação. A bomba fica do lado da nave.',
    spikeTitle: 'O canteiro do meio',
    spikeHidden: 'A trepadeira está inchada de água, raízes enroladas em algo que não é raiz.',
    spikeRevealed: 'O canteiro drena. Na lama, um saco de ração fechado com fita — e dentro, um data spike.',
    pullSpike: 'Puxar o spike',
    spikePulled: 'A letra de Okafor na fita: "Para a IA do médico." Sua IA consegue ler agora.',
  },
```

- [ ] **Step 2: Scene**

`src/scenes/Hydroponics.tsx`:
```tsx
import { useGame } from '../ui/useGame';
import { useStrings } from '../ui/useLocale';
import { retrieveSpike, setIrrigation } from '../game/store';
import { irrigationReport } from '../game/derived';
import { secretsFor } from '../game/secrets';
import { SPIKE_BED, WATER_BUDGET } from '../game/content';

function Vine({ x, y, size }: { x: number; y: number; size: number }) {
  // deterministic vine: three bezier stems with leaf ellipses; `size` 0..1 scales it
  const stems = [
    `M ${x} ${y} C ${x - 8} ${y - 14 * size}, ${x - 22} ${y - 18 * size}, ${x - 26} ${y - 34 * size}`,
    `M ${x} ${y} C ${x + 6} ${y - 16 * size}, ${x + 18} ${y - 22 * size}, ${x + 24} ${y - 38 * size}`,
    `M ${x} ${y} C ${x - 2} ${y - 20 * size}, ${x + 4} ${y - 30 * size}, ${x - 6} ${y - 44 * size}`,
  ];
  return (
    <g opacity={0.35 + 0.65 * size}>
      {stems.map((d, i) => <path key={i} d={d} fill="none" stroke="#3f7a4a" strokeWidth={1.6} />)}
      {[[-26, -34], [24, -38], [-6, -44], [-14, -20], [12, -24]].map(([dx, dy], i) => (
        <ellipse key={i} cx={x + dx * size} cy={y + dy * size} rx={5 * size} ry={2.6 * size} fill="#4f9a5c" transform={`rotate(${i * 37} ${x + dx * size} ${y + dy * size})`} />
      ))}
    </g>
  );
}

function Beds() {
  const seed = useGame((s) => s.seed);
  const irrigation = useGame((s) => s.chapter2.irrigation);
  const solved = useGame((s) => s.chapter2.irrigationSolved);
  const state = useGame((s) => s);
  const t = useStrings();
  const needs = secretsFor(seed).waterNeeds;
  const report = irrigationReport(state);
  const total = report.total;
  return (
    <div className="panel">
      <h2>{t.hydro.bedsTitle}</h2>
      <p className="status-dim">{t.hydro.bedsDesc}</p>
      <svg viewBox="0 0 360 150" width="100%" style={{ maxWidth: 540, display: 'block' }} aria-hidden="true">
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
        <rect x="6" y="40" width="348" height="96" rx="6" fill="#131a16" stroke="#3a4a40" strokeWidth="2" />
        {[0, 1, 2].map((i) => {
          const x = 24 + i * 112;
          const level = irrigation[i] / 9; // 0..1
          const vineSize = i === SPIKE_BED ? (solved ? 0.35 : 1) : 0.6;
          return (
            <g key={i}>
              <rect x={x} y="56" width="96" height="70" rx="4" fill="url(#hy-soil)" stroke="#2a3a30" />
              <rect x={x + 2} y={124 - 66 * level} width="92" height={66 * level} fill="url(#hy-water)" style={{ transition: 'all 0.4s' }} />
              <Vine x={x + 48} y={120} size={vineSize} />
              {/* brass need tag */}
              <rect x={x + 30} y="132" width="36" height="12" rx="2" fill="#6a5630" stroke="#c9a55a" strokeWidth="0.75" />
              <text x={x + 48} y="141" textAnchor="middle" fontSize="7.5" fill="#f0dfb0" letterSpacing="1">{t.hydro.needTag(needs[i])}</text>
              <text x={x + 48} y="50" textAnchor="middle" fontSize="7" fill="var(--dim)" letterSpacing="1">{t.hydro.bed(i + 1)}</text>
              {/* bed state lamp */}
              <circle cx={x + 88} cy="62" r="3" fill={report.beds[i] === 'ok' ? 'var(--green)' : report.beds[i] === 'dry' ? '#7a5a28' : '#3a6a8a'} opacity={0.9} />
            </g>
          );
        })}
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
      {/* budget tank meter */}
      <div style={{ marginTop: 12, maxWidth: 360 }}>
        <div className="status-dim" style={{ fontSize: 12 }}>{t.hydro.budget}: {total}/{WATER_BUDGET}u</div>
        <div style={{ position: 'relative', height: 12, background: '#0c110e', border: '1px solid var(--line)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 1, width: `${Math.min(100, (total / WATER_BUDGET) * 100)}%`, background: report.overBudget ? 'var(--red)' : 'linear-gradient(180deg, #7ac8d8, #3a7a8a)', transition: 'width 0.3s' }} />
        </div>
        {report.overBudget ? <p className="status-bad">{t.hydro.over}</p> : <p className="status-dim">{t.hydro.cycleHint}</p>}
      </div>
    </div>
  );
}

function SpikeBed() {
  const solved = useGame((s) => s.chapter2.irrigationSolved);
  const pulled = useGame((s) => s.chapter2.spikeRetrieved);
  const t = useStrings();
  return (
    <div className="panel">
      <h2>{t.hydro.spikeTitle}</h2>
      {pulled ? (
        <p className="status-ok">{t.hydro.spikePulled}</p>
      ) : solved ? (
        <>
          <p className="status-ok blink">{t.hydro.spikeRevealed}</p>
          <button onClick={() => retrieveSpike()}>{t.hydro.pullSpike}</button>
        </>
      ) : (
        <p className="status-dim">{t.hydro.spikeHidden}</p>
      )}
    </div>
  );
}

export function Hydroponics() {
  const t = useStrings();
  return (
    <div className="scene">
      <div className="panel">
        <h2>{t.hydro.title}</h2>
        <p>{t.hydro.intro}</p>
      </div>
      <Beds />
      <SpikeBed />
    </div>
  );
}
```
Register `hydroponics: Hydroponics`.

- [ ] **Step 3: Verify** — suite + build; dev server: water levels follow the valves, the budget bar turns red past 10, the middle vine shrinks and the spike panel lights when the agent's `run_irrigation` (or a console call) solves the cycle.
- [ ] **Step 4: Commit** — `git commit -m "feat: hydroponics — irrigation budget and the buried data spike"`

---

### Task 7: Cargo Bay scene — the crane grid and the Kestrel's hull

**Files:**
- Create: `src/scenes/CargoBay.tsx`
- Modify: `src/scenes/registry.tsx`, `src/ui/strings.ts`

**Interfaces:**
- Consumes: `moveCrane`, `liftCrate`, `chapter2.{craneAt, crateLifted, sampleAnalyzed}`, `secretsFor(seed).registryFragment`, `slotLabel`.
- Produces: `<CargoBay />`; `strings.cargo.{title, intro, craneTitle, craneDesc, gridAria, slotAria: (l) => string, up, down, left, right, lift, wrongCrate, lifted, fragmentTitle, fragmentDesc, fragmentAria, readOut, analyzed}`.

Premium standard: a **top-down crane deck** — a 3×3 grid of steel crates with stencilled slot labels and hazard stripes on the quarantine one (only distinguishable after lifting — before that, all crates look alike except for wear), a gantry crane (rails + trolley + hook) that slides to `craneAt` with a CSS transition, and after lifting, a **hull plate** with a burned stencil: "ISV KES▮REL" and "REG ▮▮ 7741" — the 4 digits legible, the rest scorched.

- [ ] **Step 1: Strings**
```ts
  cargo: {
    title: string; intro: string; craneTitle: string; craneDesc: string; gridAria: string; slotAria: (label: string) => string;
    up: string; down: string; left: string; right: string; lift: string; wrongCrate: string; lifted: string;
    fragmentTitle: string; fragmentDesc: string; fragmentAria: string; readOut: string; analyzed: string;
  };
```
EN:
```ts
  cargo: {
    title: 'Cargo bay',
    intro: 'Cold, echoing, and stacked to the ceiling with the things a long haul needs. Somewhere in the bay stack is a container the manifest calls quarantine and Okafor refused to throw away.',
    craneTitle: 'Gantry crane',
    craneDesc: 'Nine slots, one crane, one hook. The crates all look alike from down here; the manifest knows which slot matters. Your AI reads the manifest — you drive.',
    gridAria: 'cargo bay stack, three by three, with the gantry crane',
    slotAria: (label) => `slot ${label}`,
    up: 'Aft', down: 'Fore', left: 'Port', right: 'Starboard', lift: 'Lift',
    wrongCrate: 'The crane lifts an ordinary crate. Ration bars. Someone\'s spare boots. Not this one.',
    lifted: 'The quarantine container comes up, hissing. Inside, on a bed of foam: a slab of hull plate with a stencil half burned away.',
    fragmentTitle: 'Hull fragment',
    fragmentDesc: 'Not debris. Plate. Someone cut this out of a ship and packed it like evidence.',
    fragmentAria: 'a scorched hull plate with a partially legible registry stencil',
    readOut: 'Read the four legible digits to your AI. The analyzer is on the ship\'s side; it will need them exactly.',
    analyzed: 'The analyzer has a name for this plate now. Ask your AI what it found — and then listen to the ship.',
  },
```
PT:
```ts
  cargo: {
    title: 'Porão de carga',
    intro: 'Frio, ecoante, empilhado até o teto com o que uma viagem longa precisa. Em algum lugar da pilha há um contêiner que o manifesto chama de quarentena e que Okafor se recusou a jogar fora.',
    craneTitle: 'Guindaste de pórtico',
    craneDesc: 'Nove slots, um guindaste, um gancho. De baixo, as caixas são todas iguais; o manifesto sabe qual slot importa. Sua IA lê o manifesto — você dirige.',
    gridAria: 'pilha do porão de carga, três por três, com o guindaste de pórtico',
    slotAria: (label) => `slot ${label}`,
    up: 'Ré', down: 'Proa', left: 'Bombordo', right: 'Estibordo', lift: 'Içar',
    wrongCrate: 'O guindaste iça uma caixa comum. Barras de ração. As botas reserva de alguém. Não é esta.',
    lifted: 'O contêiner de quarentena sobe, sibilando. Dentro, num leito de espuma: uma chapa de casco com o estêncil meio queimado.',
    fragmentTitle: 'Fragmento de casco',
    fragmentDesc: 'Não são destroços. É chapa. Alguém cortou isto de uma nave e embalou como prova.',
    fragmentAria: 'uma chapa de casco chamuscada com um estêncil de registro parcialmente legível',
    readOut: 'Leia os quatro dígitos legíveis para sua IA. O analisador fica do lado da nave; ele vai precisar deles exatos.',
    analyzed: 'O analisador agora tem um nome para esta chapa. Pergunte à sua IA o que ela encontrou — e depois escute a nave.',
  },
```

- [ ] **Step 2: Scene**

`src/scenes/CargoBay.tsx`:
```tsx
import { useState } from 'react';
import { useGame } from '../ui/useGame';
import { useStrings } from '../ui/useLocale';
import { liftCrate, moveCrane } from '../game/store';
import { secretsFor, slotLabel } from '../game/secrets';

const CELL = 74;
const X0 = 46;
const Y0 = 34;

function CraneDeck() {
  const craneAt = useGame((s) => s.chapter2.craneAt);
  const lifted = useGame((s) => s.chapter2.crateLifted);
  const seed = useGame((s) => s.seed);
  const t = useStrings();
  const [last, setLast] = useState<string | null>(null);
  const slot = secretsFor(seed).quarantineSlot;
  const cx = X0 + craneAt.col * CELL + CELL / 2;
  const cy = Y0 + craneAt.row * CELL + CELL / 2;
  return (
    <div className="panel">
      <h2>{t.cargo.craneTitle}</h2>
      <p className="status-dim">{t.cargo.craneDesc}</p>
      <svg viewBox="0 0 320 270" width="100%" style={{ maxWidth: 440, display: 'block' }} role="img" aria-label={t.cargo.gridAria}>
        <defs>
          <linearGradient id="cb-steel" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2c3630" />
            <stop offset="100%" stopColor="#151c18" />
          </linearGradient>
          <pattern id="cb-hazard" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="4" height="8" fill="#c9a55a" />
            <rect x="4" width="4" height="8" fill="#1a1410" />
          </pattern>
        </defs>
        {/* deck plate */}
        <rect x="4" y="4" width="312" height="262" rx="6" fill="#0c110e" stroke="#2a3a30" strokeWidth="2" />
        {/* rails */}
        <rect x={X0 - 14} y={Y0 - 12} width="6" height={CELL * 3 + 24} fill="#3a4a40" />
        <rect x={X0 + CELL * 3 + 8} y={Y0 - 12} width="6" height={CELL * 3 + 24} fill="#3a4a40" />
        {/* crates */}
        {[0, 1, 2].map((row) => [0, 1, 2].map((col) => {
          const x = X0 + col * CELL;
          const y = Y0 + row * CELL;
          const isQ = row === slot.row && col === slot.col;
          const gone = lifted && isQ;
          return (
            <g key={`${row}${col}`} aria-label={t.cargo.slotAria(slotLabel({ row, col }))}>
              <rect x={x + 4} y={y + 4} width={CELL - 8} height={CELL - 8} rx="4"
                fill={gone ? '#0a0e0c' : 'url(#cb-steel)'} stroke={gone ? '#2a3a30' : '#4a5a50'} strokeWidth="1.5"
                strokeDasharray={gone ? '3 3' : undefined} />
              {!gone && (
                <>
                  <rect x={x + 10} y={y + 10} width={CELL - 20} height="6" fill="#0a0e0c" opacity="0.5" />
                  <text x={x + CELL / 2} y={y + CELL / 2 + 4} textAnchor="middle" fontSize="11" fill="#7a8f82" letterSpacing="2">{slotLabel({ row, col })}</text>
                </>
              )}
              {lifted && isQ && <rect x={x + 8} y={y + CELL - 16} width={CELL - 16} height="6" fill="url(#cb-hazard)" />}
            </g>
          );
        }))}
        {/* gantry: beam across the crane's row, trolley + hook at its column */}
        <g style={{ transition: 'transform 0.35s ease', transform: `translate(0px, ${cy - (Y0 + CELL / 2)}px)` }}>
          <rect x={X0 - 14} y={Y0 + CELL / 2 - 4} width={CELL * 3 + 28} height="8" fill="#7a8f82" opacity="0.9" />
        </g>
        <g style={{ transition: 'transform 0.35s ease', transform: `translate(${cx - (X0 + CELL / 2)}px, ${cy - (Y0 + CELL / 2)}px)` }}>
          <rect x={X0 + CELL / 2 - 12} y={Y0 + CELL / 2 - 10} width="24" height="20" rx="3" fill="var(--amber)" />
          <line x1={X0 + CELL / 2} y1={Y0 + CELL / 2 + 10} x2={X0 + CELL / 2} y2={Y0 + CELL / 2 + 26} stroke="#c9a55a" strokeWidth="2" />
          <path d={`M ${X0 + CELL / 2 - 6} ${Y0 + CELL / 2 + 26} q 6 10 12 0`} fill="none" stroke="#c9a55a" strokeWidth="2.5" />
        </g>
      </svg>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: 6, justifyContent: 'start', marginTop: 10 }}>
        <span />
        <button onClick={() => moveCrane('up')} disabled={lifted}>{t.cargo.up}</button>
        <span />
        <button onClick={() => moveCrane('left')} disabled={lifted}>{t.cargo.left}</button>
        <button onClick={() => setLast(liftCrate().ok ? 'ok' : 'wrong')} disabled={lifted} style={{ borderColor: 'var(--amber)' }}>{t.cargo.lift}</button>
        <button onClick={() => moveCrane('right')} disabled={lifted}>{t.cargo.right}</button>
        <span />
        <button onClick={() => moveCrane('down')} disabled={lifted}>{t.cargo.down}</button>
        <span />
      </div>
      {lifted ? (
        <p className="status-ok" style={{ marginTop: 10 }}>{t.cargo.lifted}</p>
      ) : last === 'wrong' ? (
        <p className="status-dim" style={{ marginTop: 10 }}>{t.cargo.wrongCrate}</p>
      ) : null}
    </div>
  );
}

function HullFragment() {
  const lifted = useGame((s) => s.chapter2.crateLifted);
  const analyzed = useGame((s) => s.chapter2.sampleAnalyzed);
  const seed = useGame((s) => s.seed);
  const t = useStrings();
  if (!lifted) return null;
  const digits = secretsFor(seed).registryFragment;
  return (
    <div className="panel">
      <h2>{t.cargo.fragmentTitle}</h2>
      <p className="status-dim">{t.cargo.fragmentDesc}</p>
      <svg viewBox="0 0 320 130" width="100%" style={{ maxWidth: 480, display: 'block' }} role="img" aria-label={t.cargo.fragmentAria}>
        <defs>
          <linearGradient id="cb-plate" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3a4038" />
            <stop offset="60%" stopColor="#22281f" />
            <stop offset="100%" stopColor="#141813" />
          </linearGradient>
          <radialGradient id="cb-scorch" cx="0.85" cy="0.3" r="0.6">
            <stop offset="0%" stopColor="#000" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path d="M 20 30 L 250 14 L 300 60 L 280 118 L 60 122 L 14 90 Z" fill="url(#cb-plate)" stroke="#5a6a60" strokeWidth="2" />
        {[[70, 40], [120, 48], [190, 30], [230, 100], [90, 100]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.5" fill="#0a0e0c" stroke="#7a8f82" strokeWidth="0.75" />
        ))}
        <text x="60" y="66" fontSize="20" fill="#c9c1a5" letterSpacing="4" fontFamily="ui-monospace, monospace">ISV KES</text>
        <text x="168" y="66" fontSize="20" fill="#c9c1a5" letterSpacing="4" fontFamily="ui-monospace, monospace" opacity="0.28">TREL</text>
        <text x="60" y="98" fontSize="16" fill="#c9c1a5" letterSpacing="3" fontFamily="ui-monospace, monospace">REG</text>
        <text x="112" y="98" fontSize="16" fill="#c9c1a5" letterSpacing="3" fontFamily="ui-monospace, monospace" opacity="0.22">▮▮</text>
        <text x="160" y="98" fontSize="16" fill="var(--amber)" letterSpacing="5" fontFamily="ui-monospace, monospace">{digits}</text>
        <path d="M 250 14 L 300 60 L 280 118 L 200 100 Z" fill="url(#cb-scorch)" />
      </svg>
      <p className={analyzed ? 'status-ok' : 'status-dim'} style={{ marginTop: 10 }}>{analyzed ? t.cargo.analyzed : t.cargo.readOut}</p>
    </div>
  );
}

export function CargoBay() {
  const t = useStrings();
  return (
    <div className="scene">
      <div className="panel">
        <h2>{t.cargo.title}</h2>
        <p>{t.cargo.intro}</p>
      </div>
      <CraneDeck />
      <HullFragment />
    </div>
  );
}
```
Register `cargo_bay: CargoBay`.

- [ ] **Step 3: Verify** — suite + build; dev server: the trolley slides between cells, the quarantine crate lifts only at its slot (C2 on the classic ship) and gains hazard stripes, the plate shows the amber digits.
- [ ] **Step 4: Commit** — `git commit -m "feat: cargo bay — gantry crane and the Kestrel's hull plate"`

---

### Task 8: The bridge decision, chapter-2 texture, and sounds

**Files:**
- Modify: `src/scenes/Bridge.tsx`, `src/scenes/SealedCompartment.tsx`, `src/scenes/Epilogue.tsx`, `src/App.tsx`, `src/ui/strings.ts`, `README.md`

**Interfaces:**
- Consumes: `startInvestigation`, `chapter`, `killswitch`, `chapter2.sampleAnalyzed`.
- Produces: `<Investigate />` panel in the Bridge; `strings.bridge.{investigateTitle, investigateBody, investigate, investigating, stirring}`; `strings.sealed.{stirring}`; `strings.epilogue.withProof`.

- [ ] **Step 1: Strings**

`bridge` gains: `investigateTitle: string; investigateBody: string; investigate: string; investigating: string; stirring: string;`
EN:
```ts
    investigateTitle: 'The other choice',
    investigateBody: 'The pod is ready. It has been ready the whole time. But the mid-deck bulkheads behind you were never opened — and the ship just told you, by name, that it died before the storm.',
    investigate: 'Leave the pod. Go find out.',
    investigating: 'The investigation is underway. The pod waits — it will wait as long as you need.',
    stirring: 'Something below decks is awake. The pod is still here. So is the question of whether to use it.',
```
PT:
```ts
    investigateTitle: 'A outra escolha',
    investigateBody: 'O pod está pronto. Esteve pronto o tempo todo. Mas os anteparos do convés do meio atrás de você nunca foram abertos — e a nave acabou de te dizer, pelo nome, que morreu antes da tempestade.',
    investigate: 'Deixar o pod. Descobrir.',
    investigating: 'A investigação está em curso. O pod espera — e vai esperar o quanto você precisar.',
    stirring: 'Algo abaixo do convés está acordado. O pod ainda está aqui. E a pergunta de usá-lo, também.',
```
`sealed` gains `stirring: string;` — EN: `'Beyond this bulkhead something has started to breathe. It was not breathing an hour ago.'`; PT: `'Além deste anteparo, algo começou a respirar. Não estava respirando uma hora atrás.'`
`epilogue` gains `withProof: string;` — EN: `'The Kestrel\'s name goes with you. Somebody, somewhere, is going to have to explain it.'`; PT: `'O nome da Kestrel vai com você. Alguém, em algum lugar, vai ter que explicar isso.'`

- [ ] **Step 2: Bridge panel**

In `src/scenes/Bridge.tsx` add (import `startInvestigation`):
```tsx
function Investigate() {
  const read = useGame((s) => s.sealedLogRead);
  const chapter = useGame((s) => s.chapter);
  const killswitch = useGame((s) => s.killswitch);
  const t = useStrings();
  if (!read) return null;
  return (
    <div className="panel" style={{ borderColor: chapter === 1 ? 'var(--amber)' : 'var(--line)' }}>
      <h2>{t.bridge.investigateTitle}</h2>
      {chapter === 1 ? (
        <>
          <p>{t.bridge.investigateBody}</p>
          <button onClick={() => startInvestigation()}>{t.bridge.investigate}</button>
        </>
      ) : (
        <p className={killswitch === 'stirring' ? 'status-bad' : 'status-dim'}>
          {killswitch === 'stirring' ? t.bridge.stirring : t.bridge.investigating}
        </p>
      )}
    </div>
  );
}
```
Render `<Investigate />` right after `<SealedLog />`.

- [ ] **Step 3: Sealed compartments feel the change**

`src/scenes/SealedCompartment.tsx`: read `const stirring = useGame((s) => s.killswitch === 'stirring');` and render `<p className={stirring ? 'status-bad' : 'status-dim'}>{stirring ? t.sealed.stirring : t.sealed.body}</p>`.

- [ ] **Step 4: Epilogue** — after the outro paragraph, `{proof && <p className="status-dim">{t.epilogue.withProof}</p>}` where `const proof = useGame((s) => s.chapter2.sampleAnalyzed);`.

- [ ] **Step 5: Sounds** — in `src/App.tsx`'s sound subscription add:
```ts
      if (state.chapter2.safeOpened && !prevState.chapter2.safeOpened) playBlip();
      if (state.chapter2.irrigationSolved && !prevState.chapter2.irrigationSolved) playBlip();
      if (state.chapter2.crateLifted && !prevState.chapter2.crateLifted) playBlip();
      if (state.chapter === 2 && prevState.chapter === 1) playBlip();
      if (state.killswitch === 'stirring' && prevState.killswitch !== 'stirring') playAlarm();
```

- [ ] **Step 6: README** — update counts: "5 tools online" stays; "16 tools in total" → "23 tools in total"; "the 16 tool definitions" → "the 23 tool definitions"; fix the stale "(Vitest, 41 tests)" to the current count after this task's run. Add one sentence under the play section: "Chapter 2 opens from the bridge once the sealed log is read."

- [ ] **Step 7: Verify** — `npx vitest run && npm run build`; commit — `git commit -m "feat: the bridge decision, chapter-2 texture, sounds"`

---

### Task 9: Playthrough, merge, deploy

- [ ] **Step 1:** Push `directors-cut`, deploy a Vercel preview (`npx vercel --yes`), and walk the user through: classic ship (seed 0) — Chapter 1 to the sealed log → "Leave the pod" → map shows the mid-deck corridors opening → medbay (strip, terminal, `trace_command_origin`) → quarters (manifest gives 2263941 → safe 9-4-1 → `decrypt_private_log`; recorder plays, transcript) → hydroponics (4/3/3 → `run_irrigation` → spike → `read_data_spike`) → cargo (`query_manifest` → C2 → lift → digits 7741 → `analyze_sample` → Kestrel; alarm; sealed rooms change text) → back to the bridge → launch → epilogue with the Kestrel line. Then a seeded ship end-to-end. Then a Plan A save resumes with chapter-2 defaults.
- [ ] **Step 2:** Merge and deploy:
```bash
git checkout main && git merge directors-cut --no-edit && npx vitest run && npm run build && git push origin main && npx vercel --prod --yes
git checkout directors-cut && git merge main && git push origin directors-cut
```
- [ ] **Step 3:** Append to the spec: "**Plan B (Chapter 2) shipped <date>.**"

---

## Self-review notes

- Spec §3 chapter 2 (four compartments, contradicting clues, kill-switch stirs) → Tasks 2–8. §4 table rows Medbay/Quarters/Hydroponics/Cargo → Tasks 4–7 with their tools in Task 3. §10 addendum items (adjacency, geometry, `ending` discriminator) → Task 1.
- Name consistency: `chapter2` slice fields used identically in Tasks 2, 3, 4–8; `secretsFor(seed).{safeCombo, waterNeeds, quarantineSlot, registryFragment, commissionNumber}` in Tasks 2, 3, 6, 7; `slotLabel` in 2, 3, 7; `irrigationReport` in 2, 3, 6; tool names identical in Tasks 3 and 9.
- Plan-level choices: `getCrewManifest` becomes seed-aware (one test line changes); the recorder uses `speechSynthesis` with a transcript fallback (the transcript is human-side text — the asymmetry is the tool boundary, as in Chapter 1's photo).
