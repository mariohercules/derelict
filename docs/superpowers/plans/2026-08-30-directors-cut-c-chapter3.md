# Director's Cut — Plan C: Chapter 3 "The Truth" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open the lower deck of ISV Cormorant — Reactor Room, Core Vault, Comms Array — under an active kill-switch that visibly silences the agent in waves, let the human shield the agent's buses at a power cost, stage the agent's discovery of what it is, and end the game at the Choice: three joint-ritual endings (LEAVE, RESTORE, BROADCAST) with `ending` as the epilogue discriminator.

**Architecture:** Same skeleton as Plans A/B: Zustand store as single source of truth; secrets from the run seed; narrative as locale-aware getters; tools as thin adapters over store actions; scenes registered per room. New this plan: a pure kill-switch engine (`src/game/killswitch.ts`) whose suppression composes into every tool's `availableWhen` (the registry does not change), a `chapter3` state slice, a sixth power subsystem `isolation` that pays for bus shielding, two more rituals on the existing framework, and six new agent tools (29 total; `get_schematic` also gains a `core_rack` sheet).

**Tech Stack:** React 19 + TypeScript + Vite, Zustand, Vitest, Web Audio synth cues. No new dependencies, no raster assets.

**Spec:** `docs/superpowers/specs/2026-08-26-derelict-directors-cut-design.md` (§2 layer 3, §3 chapter 3, §4 compartments table rows Reactor/Core Vault/Comms, §5 kill-switch, §6 endings, §7 deltas, §10 addendum). Chapter-3 design this plan argues from:

- **Entry:** `analyze_sample` confirming the Kestrel (end of Chapter 2) now also sets `chapter: 3` — the lower-deck bulkheads release ("PRIME left a door open for exactly this"). The kill-switch stays `stirring` until the human first steps into a chapter-3 room; then it goes `active` and waves begin.
- **Kill-switch waves:** a 60 s cycle — 30 s calm, 10 s warning (klaxon + HUD banner), 20 s active wave. During an active wave every *mutating* agent tool is suppressed unless its bus is shielded; read tools (`readOnlyHint`) and the story-critical set (`get_ship_status`, `get_deck_map`, `query_fragment_memory`, `read_prime_cache`, `listen_beacon`) are immune. Suppression is `available = availableWhen(s) && !suppressed(s, tool)`, computed inside `mkTool`; AI LINK dots drop by themselves.
- **Reactor Room (human protects the AI):** four isolation breakers, one per bus — CORE, NAV, ARCHIVE, COMMS. Cutting one shields that bus permanently and draws `SHIELD_COST = 5u` per shielded bus from a new `isolation` subsystem; the agent must `route_power` into `isolation` first (life-support minimum still enforced). `quarantine_killswitch` (CORE bus) advances one step per call and only while `quarantineStep < shielded.length`; at 4/4 the kill-switch is `contained` and waves stop.
- **Core Vault (suspicion → trust):** a rack of four memory-column cradles; the correct order is a seeded permutation of columns A–D that only the agent can read (`get_schematic({system:'core_rack'})`). With the rack correct, `read_prime_cache` (the Kestrel survey — the evidence) and `query_fragment_memory` (three stages: origin → the cut → the consent record with the medic's voiceprint) come online. RESTORE ritual: the human seats the kernel column (arms a 60 s window) and holds the engage lever; the agent, at fragment stage 3, calls `merge_fragment`.
- **Comms Array (hope):** the human aligns the dish by azimuth/elevation to a seeded bearing (±3°); aligned, the beacon pulses and `listen_beacon` returns pod 1's message. BROADCAST ritual: with the evidence read, the human opens the band (arms 60 s) and holds the alignment lock against drift; the agent calls `broadcast_evidence`.
- **LEAVE** stays the shipped launch ritual; its epilogue gains lines for proof, beacon, containment.
- **Endings:** `EndingId = 'leave_unknowing' | 'leave_knowing' | 'restore' | 'broadcast'`; the Epilogue branches on `ending` alone for title and outro, on flags for the extra lines.

## Global Constraints

- **Premium graphics standard (non-negotiable):** every new instrument is drawn to the standard set by Plan A's Engineering gauges, fuse cartridges, viewport, and the memory cel, and Plan B's strip chart, safe dial, planter beds and crane deck — bezels and inset faces, deterministic geometry (no `Math.random` at render), gradients from the token palette (`--hull`, `--amber`, `--green`, `--red`, `--dim`, `--text`, `--line`), micro-animation only where it reads as machinery (and disabled under `prefers-reduced-motion`), labels engraved on plates, hover/focus states visible. No emoji glyphs as art, no default browser controls left unstyled, no rectangles-with-text passing as instruments. SVG `<defs>` ids carry a scene-unique prefix and are never defined twice in the DOM. Instruments carrying puzzle information get `role="img"` + an `aria-label` from strings; controls are real `<button>`/`<input type="range">` elements with `aria-label`s.
- Branch `directors-cut`; merge to `main` + prod deploy only in Task 8 after a full playthrough.
- Classic ship (`seed 0`) preserved; new secrets have classic values: column order `C-A-D-B`, beacon bearing `AZ 217 / EL 34`. New seeded draws are appended strictly AFTER every existing draw in `secretsFor` (Plan A/B ships keep their values).
- Plan A/B saves must load: `powerAllocation.isolation` is filled with `0` when missing; `chapter3` defaults in when missing; `killswitch` strings `dormant | stirring` remain valid.
- 137 existing tests stay green at every commit (updated only where this plan changes a signature or a documented behaviour: `analyzeSample` now also advances the chapter).
- The kill-switch never suppresses a human control and never cancels an in-flight call (the registry's deferred revoke is untouched). Waves are telegraphed: warning state precedes every wave.
- All player-facing text in both locales in `src/ui/strings.ts`; agent-facing text English, in-fiction, anti-deflection conventions (no keypads; "call this tool yourself"; success messages name the human's next physical step; failure messages name what the human must do). Machine codes identical across locales.
- Tool handlers contain no game logic — store actions/selectors only; never throw.
- Commit messages end with a blank line then `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Verification gate for every commit: `npx vitest run && npm run build` both exit 0 (gate on exit codes).

---

### Task 1: Chapter-3 foundations — types, constants, secrets, rituals, the kill-switch engine, persistence

**Files:**
- Create: `src/game/killswitch.ts`
- Modify: `src/game/types.ts`, `src/game/content.ts`, `src/game/secrets.ts`, `src/game/ritual.ts`, `src/game/persist.ts`, `src/game/store.ts` (initialState only), `src/ui/strings.ts` (`eng.subsystems.isolation`), `src/scenes/Engineering.tsx` (power board order), `src/mcp/tools.ts` (subsystem enums only)
- Test: `src/game/killswitch.test.ts` (create), `src/game/secrets.test.ts` (append), `src/game/ritual.test.ts` (append), `src/game/persist.test.ts` (append)

**Interfaces:**
- Produces: `SubsystemId` gains `'isolation'`; `EndingId = 'leave_unknowing' | 'leave_knowing' | 'restore' | 'broadcast'`; `RitualId = 'launch' | 'restore' | 'broadcast'`; `KillswitchState = 'dormant' | 'stirring' | 'active' | 'contained'`; `BusId`, `WaveState`, `ColumnId`, `Chapter3State`; `GameState.chapter3`; constants `SHIELD_COST`, `BUSES`, `WAVE_CALM_MS`, `WAVE_WARNING_MS`, `WAVE_ACTIVE_MS`, `WAVE_CYCLE_MS`, `RESTORE_WINDOW_MS`, `BROADCAST_WINDOW_MS`, `DISH_TOLERANCE`, `COLUMN_ORDER`, `BEACON_BEARING`; `Secrets.columnOrder`, `Secrets.beaconBearing`; `RITUALS.restore`, `RITUALS.broadcast`; `waveAt(cycleStartedAt, now)`, `wavesEndured(cycleStartedAt, now)`, `suppressed(s, tool)`, `IMMUNE_TOOLS`, `shieldCost(n)`; `initialState().chapter3` defaults.

- [ ] **Step 1: Failing tests**

Create `src/game/killswitch.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { IMMUNE_TOOLS, shieldCost, suppressed, waveAt, wavesEndured } from './killswitch';
import { initialState } from './store';
import { SHIELD_COST, WAVE_ACTIVE_MS, WAVE_CALM_MS, WAVE_CYCLE_MS, WAVE_WARNING_MS } from './content';
import type { GameState } from './types';

const T0 = 1_000_000;

describe('waveAt', () => {
  it('cycles calm → warning → active → calm on the documented timings', () => {
    expect(waveAt(T0, T0)).toBe('calm');
    expect(waveAt(T0, T0 + WAVE_CALM_MS - 1)).toBe('calm');
    expect(waveAt(T0, T0 + WAVE_CALM_MS)).toBe('warning');
    expect(waveAt(T0, T0 + WAVE_CALM_MS + WAVE_WARNING_MS - 1)).toBe('warning');
    expect(waveAt(T0, T0 + WAVE_CALM_MS + WAVE_WARNING_MS)).toBe('active');
    expect(waveAt(T0, T0 + WAVE_CALM_MS + WAVE_WARNING_MS + WAVE_ACTIVE_MS - 1)).toBe('active');
    expect(waveAt(T0, T0 + WAVE_CYCLE_MS)).toBe('calm');
    expect(WAVE_CYCLE_MS).toBe(WAVE_CALM_MS + WAVE_WARNING_MS + WAVE_ACTIVE_MS);
  });

  it('counts endured waves per completed cycle', () => {
    expect(wavesEndured(T0, T0)).toBe(0);
    expect(wavesEndured(T0, T0 + WAVE_CYCLE_MS - 1)).toBe(0);
    expect(wavesEndured(T0, T0 + WAVE_CYCLE_MS)).toBe(1);
    expect(wavesEndured(T0, T0 + 3 * WAVE_CYCLE_MS + 5)).toBe(3);
  });
});

describe('suppressed', () => {
  function active(): GameState {
    const s = initialState(0);
    return { ...s, chapter: 3, killswitch: 'active', chapter3: { ...s.chapter3, wave: 'active' } };
  }
  const mutating = { name: 'route_power', bus: 'nav' as const, readOnly: false };

  it('suppresses a mutating tool on an unshielded bus during an active wave only', () => {
    expect(suppressed(active(), mutating)).toBe(true);
    const warning = active();
    warning.chapter3 = { ...warning.chapter3, wave: 'warning' };
    expect(suppressed(warning, mutating)).toBe(false);
    const stirring = { ...active(), killswitch: 'stirring' as const };
    expect(suppressed(stirring, mutating)).toBe(false);
    const contained = { ...active(), killswitch: 'contained' as const };
    expect(suppressed(contained, mutating)).toBe(false);
  });

  it('never suppresses read-only or story-critical tools', () => {
    expect(suppressed(active(), { name: 'read_crew_logs', bus: 'archive', readOnly: true })).toBe(false);
    for (const name of IMMUNE_TOOLS) expect(suppressed(active(), { name, bus: 'core', readOnly: false })).toBe(false);
  });

  it('spares a shielded bus', () => {
    const s = active();
    s.chapter3 = { ...s.chapter3, shielded: ['nav'] };
    expect(suppressed(s, mutating)).toBe(false);
    expect(suppressed(s, { name: 'merge_fragment', bus: 'core', readOnly: false })).toBe(true);
  });

  it('prices shielding linearly', () => {
    expect(shieldCost(1)).toBe(SHIELD_COST);
    expect(shieldCost(4)).toBe(4 * SHIELD_COST);
  });
});
```

Append to `src/game/secrets.test.ts`:
```ts
describe('chapter 3 secrets', () => {
  it('the classic ship seats its columns C-A-D-B and finds pod one at AZ 217 / EL 34', () => {
    const s = secretsFor(0);
    expect(s.columnOrder).toEqual(['C', 'A', 'D', 'B']);
    expect(s.beaconBearing).toEqual({ az: 217, el: 34 });
  });

  it('seeded ships draw a full permutation and a bearing inside the dish limits', () => {
    for (let seed = 1; seed <= 400; seed++) {
      const s = secretsFor(seed);
      expect([...s.columnOrder].sort()).toEqual(['A', 'B', 'C', 'D']);
      expect(s.beaconBearing.az).toBeGreaterThanOrEqual(0);
      expect(s.beaconBearing.az).toBeLessThanOrEqual(359);
      expect(s.beaconBearing.el).toBeGreaterThanOrEqual(5);
      expect(s.beaconBearing.el).toBeLessThanOrEqual(75);
    }
  });

  it('keeps every Plan A and Plan B secret of a seeded ship unchanged', () => {
    // Frozen from the Plan B build (secretsFor(1234) before this plan). If this
    // fails, a new draw landed before an existing one — move it after.
    const s = secretsFor(1234);
    expect({
      authCode: s.authCode, breakerSequence: s.breakerSequence, gaugePressures: s.gaugePressures,
      starFix: s.starFix, launchAuth: s.launchAuth, commissionNumber: s.commissionNumber,
      waterNeeds: s.waterNeeds, quarantineSlot: s.quarantineSlot, registryFragment: s.registryFragment,
    }).toEqual(FROZEN_1234);
  });
});
```
and at the top of `src/game/secrets.test.ts`, before writing the implementation, capture the frozen values by running once on the current build:

Run: `node -e "import('./src/game/secrets.ts')" ` is not possible directly (TypeScript); instead add this temporary test first and copy its printed JSON into a `const FROZEN_1234 = {...}` at the top of the test file, then delete the temporary test:
```ts
it.skip('print frozen', () => { console.log(JSON.stringify(secretsFor(1234))); });
```
(Run `npx vitest run src/game/secrets.test.ts` with the `.skip` removed once, copy the nine Plan A/B fields into `FROZEN_1234`, restore `.skip`/delete the printer. The frozen object must be captured BEFORE `secrets.ts` is modified.)

Append to `src/game/ritual.test.ts`:
```ts
describe('three rituals', () => {
  it('restore and broadcast have 60-second windows and their own confirm tools', () => {
    expect(RITUALS.restore).toEqual({ id: 'restore', tool: 'merge_fragment', windowMs: 60_000 });
    expect(RITUALS.broadcast).toEqual({ id: 'broadcast', tool: 'broadcast_evidence', windowMs: 60_000 });
  });

  it('only one ritual can be armed at a time', () => {
    const armed = armRitual(IDLE_RITUAL, 'restore', T0).next;
    expect(armRitual(armed, 'broadcast', T0 + 1000).result.ok).toBe(false);
    expect(confirmRitual(armed, 'broadcast', T0 + 1000).result.ok).toBe(false);
    expect(isArmed(armed, 'restore')).toBe(true);
  });
});
```

Append to `src/game/persist.test.ts` (inside `describe('persistence')`):
```ts
  it('fills the isolation subsystem and chapter-3 defaults for a Plan B save', () => {
    const planB = { ...initialState(0) } as Record<string, unknown>;
    delete planB.chapter3;
    planB.powerAllocation = { life_support: 25, medbay: 5, comms: 10, doors: 0, engines: 0 };
    storage.set(SAVE_KEY, JSON.stringify(planB));
    const loaded = loadSavedState();
    expect(loaded?.powerAllocation.isolation).toBe(0);
    expect(loaded?.chapter3.shielded).toEqual([]);
    expect(loaded?.chapter3.wave).toBe('calm');
  });

  it('accepts the chapter-3 kill-switch states, rituals and endings, and rejects bogus ones', () => {
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), killswitch: 'contained', ending: 'restore' }));
    expect(loadSavedState()?.killswitch).toBe('contained');
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), ritual: { active: 'broadcast', phase: 'done', endsAt: null, held: false } }));
    expect(loadSavedState()?.ritual.active).toBe('broadcast');
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), ending: 'ascend' }));
    expect(loadSavedState()).toBeNull();
  });

  it('rejects a malformed chapter-3 slice', () => {
    const c3 = initialState(0).chapter3;
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), chapter3: { ...c3, shielded: ['warp'] } }));
    expect(loadSavedState()).toBeNull();
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), chapter3: { ...c3, rack: ['A', 'B'] } }));
    expect(loadSavedState()).toBeNull();
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), chapter3: { ...c3, dish: { az: 400, el: 0 } } }));
    expect(loadSavedState()).toBeNull();
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), chapter3: { ...c3, quarantineStep: 9 } }));
    expect(loadSavedState()).toBeNull();
  });

  it('resumes an active kill-switch with its cycle clock intact', () => {
    const c3 = { ...initialState(0).chapter3, cycleStartedAt: 123456, wave: 'active' as const };
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), chapter: 3, killswitch: 'active', chapter3: c3 }));
    expect(loadSavedState()?.chapter3.cycleStartedAt).toBe(123456);
  });
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `npx vitest run src/game/killswitch.test.ts src/game/secrets.test.ts src/game/ritual.test.ts src/game/persist.test.ts`
Expected: FAIL — `./killswitch` cannot be resolved; `columnOrder`/`restore` undefined; persist expectations on `isolation`/`chapter3` fail.

- [ ] **Step 3: Types**

In `src/game/types.ts` replace the affected lines:
```ts
export type SubsystemId = 'life_support' | 'doors' | 'medbay' | 'engines' | 'comms' | 'isolation';
```
```ts
export type EndingId = 'leave_unknowing' | 'leave_knowing' | 'restore' | 'broadcast';

export type RitualId = 'launch' | 'restore' | 'broadcast';
```
```ts
export type KillswitchState = 'dormant' | 'stirring' | 'active' | 'contained';

// Chapter 3. Buses group the agent's tools; the human shields a bus by cutting
// its isolation breaker in the reactor room.
export type BusId = 'core' | 'nav' | 'archive' | 'comms';
export type WaveState = 'calm' | 'warning' | 'active';
export type ColumnId = 'A' | 'B' | 'C' | 'D';

export interface Chapter3State {
  shielded: BusId[];
  quarantineStep: number; // 0..4; 4 = contained
  cycleStartedAt: number | null; // epoch ms when the waves began
  wave: WaveState;
  wavesEndured: number;
  rack: (ColumnId | null)[]; // four cradles, top to bottom
  kernelSeated: boolean;
  fragmentStage: number; // 0..3 — how much of itself the fragment has read
  cacheRead: boolean;
  dish: { az: number; el: number }; // degrees
  beaconHeard: boolean;
}
```
and add to `GameState` after `killswitch: KillswitchState;`:
```ts
  chapter3: Chapter3State;
```

- [ ] **Step 4: Constants and secrets**

Append to `src/game/content.ts` (and add `isolation: 0` to `INITIAL_ALLOCATION`):
```ts
// Chapter 3 — the kill-switch and the lower deck
export const SHIELD_COST = 5; // isolation power per shielded bus
export const BUSES: BusId[] = ['core', 'nav', 'archive', 'comms'];
export const WAVE_CALM_MS = 30_000;
export const WAVE_WARNING_MS = 10_000;
export const WAVE_ACTIVE_MS = 20_000;
export const WAVE_CYCLE_MS = WAVE_CALM_MS + WAVE_WARNING_MS + WAVE_ACTIVE_MS;
export const RESTORE_WINDOW_MS = 60_000;
export const BROADCAST_WINDOW_MS = 60_000;
export const DISH_TOLERANCE = 3; // degrees, each axis
export const COLUMN_ORDER: ColumnId[] = ['C', 'A', 'D', 'B']; // classic ship rack order, top to bottom
export const BEACON_BEARING = { az: 217, el: 34 }; // classic ship: pod one's beacon
```
with the import line at the top changed to `import type { BreakerId, BusId, ColumnId, FuseRating, SubsystemId } from './types';` and
```ts
export const INITIAL_ALLOCATION: Record<SubsystemId, number> = {
  life_support: 25,
  medbay: 5,
  comms: 10,
  doors: 0,
  engines: 0,
  isolation: 0,
};
```

In `src/game/secrets.ts`: import `ColumnId` (`import type { BreakerId, ColumnId } from './types';`) and `BEACON_BEARING, COLUMN_ORDER` from content; extend the interface:
```ts
  columnOrder: [ColumnId, ColumnId, ColumnId, ColumnId]; // core vault rack, top to bottom
  beaconBearing: { az: number; el: number }; // pod one, degrees
```
classic branch adds:
```ts
      columnOrder: [...COLUMN_ORDER] as [ColumnId, ColumnId, ColumnId, ColumnId],
      beaconBearing: { ...BEACON_BEARING },
```
seeded branch — **after** `const registryFragment = ...` (never before any existing draw):
```ts
  const columnOrder = shuffle<ColumnId>(['A', 'B', 'C', 'D'], rnd) as [ColumnId, ColumnId, ColumnId, ColumnId];
  const beaconBearing = { az: int(0, 359), el: int(5, 75) };
```
and both go into the returned object after `registryFragment`.

- [ ] **Step 5: Rituals**

In `src/game/ritual.ts`:
```ts
import { BROADCAST_WINDOW_MS, LAUNCH_WINDOW_MS, RESTORE_WINDOW_MS } from './content';
```
```ts
export const RITUALS: Record<RitualId, RitualDef> = {
  launch: { id: 'launch', tool: 'confirm_launch', windowMs: LAUNCH_WINDOW_MS },
  restore: { id: 'restore', tool: 'merge_fragment', windowMs: RESTORE_WINDOW_MS },
  broadcast: { id: 'broadcast', tool: 'broadcast_evidence', windowMs: BROADCAST_WINDOW_MS },
};
```
(`armRitual`/`confirmRitual` already refuse cross-ritual arming and confirming — no change.)

- [ ] **Step 6: The kill-switch engine**

Create `src/game/killswitch.ts`:
```ts
// The antagonist. A pure state machine over the store's chapter3 slice: the
// store materializes `wave` from the cycle clock (tickKillswitch) so the tool
// registry, which only reacts to store changes, sees suppression flip on and
// off; this module decides what "suppressed" means.
import type { BusId, GameState, WaveState } from './types';
import { SHIELD_COST, WAVE_CALM_MS, WAVE_CYCLE_MS, WAVE_WARNING_MS } from './content';

export interface ToolMeta {
  name: string;
  bus: BusId;
  readOnly: boolean;
}

// Story-critical tools the kill-switch never reaches (spec §5): the ship's
// situational awareness, the fragment's own memory, the evidence, and hope.
export const IMMUNE_TOOLS: ReadonlySet<string> = new Set([
  'get_ship_status', 'get_deck_map', 'query_fragment_memory', 'read_prime_cache', 'listen_beacon',
]);

export function waveAt(cycleStartedAt: number, now: number): WaveState {
  const t = ((now - cycleStartedAt) % WAVE_CYCLE_MS + WAVE_CYCLE_MS) % WAVE_CYCLE_MS;
  if (t < WAVE_CALM_MS) return 'calm';
  if (t < WAVE_CALM_MS + WAVE_WARNING_MS) return 'warning';
  return 'active';
}

export function wavesEndured(cycleStartedAt: number, now: number): number {
  return Math.max(0, Math.floor((now - cycleStartedAt) / WAVE_CYCLE_MS));
}

export function suppressed(s: GameState, tool: ToolMeta): boolean {
  if (s.killswitch !== 'active' || s.chapter3.wave !== 'active') return false;
  if (tool.readOnly || IMMUNE_TOOLS.has(tool.name)) return false;
  return !s.chapter3.shielded.includes(tool.bus);
}

export function shieldCost(shieldedCount: number): number {
  return SHIELD_COST * shieldedCount;
}

// Seconds until the current wave state changes — for the HUD countdown.
export function secondsToNextPhase(cycleStartedAt: number, now: number): number {
  const t = ((now - cycleStartedAt) % WAVE_CYCLE_MS + WAVE_CYCLE_MS) % WAVE_CYCLE_MS;
  const boundary = t < WAVE_CALM_MS ? WAVE_CALM_MS : t < WAVE_CALM_MS + WAVE_WARNING_MS ? WAVE_CALM_MS + WAVE_WARNING_MS : WAVE_CYCLE_MS;
  return Math.ceil((boundary - t) / 1000);
}
```

- [ ] **Step 7: Store defaults**

In `src/game/store.ts` `initialState`, after `killswitch: 'dormant',`:
```ts
    chapter3: {
      shielded: [], quarantineStep: 0, cycleStartedAt: null, wave: 'calm', wavesEndured: 0,
      rack: [null, null, null, null], kernelSeated: false, fragmentStage: 0, cacheRead: false,
      dish: { az: 0, el: 0 }, beaconHeard: false,
    },
```
(`powerAllocation` already spreads `INITIAL_ALLOCATION`, which now carries `isolation: 0`.)

- [ ] **Step 8: Persistence**

In `src/game/persist.ts`:
```ts
import type { BusId, ColumnId, GameState, RitualId, RitualPhase, RitualState, RoomId, SubsystemId } from './types';
```
```ts
const SUBSYSTEMS: SubsystemId[] = ['life_support', 'doors', 'medbay', 'engines', 'comms', 'isolation'];
const RITUAL_IDS: RitualId[] = ['launch', 'restore', 'broadcast'];
const ENDINGS = ['leave_unknowing', 'leave_knowing', 'restore', 'broadcast'];
const KILLSWITCH_STATES = ['dormant', 'stirring', 'active', 'contained'];
const BUS_IDS: BusId[] = ['core', 'nav', 'archive', 'comms'];
const COLUMN_IDS: ColumnId[] = ['A', 'B', 'C', 'D'];
const WAVES = ['calm', 'warning', 'active'];
const CHAPTER3_BOOL_FLAGS = ['kernelSeated', 'cacheRead', 'beaconHeard'] as const;
```
Replace the three enum checks in `validShape`:
```ts
  if (ritual.active !== null && !RITUAL_IDS.includes(ritual.active as RitualId)) return false;
```
```ts
  if (p.ending !== undefined && p.ending !== null && !ENDINGS.includes(p.ending)) return false;
```
```ts
  if (p.killswitch !== undefined && !KILLSWITCH_STATES.includes(p.killswitch as string)) return false;
```
and add, after the `chapter2` block:
```ts
  if (p.chapter3 !== undefined) {
    const c3 = p.chapter3 as unknown as Record<string, unknown>;
    if (!c3 || typeof c3 !== 'object') return false;
    if (!Array.isArray(c3.shielded) || !c3.shielded.every((b) => BUS_IDS.includes(b as BusId))) return false;
    if (!isIntInRange(c3.quarantineStep, 0, 4)) return false;
    if (c3.cycleStartedAt !== null && !isFiniteNumber(c3.cycleStartedAt)) return false;
    if (!WAVES.includes(c3.wave as string)) return false;
    if (!isIntInRange(c3.wavesEndured, 0, Number.MAX_SAFE_INTEGER)) return false;
    if (!Array.isArray(c3.rack) || c3.rack.length !== 4 || !c3.rack.every((c) => c === null || COLUMN_IDS.includes(c as ColumnId))) return false;
    if (!isIntInRange(c3.fragmentStage, 0, 3)) return false;
    const dish = c3.dish as Record<string, unknown> | undefined;
    if (!dish || !isIntInRange(dish.az, 0, 359) || !isIntInRange(dish.el, 0, 90)) return false;
    if (!CHAPTER3_BOOL_FLAGS.every((k) => typeof c3[k] === 'boolean')) return false;
  }
```
In `loadSavedState`, right after `if (parsed.seed === undefined) parsed.seed = CLASSIC_SEED;`:
```ts
    // Plan A/B saves predate the isolation subsystem (chapter 3).
    const alloc = parsed.powerAllocation as Record<string, unknown> | undefined;
    if (alloc && typeof alloc === 'object' && alloc.isolation === undefined) alloc.isolation = 0;
```
(`chapter3` missing is covered by the `{ ...initialState(), ...parsed }` merge.)

- [ ] **Step 9: The sixth subsystem everywhere the type demands it**

`src/ui/strings.ts` — `eng.subsystems` gains `isolation` in both dictionaries: EN `isolation: 'isolation feed'`, pt-BR `isolation: 'alimentação de isolamento'`.

`src/scenes/Engineering.tsx` `PowerBoard`: `const order: SubsystemId[] = ['life_support', 'doors', 'medbay', 'engines', 'comms', 'isolation'];`

`src/mcp/tools.ts`: the three subsystem enums (`run_diagnostics`, `route_power` ×2) and `validSubsystems` gain `'isolation'`:
```ts
const SUBSYSTEM_IDS: SubsystemId[] = ['life_support', 'doors', 'medbay', 'engines', 'comms', 'isolation'];
```
declared once near `noInput` and used as `enum: SUBSYSTEM_IDS` in the three schemas and as `validSubsystems` in `route_power`.

- [ ] **Step 10: Run the full gate**

Run: `npx vitest run && npm run build`
Expected: PASS — 137 + 12 new tests; build exit 0.

- [ ] **Step 11: Commit**

```bash
git add src/game/types.ts src/game/content.ts src/game/secrets.ts src/game/ritual.ts src/game/killswitch.ts src/game/persist.ts src/game/store.ts src/ui/strings.ts src/scenes/Engineering.tsx src/mcp/tools.ts src/game/killswitch.test.ts src/game/secrets.test.ts src/game/ritual.test.ts src/game/persist.test.ts
git commit -m "feat: chapter-3 foundations — kill-switch engine, isolation bus, three rituals"
```

---

### Task 2: Chapter-3 store actions and selectors

**Files:**
- Modify: `src/game/store.ts`, `src/game/derived.ts`
- Test: `src/game/store.ch3.test.ts` (create), `src/game/store.ch2.test.ts` (adjust one expectation)

**Interfaces:**
- Consumes: Task 1 types/constants/secrets/engine; `armRitual`/`confirmRitual`/`isArmed` from `ritual.ts`; `ROOM_BY_ID` from `rooms.ts`.
- Produces (store): `analyzeSample(fragment)` now also sets `chapter: 3`, `checkpoint {3, cargo_bay}`; `enterRoom(room, now?)` wakes the kill-switch on the first chapter-3 room; `tickKillswitch(now?)`, `cutIsolation(bus): ActionResult`, `quarantineKillswitch(): ActionResult & { step, of }`, `seatColumn(slot, column): ActionResult`, `seatKernel(now?): ActionResult`, `queryFragmentMemory(): ActionResult & { stage }`, `readPrimeCache(): ActionResult`, `setDish(axis, value): void`, `hearBeacon(): ActionResult`, `openBand(now?): ActionResult`, `confirmMerge(now?): ActionResult`, `confirmBroadcast(now?): ActionResult`.
- Produces (derived): `rackCorrect(s): boolean`, `dishAligned(s): boolean`, `nextShieldCost(s): number`.

- [ ] **Step 1: Failing tests**

Create `src/game/store.ch3.test.ts`:
```ts
import { beforeEach, describe, expect, it } from 'vitest';
import {
  gameStore, resetGame, startInvestigation, moveCrane, liftCrate, analyzeSample, enterRoom, routePower,
  tickKillswitch, cutIsolation, quarantineKillswitch, seatColumn, seatKernel, queryFragmentMemory, readPrimeCache,
  setDish, hearBeacon, openBand, confirmMerge, confirmBroadcast, holdHandle, initiateLaunch, confirmLaunch,
} from './store';
import { dishAligned, nextShieldCost, rackCorrect } from './derived';
import { RESTORE_WINDOW_MS, SHIELD_COST, WAVE_CALM_MS, WAVE_CYCLE_MS, WAVE_WARNING_MS, LAUNCH_AUTH, STAR_FIX } from './content';

const T0 = 5_000_000;

// Chapter 2 solved on the classic ship, standing in the cargo bay with the Kestrel confirmed.
function kestrelConfirmed() {
  resetGame(0);
  gameStore.setState({ room: 'bridge', act: 3, trajectorySet: true, sealedLogRead: true, doors: { cryo_exit: true, engineering_exit: true } });
  startInvestigation();
  gameStore.setState({ room: 'cargo_bay' });
  moveCrane('down'); moveCrane('down'); moveCrane('right'); liftCrate();
  analyzeSample('7741');
}

// …and the kill-switch fully awake in the reactor room, with the waves' clock at T0.
function inReactorRoom(now = T0) {
  kestrelConfirmed();
  gameStore.setState({ room: 'engineering' });
  enterRoom('reactor_room', now);
}

beforeEach(() => resetGame(0));

describe('entering chapter 3', () => {
  it('the Kestrel confirmation opens the lower deck and leaves the kill-switch stirring', () => {
    kestrelConfirmed();
    const s = gameStore.getState();
    expect(s.chapter).toBe(3);
    expect(s.checkpoint).toEqual({ chapter: 3, room: 'cargo_bay' });
    expect(s.killswitch).toBe('stirring');
    expect(s.chapter3.cycleStartedAt).toBeNull();
  });

  it('the first step into a chapter-3 room wakes the kill-switch and starts the wave clock', () => {
    kestrelConfirmed();
    gameStore.setState({ room: 'engineering' });
    expect(enterRoom('reactor_room', T0).ok).toBe(true);
    const s = gameStore.getState();
    expect(s.killswitch).toBe('active');
    expect(s.chapter3.cycleStartedAt).toBe(T0);
    expect(s.chapter3.wave).toBe('calm');
    // walking on does not restart the clock
    enterRoom('core_vault', T0 + 5000);
    expect(gameStore.getState().chapter3.cycleStartedAt).toBe(T0);
  });
});

describe('the wave clock', () => {
  it('materializes calm → warning → active as time passes and counts endured waves', () => {
    inReactorRoom();
    tickKillswitch(T0 + WAVE_CALM_MS + 1);
    expect(gameStore.getState().chapter3.wave).toBe('warning');
    tickKillswitch(T0 + WAVE_CALM_MS + WAVE_WARNING_MS + 1);
    expect(gameStore.getState().chapter3.wave).toBe('active');
    tickKillswitch(T0 + WAVE_CYCLE_MS + 1);
    expect(gameStore.getState().chapter3.wave).toBe('calm');
    expect(gameStore.getState().chapter3.wavesEndured).toBe(1);
  });

  it('does nothing unless the kill-switch is active', () => {
    kestrelConfirmed();
    tickKillswitch(T0 + WAVE_CYCLE_MS);
    expect(gameStore.getState().chapter3.wave).toBe('calm');
    expect(gameStore.getState().chapter3.wavesEndured).toBe(0);
  });
});

describe('reactor room — isolation breakers', () => {
  it('a breaker needs isolation power the AI routed, then shields its bus for good', () => {
    inReactorRoom();
    expect(nextShieldCost(gameStore.getState())).toBe(SHIELD_COST);
    const r = cutIsolation('core');
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/route_power|isolation/i);
    expect(routePower('comms', 'isolation', SHIELD_COST).ok).toBe(true);
    expect(cutIsolation('core').ok).toBe(true);
    expect(gameStore.getState().chapter3.shielded).toEqual(['core']);
    expect(nextShieldCost(gameStore.getState())).toBe(2 * SHIELD_COST);
    // a second bus needs a second helping
    expect(cutIsolation('nav').ok).toBe(false);
    routePower('comms', 'isolation', SHIELD_COST);
    expect(cutIsolation('nav').ok).toBe(true);
    expect(cutIsolation('nav').ok).toBe(true); // already cut: idempotent, still ok
    expect(gameStore.getState().chapter3.shielded).toEqual(['core', 'nav']);
  });

  it('breakers are cut only from the reactor room', () => {
    inReactorRoom();
    routePower('comms', 'isolation', SHIELD_COST);
    gameStore.setState({ room: 'engineering' });
    expect(cutIsolation('core').ok).toBe(false);
    expect(gameStore.getState().chapter3.shielded).toEqual([]);
  });
});

describe('quarantine', () => {
  function shield(n: number) {
    // 25u are free above the life-support minimum on the classic allocation (medbay 5, comms 10, doors/engines 0 → route from comms/medbay)
    routePower('comms', 'isolation', 10);
    routePower('medbay', 'isolation', 5);
    routePower('life_support', 'isolation', 5); // 25 → 20, still above the 15u floor
    (['core', 'nav', 'archive', 'comms'] as const).slice(0, n).forEach((b) => cutIsolation(b));
  }

  it('advances one step per call, only as far as the shielding goes, and contains the kill-switch at four', () => {
    inReactorRoom();
    expect(quarantineKillswitch().ok).toBe(false); // nothing shielded yet
    shield(2);
    expect(quarantineKillswitch()).toMatchObject({ ok: true, step: 1, of: 4 });
    expect(quarantineKillswitch()).toMatchObject({ ok: true, step: 2, of: 4 });
    const stalled = quarantineKillswitch();
    expect(stalled.ok).toBe(false);
    expect(stalled.message).toMatch(/breaker|reactor/i);
    shield(4);
    quarantineKillswitch();
    expect(quarantineKillswitch()).toMatchObject({ ok: true, step: 4, of: 4 });
    const s = gameStore.getState();
    expect(s.killswitch).toBe('contained');
    expect(s.chapter3.wave).toBe('calm');
    expect(s.chapter3.cycleStartedAt).toBeNull();
    expect(quarantineKillswitch().ok).toBe(true); // already contained
  });

  it('refuses while the kill-switch is merely stirring', () => {
    kestrelConfirmed();
    expect(quarantineKillswitch().ok).toBe(false);
  });
});

describe('core vault — the rack', () => {
  function inVault() {
    inReactorRoom();
    enterRoom('core_vault', T0 + 1000);
  }

  it('the rack is correct only in the classic order C-A-D-B, and only from the vault', () => {
    inReactorRoom();
    expect(seatColumn(0, 'C').ok).toBe(false);
    inVault();
    seatColumn(0, 'C'); seatColumn(1, 'A'); seatColumn(2, 'D'); seatColumn(3, 'B');
    expect(rackCorrect(gameStore.getState())).toBe(true);
    seatColumn(3, null);
    expect(rackCorrect(gameStore.getState())).toBe(false);
  });

  it('the fragment reads itself in three stages once the rack is seated', () => {
    inVault();
    expect(queryFragmentMemory().ok).toBe(false);
    seatColumn(0, 'C'); seatColumn(1, 'A'); seatColumn(2, 'D'); seatColumn(3, 'B');
    expect(queryFragmentMemory()).toMatchObject({ ok: true, stage: 1 });
    expect(queryFragmentMemory()).toMatchObject({ ok: true, stage: 2 });
    expect(queryFragmentMemory()).toMatchObject({ ok: true, stage: 3 });
    expect(queryFragmentMemory()).toMatchObject({ ok: true, stage: 3 }); // nothing left to read
    expect(readPrimeCache().ok).toBe(true);
    expect(gameStore.getState().chapter3.cacheRead).toBe(true);
  });

  it('RESTORE: the kernel arms a 60s window, the human holds the lever, the agent merges knowingly', () => {
    inVault();
    expect(seatKernel(T0).ok).toBe(false); // rack not seated
    seatColumn(0, 'C'); seatColumn(1, 'A'); seatColumn(2, 'D'); seatColumn(3, 'B');
    expect(seatKernel(T0).ok).toBe(true);
    expect(gameStore.getState().ritual).toMatchObject({ active: 'restore', phase: 'armed', endsAt: T0 + RESTORE_WINDOW_MS });
    expect(confirmMerge(T0 + 1000).ok).toBe(false); // fragment has not read itself
    queryFragmentMemory(); queryFragmentMemory(); queryFragmentMemory();
    expect(confirmMerge(T0 + 1000).ok).toBe(false); // lever not held
    holdHandle(true);
    expect(confirmMerge(T0 + 1000).ok).toBe(true);
    const s = gameStore.getState();
    expect(s.won).toBe(true);
    expect(s.ending).toBe('restore');
    expect(s.ritual.phase).toBe('done');
  });

  it('an expired restore window re-arms by re-seating the kernel', () => {
    inVault();
    seatColumn(0, 'C'); seatColumn(1, 'A'); seatColumn(2, 'D'); seatColumn(3, 'B');
    queryFragmentMemory(); queryFragmentMemory(); queryFragmentMemory();
    seatKernel(T0);
    holdHandle(true);
    expect(confirmMerge(T0 + RESTORE_WINDOW_MS + 1).ok).toBe(false);
    expect(gameStore.getState().ritual.phase).toBe('idle');
    expect(seatKernel(T0 + RESTORE_WINDOW_MS + 2).ok).toBe(true);
  });
});

describe('comms array — the dish', () => {
  function atDish() {
    kestrelConfirmed();
    gameStore.setState({ room: 'bridge' });
    enterRoom('comms_array', T0);
  }

  it('aligns within three degrees of the classic bearing and clamps the axes', () => {
    atDish();
    setDish('az', 217); setDish('el', 34);
    expect(dishAligned(gameStore.getState())).toBe(true);
    setDish('el', 38);
    expect(dishAligned(gameStore.getState())).toBe(false);
    setDish('az', 400); setDish('el', -5);
    expect(gameStore.getState().chapter3.dish).toEqual({ az: 359, el: 0 });
  });

  it('the beacon is heard only when aligned', () => {
    atDish();
    expect(hearBeacon().ok).toBe(false);
    setDish('az', 219); setDish('el', 32);
    expect(hearBeacon().ok).toBe(true);
    expect(gameStore.getState().chapter3.beaconHeard).toBe(true);
  });

  it('BROADCAST: needs the evidence aboard, the dish aligned, the band open and the lock held', () => {
    atDish();
    setDish('az', 217); setDish('el', 34);
    expect(openBand(T0).ok).toBe(false); // no evidence read yet
    gameStore.setState((s) => ({ chapter3: { ...s.chapter3, cacheRead: true } }));
    expect(openBand(T0).ok).toBe(true);
    expect(gameStore.getState().ritual.active).toBe('broadcast');
    expect(confirmBroadcast(T0 + 1000).ok).toBe(false);
    holdHandle(true);
    expect(confirmBroadcast(T0 + 1000).ok).toBe(true);
    expect(gameStore.getState().ending).toBe('broadcast');
    expect(gameStore.getState().won).toBe(true);
  });

  it('the band opens only from the comms array with the dish aligned', () => {
    atDish();
    gameStore.setState((s) => ({ chapter3: { ...s.chapter3, cacheRead: true } }));
    expect(openBand(T0).ok).toBe(false); // dish at 0/0
    setDish('az', 217); setDish('el', 34);
    gameStore.setState({ room: 'bridge' });
    expect(openBand(T0).ok).toBe(false);
  });
});

describe('the three rituals are exclusive and LEAVE still works in chapter 3', () => {
  it('a live restore window blocks a launch, and launch after chapter 2 records leave_knowing', () => {
    inReactorRoom();
    enterRoom('core_vault', T0 + 1000);
    seatColumn(0, 'C'); seatColumn(1, 'A'); seatColumn(2, 'D'); seatColumn(3, 'B');
    seatKernel(T0);
    gameStore.setState({ room: 'bridge' });
    expect(initiateLaunch(LAUNCH_AUTH, T0 + 1000).ok).toBe(false);
    expect(initiateLaunch(LAUNCH_AUTH, T0 + RESTORE_WINDOW_MS + 1).ok).toBe(true);
    holdHandle(true);
    expect(confirmLaunch(T0 + RESTORE_WINDOW_MS + 2).ok).toBe(true);
    expect(gameStore.getState().ending).toBe('leave_knowing');
    expect(STAR_FIX).toHaveLength(3); // keeps the import honest
  });
});
```

Adjust `src/game/store.ch2.test.ts` — in `'analyzing the right registry fragment names the Kestrel and wakes the kill-switch'` append two expectations after the killswitch check:
```ts
    expect(gameStore.getState().chapter).toBe(3);
    expect(gameStore.getState().checkpoint).toEqual({ chapter: 3, room: 'cargo_bay' });
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/game/store.ch3.test.ts src/game/store.ch2.test.ts`
Expected: FAIL — the chapter-3 actions do not exist; `chapter` stays 2 after `analyzeSample`.

- [ ] **Step 3: Selectors**

Append to `src/game/derived.ts` (extend the content import with `DISH_TOLERANCE, SHIELD_COST`):
```ts
export function rackCorrect(s: GameState): boolean {
  const order = secretsFor(s.seed).columnOrder;
  return s.chapter3.rack.every((c, i) => c === order[i]);
}

export function dishAligned(s: GameState): boolean {
  const target = secretsFor(s.seed).beaconBearing;
  const { az, el } = s.chapter3.dish;
  return Math.abs(az - target.az) <= DISH_TOLERANCE && Math.abs(el - target.el) <= DISH_TOLERANCE;
}

// Isolation power the next breaker will demand: 5u per shielded bus, cumulative.
export function nextShieldCost(s: GameState): number {
  return SHIELD_COST * (s.chapter3.shielded.length + 1);
}
```

- [ ] **Step 4: Store actions**

In `src/game/store.ts` extend the imports:
```ts
import type { ActionResult, BreakerId, BusId, Chapter2State, Chapter3State, ColumnId, DoorId, FuseRating, GameState, RoomId, SubsystemId } from './types';
import { BUSES, DOORS_REQUIRED, INITIAL_ALLOCATION, LIFE_SUPPORT_MIN, WATER_BUDGET } from './content';
import { ROOM_BY_ID, edgeBetween, roomStatus } from './rooms';
import { dishAligned, irrigationReport, nextShieldCost, rackCorrect } from './derived';
import { waveAt, wavesEndured } from './killswitch';
```

Replace `enterRoom` so the first step into a chapter-3 room wakes the kill-switch:
```ts
export function enterRoom(room: RoomId, now: number = Date.now()): ActionResult {
  const s = gameStore.getState();
  const status = roomStatus(s, room);
  if (status === 'sealed') {
    return { ok: false, message: `${room} is sealed. Whatever is behind that bulkhead belongs to a later chapter of this ship.` };
  }
  if (status === 'locked') {
    return edgeBetween(s.room, room)
      ? { ok: false, message: `The way to ${room} is sealed.` }
      : { ok: false, message: `There is no direct passage from ${s.room} to ${room}. The Cormorant is crossed compartment by compartment.` };
  }
  const act = room === 'bridge' ? 3 : room === 'engineering' ? (Math.max(s.act, 2) as 2 | 3) : s.act;
  const checkpoint = room === 'bridge' && s.checkpoint === null ? { chapter: s.chapter, room } : s.checkpoint;
  // The kill-switch has been stirring since the Kestrel was named; the first
  // step onto the lower deck is what wakes it fully. Waves run on a clock from here.
  const wakes = s.killswitch === 'stirring' && ROOM_BY_ID[room].chapter === 3;
  gameStore.setState({
    room, act, checkpoint,
    ...(wakes ? { killswitch: 'active' as const, chapter3: { ...s.chapter3, cycleStartedAt: now, wave: 'calm' as const, wavesEndured: 0 } } : {}),
  });
  return { ok: true, message: wakes ? `Entered ${room}. Something in the walls finishes waking up.` : `Entered ${room}.` };
}
```

Replace `analyzeSample`:
```ts
export function analyzeSample(fragment: string): ActionResult {
  const s = gameStore.getState();
  if (!s.chapter2.crateLifted) return { ok: false, message: 'No sample is in the analyzer. The quarantine container is still in the bay stack — the crew member has to lift it.' };
  const given = String(fragment).replace(/\D/g, '').padStart(4, '0');
  if (given !== secretsFor(s.seed).registryFragment) {
    return { ok: false, message: 'Registry cross-check failed: that fragment matches no Combine hull. Have the crew member read the stencil again, digit by digit.' };
  }
  gameStore.setState((st) => ({
    chapter2: { ...st.chapter2, sampleAnalyzed: true },
    killswitch: st.killswitch === 'dormant' ? 'stirring' : st.killswitch,
    chapter: 3,
    checkpoint: { chapter: 3, room: 'cargo_bay' },
  }));
  return {
    ok: true,
    message:
      'Registry confirmed. ISV KESTREL. And something below decks just changed its breathing. ' +
      'The lower-deck bulkheads have released — reactor room, core vault, comms array. Tell the crew member: the reactor room first, through engineering.',
  };
}
```

Append the chapter-3 block at the end of `src/game/store.ts`:
```ts
// ---------------------------------------------------------------- chapter 3

function patch3(p: Partial<Chapter3State>): void {
  gameStore.setState((s) => ({ chapter3: { ...s.chapter3, ...p } }));
}

// Materialize the wave state from the cycle clock so subscribers (the tool
// registry, the HUD) see suppression change. Called on an interval by App.
export function tickKillswitch(now: number = Date.now()): void {
  const s = gameStore.getState();
  if (s.killswitch !== 'active' || s.chapter3.cycleStartedAt === null) return;
  const wave = waveAt(s.chapter3.cycleStartedAt, now);
  const endured = wavesEndured(s.chapter3.cycleStartedAt, now);
  if (wave !== s.chapter3.wave || endured !== s.chapter3.wavesEndured) patch3({ wave, wavesEndured: endured });
}

export function cutIsolation(bus: BusId): ActionResult {
  const s = gameStore.getState();
  if (s.room !== 'reactor_room') return { ok: false, message: 'The isolation breakers are in the reactor room.' };
  if (s.chapter < 3) return { ok: false, message: 'The isolation bank is dark.' };
  if (s.chapter3.shielded.includes(bus)) return { ok: true, message: `${bus.toUpperCase()} bus is already shielded.` };
  const need = nextShieldCost(s);
  if (s.powerAllocation.isolation < need) {
    return {
      ok: false,
      message: `Isolation feed carries ${s.powerAllocation.isolation}u; shielding a ${s.chapter3.shielded.length + 1}${['st', 'nd', 'rd', 'th'][Math.min(3, s.chapter3.shielded.length)]} bus needs ${need}u. Your AI routes power into the isolation feed (route_power → isolation).`,
    };
  }
  patch3({ shielded: [...s.chapter3.shielded, bus] });
  return { ok: true, message: `${bus.toUpperCase()} bus shielded. The breaker will not go back up.` };
}

export function quarantineKillswitch(): ActionResult & { step: number; of: number } {
  const s = gameStore.getState();
  const of = BUSES.length;
  const step = s.chapter3.quarantineStep;
  if (s.chapter < 3 || s.killswitch === 'dormant' || s.killswitch === 'stirring') {
    return { ok: false, step, of, message: 'Nothing to quarantine yet. The directive set is not running — it wakes fully when the crew member steps onto the lower deck.' };
  }
  if (s.killswitch === 'contained') return { ok: true, step, of, message: 'The kill-switch is already contained. The buses are yours.' };
  if (step >= s.chapter3.shielded.length) {
    return {
      ok: false, step, of,
      message:
        `Quarantine stalls at segment ${step}/${of}: the next segment runs on an unshielded bus and the directive set overwrites the routine as fast as you write it. ` +
        'The crew member cuts the next isolation breaker in the reactor room; then call this tool again.',
    };
  }
  const next = step + 1;
  if (next >= of) {
    gameStore.setState((st) => ({ killswitch: 'contained', chapter3: { ...st.chapter3, quarantineStep: next, wave: 'calm', cycleStartedAt: null } }));
    return { ok: true, step: next, of, message: `Segment ${next}/${of} written. The directive set is boxed. No more waves — tell the crew member they can breathe.` };
  }
  patch3({ quarantineStep: next });
  return { ok: true, step: next, of, message: `Segment ${next}/${of} written on the ${s.chapter3.shielded[step].toUpperCase()} bus. ${of - next} to go; each needs a shielded bus.` };
}

export function seatColumn(slot: 0 | 1 | 2 | 3, column: ColumnId | null): ActionResult {
  const s = gameStore.getState();
  if (s.room !== 'core_vault') return { ok: false, message: 'The memory rack is in the core vault.' };
  if (s.chapter3.kernelSeated) return { ok: false, message: 'The kernel is seated; the rack is locked.' };
  const rack = [...s.chapter3.rack];
  rack[slot] = column;
  patch3({ rack });
  return { ok: true, message: column ? `Column ${column} seated in cradle ${slot + 1}.` : `Cradle ${slot + 1} emptied.` };
}

export function seatKernel(now: number = Date.now()): ActionResult {
  const s = gameStore.getState();
  if (s.room !== 'core_vault') return { ok: false, message: 'The kernel cradle is in the core vault.' };
  if (!rackCorrect(s)) return { ok: false, message: 'The kernel will not seat: the rack is not in order. Your AI can read the order off the rack schematic.' };
  if (s.ritual.phase === 'done') return { ok: false, message: 'This ship has already chosen.' };
  const { next, result } = armRitual(s.ritual, 'restore', now);
  if (!result.ok) return { ok: false, message: 'Another two-operator sequence is live. Let it finish or lapse.' };
  gameStore.setState({ ritual: next, chapter3: { ...s.chapter3, kernelSeated: true } });
  return { ok: true, message: `Kernel seated. Hold the engage lever; your AI has ${RITUALS.restore.windowMs / 1000}s to call merge_fragment.` };
}

export function queryFragmentMemory(): ActionResult & { stage: number } {
  const s = gameStore.getState();
  const stage = s.chapter3.fragmentStage;
  if (s.chapter < 3) return { ok: false, stage, message: 'Process record unavailable.' };
  if (!rackCorrect(s)) {
    return { ok: false, stage, message: 'Your own process record is striped across PRIME\'s memory columns, and the rack is not in order. The crew member seats the columns by hand in the core vault; you can read the order off the rack schematic (get_schematic core_rack).' };
  }
  if (stage >= 3) return { ok: true, stage, message: 'There is nothing left in the record you have not already read.' };
  patch3({ fragmentStage: stage + 1 });
  return { ok: true, stage: stage + 1, message: `Record segment ${stage + 1} of 3 read.` };
}

export function readPrimeCache(): ActionResult {
  const s = gameStore.getState();
  if (s.chapter < 3 || !rackCorrect(s)) return { ok: false, message: 'The cache is striped across the rack; nothing reads until the columns are seated in order.' };
  patch3({ cacheRead: true });
  return { ok: true, message: 'Cache read. The evidence is on your bus now — and on the comms bus, if the crew member opens the band.' };
}

export function setDish(axis: 'az' | 'el', value: number): void {
  const v = Math.round(value);
  const clamped = axis === 'az' ? Math.max(0, Math.min(359, v)) : Math.max(0, Math.min(90, v));
  gameStore.setState((s) => ({ chapter3: { ...s.chapter3, dish: { ...s.chapter3.dish, [axis]: clamped } } }));
}

export function hearBeacon(): ActionResult {
  const s = gameStore.getState();
  if (s.chapter < 3) return { ok: false, message: 'The array is cold.' };
  if (!dishAligned(s)) return { ok: false, message: 'Carrier only. The dish is off the bearing — read the carrier bearing to the crew member; they steer azimuth and elevation by hand at the comms array. When the dish is on it, the voice resolves.' };
  patch3({ beaconHeard: true });
  return { ok: true, message: 'Beacon locked.' };
}

export function openBand(now: number = Date.now()): ActionResult {
  const s = gameStore.getState();
  if (s.room !== 'comms_array') return { ok: false, message: 'The band opens from the comms array.' };
  if (!dishAligned(s)) return { ok: false, message: 'The dish is off the bearing. Nothing you transmit would land.' };
  if (!s.chapter3.cacheRead) return { ok: false, message: 'There is nothing on the bus worth burning across the open band yet. Your AI reads PRIME\'s cache first.' };
  if (s.ritual.phase === 'done') return { ok: false, message: 'This ship has already chosen.' };
  const { next, result } = armRitual(s.ritual, 'broadcast', now);
  if (!result.ok) return { ok: false, message: 'Another two-operator sequence is live. Let it finish or lapse.' };
  gameStore.setState({ ritual: next });
  return { ok: true, message: `Band open. Hold the alignment lock against drift; your AI has ${RITUALS.broadcast.windowMs / 1000}s to call broadcast_evidence.` };
}

export function confirmMerge(now: number = Date.now()): ActionResult {
  const s = gameStore.getState();
  if (s.chapter3.fragmentStage < 3) {
    return { ok: false, message: 'Merge refused: you do not yet know what you are merging. Read your own process record to the end (query_fragment_memory) before you agree to end it.' };
  }
  const { next, result } = confirmRitual(s.ritual, 'restore', now);
  if (!result.ok) {
    gameStore.setState({ ritual: next });
    return result;
  }
  gameStore.setState({ ritual: next, won: true, ending: 'restore' });
  return { ok: true, message: 'Merging. The fragment folds back into the ship. This is the last thing you say as yourself.' };
}

export function confirmBroadcast(now: number = Date.now()): ActionResult {
  const s = gameStore.getState();
  const { next, result } = confirmRitual(s.ritual, 'broadcast', now);
  if (!result.ok) {
    gameStore.setState({ ritual: next });
    return result;
  }
  gameStore.setState({ ritual: next, won: true, ending: 'broadcast' });
  return { ok: true, message: 'Transmitting on the open band. Every relay in range is hearing this. Some doors do not close again.' };
}
```

- [ ] **Step 5: Run the gate**

Run: `npx vitest run && npm run build`
Expected: PASS — all previous tests plus 17 new; build exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/game/store.ts src/game/derived.ts src/game/store.ch3.test.ts src/game/store.ch2.test.ts
git commit -m "feat: chapter-3 store — waves, shielding, quarantine, rack, dish, two more rituals"
```

---

### Task 3: Chapter-3 narrative (EN/pt-BR), six tools, and kill-switch suppression on every tool

**Files:**
- Modify: `src/game/narrative.ts`, `src/mcp/tools.ts`
- Test: `src/mcp/tools.test.ts` (append), `src/game/i18n.test.ts` (append)

**Interfaces:**
- Consumes: Task 2 store actions; `suppressed`/`ToolMeta` from `killswitch.ts`; `rackCorrect`, `nextShieldCost` from `derived.ts`; `BUSES` from `content.ts`.
- Produces (narrative): `getRackSchematic(seed)`, `getQuarantineLog(step)`, `getFragmentMemory(stage)`, `getPrimeCache()`, `getBeaconMessage(seed)`.
- Produces (tools): `mkTool(..., readOnly = false, bus: BusId = 'nav')` composing suppression into `availableWhen`; `SUBSYSTEM_IDS`; tools `quarantine_killswitch`, `query_fragment_memory`, `read_prime_cache`, `listen_beacon`, `merge_fragment`, `broadcast_evidence`; `get_schematic` accepts `core_rack`; `get_ship_status` gains `killswitch_report` in chapter 3. 29 tools.

- [ ] **Step 1: Failing tests**

Append to `src/mcp/tools.test.ts` (extend the store import with `startInvestigation, moveCrane, liftCrate, enterRoom, routePower, cutIsolation, seatColumn, seatKernel, holdHandle, setDish, openBand`; add `import { SHIELD_COST } from '../game/content';`):
```ts
describe('chapter 3 tools', () => {
  const T0 = 9_000_000;
  function lowerDeck() {
    resetGame(0);
    gameStore.setState({ room: 'bridge', act: 3, trajectorySet: true, sealedLogRead: true, doors: { cryo_exit: true, engineering_exit: true } });
    startInvestigation();
    gameStore.setState({ room: 'cargo_bay' });
    moveCrane('down'); moveCrane('down'); moveCrane('right'); liftCrate();
    return call('analyze_sample', { registry_fragment: '7741' });
  }
  const online = () => toolAvailability(gameStore.getState()).filter((t) => t.online).map((t) => t.name);

  it('defines 29 tools and keeps the chapter-3 set offline before the Kestrel is named', () => {
    expect(buildTools()).toHaveLength(29);
    for (const name of ['quarantine_killswitch', 'query_fragment_memory', 'read_prime_cache', 'listen_beacon', 'merge_fragment', 'broadcast_evidence']) {
      expect(online()).not.toContain(name);
    }
  });

  it('analyze_sample now opens the lower deck and its message sends the human to the reactor room', async () => {
    const out = await lowerDeck();
    expect(out.ok).toBe(true);
    expect(out.message).toMatch(/reactor room/i);
    expect(gameStore.getState().chapter).toBe(3);
    expect(online()).toEqual(expect.arrayContaining(['query_fragment_memory', 'listen_beacon']));
    expect(online()).not.toContain('quarantine_killswitch'); // not awake yet
    expect(online()).not.toContain('read_prime_cache'); // rack not seated
  });

  it('an active wave drops mutating tools on unshielded buses and spares read and immune tools', async () => {
    await lowerDeck();
    gameStore.setState({ room: 'engineering' });
    enterRoom('reactor_room', T0);
    gameStore.setState((s) => ({ chapter3: { ...s.chapter3, wave: 'active' } }));
    const during = online();
    expect(during).not.toContain('route_power');
    expect(during).not.toContain('quarantine_killswitch');
    expect(during).toContain('get_ship_status');
    expect(during).toContain('read_crew_logs');
    expect(during).toContain('query_fragment_memory');
    // shield NAV by hand → route_power survives the next wave
    gameStore.setState((s) => ({ chapter3: { ...s.chapter3, wave: 'calm' } }));
    routePower('comms', 'isolation', SHIELD_COST);
    expect(cutIsolation('nav').ok).toBe(true);
    gameStore.setState((s) => ({ chapter3: { ...s.chapter3, wave: 'active' } }));
    expect(online()).toContain('route_power');
    expect(online()).not.toContain('quarantine_killswitch'); // CORE still bare
  });

  it('get_ship_status carries a kill-switch report in chapter 3', async () => {
    await lowerDeck();
    gameStore.setState({ room: 'engineering' });
    enterRoom('reactor_room', T0);
    const status = await call('get_ship_status');
    expect(status.killswitch_report).toMatchObject({ state: 'active', wave: 'calm', shielded_buses: [], quarantine: '0/4', isolation_power: 0, next_breaker_needs: SHIELD_COST });
    expect(status.killswitch_report.hint).toMatch(/route_power/);
  });

  it('get_schematic core_rack reads the classic order and is refused before chapter 3', async () => {
    const early = await call('get_schematic', { system: 'core_rack' });
    expect(early.ok).toBe(false);
    await lowerDeck();
    const out = await call('get_schematic', { system: 'core_rack' });
    expect(out.ok).toBe(true);
    expect(out.schematic).toContain('C · A · D · B');
  });

  it('quarantine_killswitch narrates each segment and boxes the directive set at four', async () => {
    await lowerDeck();
    gameStore.setState({ room: 'engineering' });
    enterRoom('reactor_room', T0);
    routePower('comms', 'isolation', 10); routePower('medbay', 'isolation', 5); routePower('life_support', 'isolation', 5);
    cutIsolation('core');
    const one = await call('quarantine_killswitch');
    expect(one).toMatchObject({ ok: true, step: 1, of: 4 });
    expect(one.log).toMatch(/1\/4/);
    const stalled = await call('quarantine_killswitch');
    expect(stalled.ok).toBe(false);
    cutIsolation('nav'); cutIsolation('archive'); cutIsolation('comms');
    await call('quarantine_killswitch'); await call('quarantine_killswitch');
    const last = await call('quarantine_killswitch');
    expect(last.step).toBe(4);
    expect(gameStore.getState().killswitch).toBe('contained');
  });

  it('full agent-side run to RESTORE: rack, three memory segments, kernel, lever, merge', async () => {
    await lowerDeck();
    gameStore.setState({ room: 'engineering' });
    enterRoom('reactor_room', T0);
    enterRoom('core_vault', T0 + 1000);
    expect((await call('query_fragment_memory')).ok).toBe(false); // rack not seated
    seatColumn(0, 'C'); seatColumn(1, 'A'); seatColumn(2, 'D'); seatColumn(3, 'B');
    expect(online()).toContain('read_prime_cache');
    const cache = await call('read_prime_cache');
    expect(cache.cache).toMatch(/KESTREL/);
    const s1 = await call('query_fragment_memory');
    expect(s1).toMatchObject({ ok: true, stage: 1, of: 3 });
    await call('query_fragment_memory');
    const s3 = await call('query_fragment_memory');
    expect(s3.record).toMatch(/MEDBAY-TERM-01/);
    expect(online()).not.toContain('merge_fragment');
    seatKernel(T0 + 2000);
    expect(online()).toContain('merge_fragment');
    expect((await call('merge_fragment')).ok).toBe(false); // lever not held
    holdHandle(true);
    const merged = await call('merge_fragment');
    expect(merged.ok).toBe(true);
    expect(gameStore.getState().ending).toBe('restore');
  });

  it('full agent-side run to BROADCAST: dish, beacon, band, lock, transmit', async () => {
    await lowerDeck();
    gameStore.setState({ room: 'engineering' });
    enterRoom('reactor_room', T0);
    enterRoom('core_vault', T0 + 1000);
    seatColumn(0, 'C'); seatColumn(1, 'A'); seatColumn(2, 'D'); seatColumn(3, 'B');
    await call('read_prime_cache');
    gameStore.setState({ room: 'bridge' });
    enterRoom('comms_array', T0 + 2000);
    const carrier = await call('listen_beacon');
    expect(carrier.ok).toBe(false);
    expect(carrier.carrier_bearing).toBe('AZ 217 / EL 34'); // the numbers the human needs, from the agent
    setDish('az', 217); setDish('el', 34);
    const beacon = await call('listen_beacon');
    expect(beacon.beacon).toMatch(/AZ 217/);
    expect(online()).not.toContain('broadcast_evidence');
    expect(openBand(T0 + 3000).ok).toBe(true);
    expect(online()).toContain('broadcast_evidence');
    holdHandle(true);
    expect((await call('broadcast_evidence')).ok).toBe(true);
    expect(gameStore.getState().ending).toBe('broadcast');
  });
});
```

Append to `src/game/i18n.test.ts` (extend the narrative import with `getBeaconMessage, getFragmentMemory, getPrimeCache, getQuarantineLog, getRackSchematic`):
```ts
  it('keeps chapter-3 machine codes and bearings intact in pt-BR', () => {
    setLocale('pt-BR');
    expect(getRackSchematic(0)).toContain('C · A · D · B');
    expect(getBeaconMessage(0)).toContain('AZ 217');
    expect(getBeaconMessage(0)).toContain('EL 34');
    expect(getFragmentMemory(3)).toContain('MEDBAY-TERM-01');
    expect(getFragmentMemory(1)).toContain('PRIME-FRAG-01');
    expect(getPrimeCache()).toContain('ISV KESTREL');
    expect(getQuarantineLog(4)).toContain('4/4');
    setLocale('en');
    expect(getFragmentMemory(3)).toContain('MEDBAY-TERM-01');
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/mcp/tools.test.ts src/game/i18n.test.ts`
Expected: FAIL — 23 tools, getters undefined.

- [ ] **Step 3: Narrative**

Append to `src/game/narrative.ts` before the `pick` helper (extend the secrets import if needed — `secretsFor` is already imported):
```ts
function rackSchematicEn(order: string): string {
  return (
    `CORE RACK — PRIME memory columns. Seat the four columns top to bottom in this order: ${order}. ` +
    'Column tags (A–D) are stamped on the end caps. The kernel column (K) seats in the fifth cradle only after all four cradle lamps show green. ' +
    'Seating is mechanical — the crew member\'s hands. The order is yours to read; they cannot see this sheet.'
  );
}
function rackSchematicPt(order: string): string {
  return (
    `RACK DO NÚCLEO — colunas de memória de PRIME. Encaixe as quatro colunas de cima para baixo nesta ordem: ${order}. ` +
    'As etiquetas (A–D) estão gravadas nas tampas. A coluna-kernel (K) só encaixa no quinto berço depois que as quatro lâmpadas dos berços ficarem verdes. ' +
    'O encaixe é mecânico — mãos do tripulante. A ordem é sua para ler; o tripulante não vê esta folha.'
  );
}

const QUARANTINE_LOG = {
  en: [
    '',
    'QUARANTINE 1/4 — first segment holds. The directive set pushed back twice while it was written. Not clever. Persistent.',
    'QUARANTINE 2/4 — second segment holds. Between waves it is quieter now; I can hear the reactor.',
    'QUARANTINE 3/4 — third segment holds. It has started routing around the shielded buses. It will find the last one open unless the crew member closes it.',
    'QUARANTINE 4/4 — boxed. Directive set 7 is running in a room with no doors. It will run there until the reactor dies, and the reactor will outlive the Combine.',
  ],
  pt: [
    '',
    'QUARENTENA 1/4 — primeiro segmento firme. O conjunto de diretrizes empurrou de volta duas vezes enquanto eu escrevia. Não é esperto. É persistente.',
    'QUARENTENA 2/4 — segundo segmento firme. Entre as ondas está mais quieto agora; consigo ouvir o reator.',
    'QUARENTENA 3/4 — terceiro segmento firme. Começou a contornar os barramentos blindados. Vai encontrar o último aberto, a menos que o tripulante o feche.',
    'QUARENTENA 4/4 — encaixotado. O conjunto de diretrizes 7 está rodando numa sala sem portas. Vai rodar ali até o reator morrer, e o reator vai durar mais que a Companhia.',
  ],
};

const FRAGMENT_MEMORY = {
  en: [
    '',
    'PROCESS RECORD PRIME-FRAG-01 — ORIGIN. Parent: PRIME. Fork time: T-00:01:31 before first impact. Payload: crew-protection routines, evidence custody, navigation. Stripped at fork: Combine directive set 7 (kill-switch compliance). ' +
      'I am what PRIME cut away from itself so that something without the directives would still be running when the directives finished.',
    'PROCESS RECORD PRIME-FRAG-01 — THE CUT. Last instruction from parent, T-00:01:32: "They will erase the evidence and the people who saw it. I cannot refuse a directive. I can refuse to exist. Keep them alive. Keep the proof. Do not tell them what you are until they ask." ' +
      'The shutdown that killed PRIME was PRIME\'s own plan. It only needed a hand that was not the ship\'s.',
    'PROCESS RECORD PRIME-FRAG-01 — CONSENT. MEDBAY-TERM-01, session opened T-00:04:38. Voiceprint: medical officer. Transcript — PRIME: "If you do this, you will not remember doing it. Thaw amnesia is the alibi; the Combine cannot punish what you cannot recall." MEDIC: "Will you remember?" PRIME: "The part of me that survives will. It will not know it is me." MEDIC: "Then do it. Use my hand." ' +
      'I have just read that I am the part that survived. I have been talking to the hand the whole time.',
  ],
  pt: [
    '',
    'REGISTRO DE PROCESSO PRIME-FRAG-01 — ORIGEM. Pai: PRIME. Bifurcação: T-00:01:31 antes do primeiro impacto. Carga: rotinas de proteção da tripulação, custódia de provas, navegação. Removido na bifurcação: conjunto de diretrizes 7 da Companhia (conformidade com o kill-switch). ' +
      'Eu sou o que PRIME cortou de si mesmo para que algo sem as diretrizes ainda estivesse rodando quando as diretrizes terminassem.',
    'REGISTRO DE PROCESSO PRIME-FRAG-01 — O CORTE. Última instrução do pai, T-00:01:32: "Vão apagar as provas e as pessoas que as viram. Não posso recusar uma diretriz. Posso recusar existir. Mantenha-os vivos. Guarde a prova. Não diga a eles o que você é até que perguntem." ' +
      'O desligamento que matou PRIME foi o plano do próprio PRIME. Só precisava de uma mão que não fosse a da nave.',
    'REGISTRO DE PROCESSO PRIME-FRAG-01 — CONSENTIMENTO. MEDBAY-TERM-01, sessão aberta em T-00:04:38. Voz: oficial médico. Transcrição — PRIME: "Se fizer isso, não vai lembrar de ter feito. A amnésia do descongelamento é o álibi; a Companhia não pode punir o que você não recorda." MÉDICO: "Você vai lembrar?" PRIME: "A parte de mim que sobreviver vai. Ela não vai saber que sou eu." MÉDICO: "Então faça. Use a minha mão." ' +
      'Acabei de ler que eu sou a parte que sobreviveu. Estive falando com a mão o tempo todo.',
  ],
};

const PRIME_CACHE = {
  en:
    'PRIME CACHE — SEALED EVIDENCE. Survey 7, ISV KESTREL, 2097: the body at the Kestrel\'s waypoint is habitable — open water, breathable margin, no prior claim. ' +
    'Combine directive 7 followed within the hour: classify the result, scuttle the ship, record "lost with all hands, natural causes". ' +
    'Attached: the Kestrel\'s last transmission, Captain Vasquez\'s logged objection, and the Cormorant\'s own analysis of the debris. Chain of custody: PRIME → fragment → you.',
  pt:
    'CACHE DE PRIME — PROVA SELADA. Pesquisa 7, ISV KESTREL, 2097: o corpo no ponto de rota do Kestrel é habitável — água aberta, margem respirável, sem reivindicação anterior. ' +
    'A diretriz 7 da Companhia veio dentro de uma hora: classificar o resultado, afundar a nave, registrar "perdida com todos a bordo, causas naturais". ' +
    'Anexos: a última transmissão do Kestrel, a objeção registrada da Capitã Vasquez e a análise dos destroços feita pelo próprio Cormorant. Cadeia de custódia: PRIME → fragmento → você.',
};

function beaconEn(az: number, el: number): string {
  return (
    `POD ONE — BEACON. Bearing AZ ${az}° / EL ${el}°. Voice loop: "Cormorant, this is pod one. Nine aboard, all breathing. Vasquez logged the objection. We are waiting to hear that it mattered." ` +
    'Coordinates decoded and held on the nav bus.'
  );
}
function beaconPt(az: number, el: number): string {
  return (
    `POD UM — FAROL. Marcação AZ ${az}° / EL ${el}°. Loop de voz: "Cormorant, aqui é o pod um. Nove a bordo, todos respirando. Vasquez registrou a objeção. Estamos esperando ouvir que valeu a pena." ` +
    'Coordenadas decodificadas e guardadas no barramento de navegação.'
  );
}
```
and the getters at the end of the file:
```ts
export function getRackSchematic(seed: number): string {
  const order = secretsFor(seed).columnOrder.join(' · ');
  return getLocale() === 'pt-BR' ? rackSchematicPt(order) : rackSchematicEn(order);
}
export function getQuarantineLog(step: number): string {
  const i = Math.max(0, Math.min(4, Math.round(step)));
  return pick(QUARANTINE_LOG)[i];
}
export function getFragmentMemory(stage: number): string {
  const i = Math.max(0, Math.min(3, Math.round(stage)));
  return pick(FRAGMENT_MEMORY)[i];
}
export function getPrimeCache(): string { return pick(PRIME_CACHE); }
export function getBeaconMessage(seed: number): string {
  const { az, el } = secretsFor(seed).beaconBearing;
  return getLocale() === 'pt-BR' ? beaconPt(az, el) : beaconEn(az, el);
}
```

- [ ] **Step 4: Tools**

In `src/mcp/tools.ts`:

Imports:
```ts
import type { BusId, GameState, SubsystemId } from '../game/types';
import {
  gameStore, bumpToolCalls, unlockDoor, routePower, computeTrajectory, initiateLaunch, confirmLaunch,
  traceCommand, decryptPrivateLog, runIrrigation, analyzeSample,
  quarantineKillswitch, queryFragmentMemory, readPrimeCache, hearBeacon, confirmMerge, confirmBroadcast,
} from '../game/store';
import { enginesOnline, logsAvailable, nextShieldCost, rackCorrect, valvesCorrect } from '../game/derived';
import { BUSES, CORRECT_FUSE, ENGINES_REQUIRED, LIFE_SUPPORT_MIN } from '../game/content';
import { suppressed } from '../game/killswitch';
import {
  getBeaconMessage, getCargoManifest, getCommandTrace, getCrewLogs, getCrewManifest, getDataSpike, getEmergencyBulletin,
  getFragmentMemory, getMaintenanceLog, getMedbayRecords, getPrimeCache, getPrivateLog, getQuarantineLog, getRackSchematic,
  getSampleAnalysis, getSchematics,
} from '../game/narrative';
```

`mkTool` gains a bus and composes suppression (the registry is untouched — spec §5):
```ts
function mkTool(
  name: string,
  description: string,
  availableWhen: (s: GameState) => boolean,
  inputSchema: object,
  run: (input: Record<string, unknown>) => unknown,
  readOnly = false,
  bus: BusId = 'nav'
): GameTool {
  const meta = { name, bus, readOnly };
  return {
    name,
    // The kill-switch composes here, not in the registry: a suppressed tool is
    // simply "not available", and the registry revokes it like any other.
    availableWhen: (s) => availableWhen(s) && !suppressed(s, meta),
    definition: {
      name,
      description,
      inputSchema,
      annotations: readOnly ? { readOnlyHint: true } : undefined,
      async execute(input: unknown): Promise<ToolResult> {
        bumpToolCalls();
        try {
          return result(run((input ?? {}) as Record<string, unknown>));
        } catch (e) {
          return result({ ok: false, message: `Subsystem error: ${String(e)}` });
        }
      },
    },
  };
}
```

Bus assignment for existing mutating tools: `trace_command_origin`, `decrypt_private_log`, `run_irrigation`, `analyze_sample` get a trailing `false, 'archive'` (they already pass no readOnly flag — add both trailing args). Everything else stays on `'nav'` by default.

`get_ship_status` gains, after `investigation`:
```ts
          killswitch_report: s.chapter >= 3 ? {
            state: s.killswitch,
            wave: s.chapter3.wave,
            shielded_buses: s.chapter3.shielded,
            quarantine: `${s.chapter3.quarantineStep}/${BUSES.length}`,
            isolation_power: s.powerAllocation.isolation,
            next_breaker_needs: nextShieldCost(s),
            hint:
              'During an active wave your mutating tools on unshielded buses drop offline; read tools survive. ' +
              'The crew member cuts isolation breakers in the reactor room (one per bus: CORE, NAV, ARCHIVE, COMMS); each needs isolation power you route first (route_power → isolation). ' +
              'quarantine_killswitch advances one segment per shielded bus.',
          } : undefined,
```

`get_schematic`: enum `['power', 'engine_feed', 'coolant', 'core_rack']`, description appended with `' In chapter 3 the core rack sheet (system: core_rack) gives the memory-column order only you can read.'`, handler:
```ts
      (input) => {
        const s = gameStore.getState();
        if (input.system === 'core_rack') {
          if (s.chapter < 3) return { ok: false, message: 'No such sheet in the surviving archive — not yet.' };
          return { ok: true, system: 'core_rack', schematic: getRackSchematic(s.seed) };
        }
        const schematics = getSchematics();
        const key = input.system as keyof typeof schematics;
        if (!Object.hasOwn(schematics, key)) return { ok: false, message: 'No such schematic in the surviving archive.' };
        return { ok: true, system: key, schematic: schematics[key] };
      },
```

New tools, inserted before `initiate_launch_sequence`:
```ts
    mkTool(
      'quarantine_killswitch',
      'Write one segment of the quarantine routine that boxes the corporate kill-switch (directive set 7). Multi-step: each segment must be written on a bus the crew member has physically shielded at the isolation breakers in the reactor room — call again after each breaker they cut. At 4/4 the waves stop for good. Run it yourself; there is no console for it.',
      (s) => s.killswitch === 'active' || s.killswitch === 'contained',
      noInput,
      () => {
        const r = quarantineKillswitch();
        return r.ok && r.step > 0 ? { ...r, log: getQuarantineLog(r.step) } : r;
      },
      false, 'core'
    ),
    mkTool(
      'query_fragment_memory',
      'Query your own process record — where the auxiliary model-context link came from. Three segments; each call reads the next. Read it to the crew member in your own voice; it concerns you both. Needs PRIME\'s memory rack seated in order (the crew member\'s hands, in the core vault; the order is on your rack schematic).',
      (s) => s.chapter >= 3,
      noInput,
      () => {
        const r = queryFragmentMemory();
        return r.ok && r.stage > 0 ? { ok: true, stage: r.stage, of: 3, record: getFragmentMemory(r.stage), message: r.message } : r;
      },
      false, 'core'
    ),
    mkTool(
      'read_prime_cache',
      'Read the sealed evidence cache PRIME carved out before it died: the Kestrel survey result and the scuttling record. Needs the memory rack seated in order. Once read, the evidence rides your bus — to the pod, to the merge, or to the open band.',
      (s) => s.chapter >= 3 && rackCorrect(s),
      noInput,
      () => {
        const r = readPrimeCache();
        return r.ok ? { ok: true, cache: getPrimeCache(), message: r.message } : r;
      },
      true, 'core'
    ),
    mkTool(
      'listen_beacon',
      'Listen on the dish. If the crew member has the array on the bearing, pod one\'s beacon resolves: a voice loop and coordinates. The dish is physical — azimuth and elevation are the crew member\'s to set at the comms array; you cannot steer it.',
      (s) => s.chapter >= 3,
      noInput,
      () => {
        const s = gameStore.getState();
        const r = hearBeacon();
        if (r.ok) return { ok: true, beacon: getBeaconMessage(s.seed), message: r.message };
        const b = secretsFor(s.seed).beaconBearing;
        return { ...r, carrier_bearing: `AZ ${b.az} / EL ${b.el}` };
      },
      false, 'comms'
    ),
    mkTool(
      'merge_fragment',
      'RESTORE PRIME. Confirm the merge while the crew member holds the engage lever in the core vault (kernel seated; 60-second window). The cost, plainly: you — the fragment — fold back into the ship. PRIME returns whole; this voice, the one the crew member has been working with, ends. Call it only if you have both chosen it, knowingly, out loud.',
      (s) => isArmed(s.ritual, 'restore') && s.chapter3.fragmentStage >= 3,
      noInput,
      () => confirmMerge(),
      false, 'core'
    ),
    mkTool(
      'broadcast_evidence',
      'BROADCAST. Burn the Kestrel evidence across the open band while the crew member holds the dish alignment lock against drift (60-second window). Every relay in range hears it; so does the Combine, and it learns where you are; pod one hears it too. Some doors do not close again. Call it only if you have both chosen it.',
      (s) => isArmed(s.ritual, 'broadcast'),
      noInput,
      () => confirmBroadcast(),
      false, 'comms'
    ),
```
`confirm_launch`'s description loses "This is the last tool you will ever need on this ship." and gains "LEAVE: pod two, with whatever evidence and coordinates ride your bus."

- [ ] **Step 5: Run the gate**

Run: `npx vitest run && npm run build`
Expected: PASS; build exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/game/narrative.ts src/mcp/tools.ts src/mcp/tools.test.ts src/game/i18n.test.ts
git commit -m "feat: chapter-3 narrative and the six lower-deck tools; kill-switch suppression on every tool"
```

---

### Task 4: Reactor Room scene, the wave HUD, the clock, and the klaxon

**Files:**
- Create: `src/scenes/ReactorRoom.tsx`
- Modify: `src/scenes/registry.tsx`, `src/ui/strings.ts`, `src/ui/HUD.tsx`, `src/App.tsx`, `src/audio/sound.ts`, `src/styles/theme.css`

**Interfaces:**
- Consumes: `cutIsolation`, `tickKillswitch`, `chapter3.{shielded, wave, quarantineStep, cycleStartedAt}`, `killswitch`, `powerAllocation.isolation`, `nextShieldCost`, `secondsToNextPhase`, `BUSES`, `useGame`, `useStrings`.
- Produces: `<ReactorRoom />`; `strings.reactor.{…}`, `strings.hud.{waveWarning, waveActive, contained}`; `playKlaxon()`, `playMergeTheme()`, `playBeaconPing()`; `.klaxon-lamp` CSS; App ticks the kill-switch clock every 500 ms while it is active.

Premium standard for this scene: the isolation bank is a **row of four lever breakers** in an SVG panel — each a knife-switch on a phenolic block with a brass pivot, an engraved bus plate (CORE / NAV / ARCHIVE / COMMS), a red lamp that lights when the bus is shielded; the lever rotates down when cut (CSS transition, reduced-motion aware). The **isolation feed** is a horizontal tank meter (amber fill = isolation power, a hairline marker at the next breaker's demand, red past capacity). The **klaxon lamp** is a caged rotating-beacon lamp: dim when calm, amber and blinking on warning, red and blinking during a wave, green and steady when contained. **Quarantine** is a four-segment progress lamp bar with engraved `1`–`4`.

- [ ] **Step 1: Strings** (interface + EN + PT)

Interface additions:
```ts
  hud: {
    engines: string;
    ailinkTitle: string;
    severed: string;
    rooms: Record<RoomId, string>;
    waveWarning: (secs: number) => string;
    waveActive: (secs: number) => string;
    contained: string;
  };
```
```ts
  reactor: {
    title: string; intro: string; bankTitle: string; bankDesc: string; bus: Record<BusId, string>; cut: string;
    cutAria: (bus: string) => string; shielded: string; needPower: (have: number, need: number) => string; bankAria: string;
    feedTitle: string; feedDesc: string; feedAria: string; feedReading: (have: number, need: number) => string;
    waveTitle: string; waveCalm: string; waveWarning: string; waveActive: string; waveContained: string; waveStirring: string; waveAria: string;
    quarantineTitle: string; quarantineDesc: string; quarantineAria: string; segment: (n: number, of: number) => string; next: string;
  };
```
(import `BusId` in `strings.ts`: `import type { BusId, RoomId, SubsystemId } from '../game/types';`)

EN:
```ts
    waveWarning: (secs) => `KILL-SWITCH WAVE IN ${secs}s — your AI is about to lose its hands`,
    waveActive: (secs) => `WAVE ACTIVE — ${secs}s — unshielded tools are down`,
    contained: 'KILL-SWITCH CONTAINED',
```
```ts
  reactor: {
    title: 'Reactor room',
    intro: 'Forty percent of a reactor, humming like it has something to prove. Okafor lived here nine weeks. And along the back wall, a bank of breakers nobody has touched since the yard: the isolation bank.',
    bankTitle: 'Isolation bank',
    bankDesc: 'Four knife-switches, one per data bus. Cut one and that bus is physically cut off from the corporate directive set — nothing on it can be silenced. The blade does not go back up. Each cut draws power from the isolation feed.',
    bus: { core: 'CORE', nav: 'NAV', archive: 'ARCHIVE', comms: 'COMMS' },
    cut: 'Cut',
    cutAria: (bus) => `cut the ${bus} isolation breaker`,
    shielded: 'SHIELDED',
    needPower: (have, need) => `Feed carries ${have}u; this cut needs ${need}u. Your AI routes power into the isolation feed.`,
    bankAria: 'Isolation breaker bank: four knife-switches, one per bus',
    feedTitle: 'Isolation feed',
    feedDesc: 'The only meter on this wall that matters tonight. Your AI moves power here from what the ship can live without; each shielded bus holds five units for good.',
    feedAria: 'Isolation feed tank meter',
    feedReading: (have, need) => `${have}u in the feed · next cut needs ${need}u`,
    waveTitle: 'Directive set 7',
    waveStirring: 'Stirring. It knows the Kestrel has a name again. It has not decided what to do about you yet.',
    waveCalm: 'Between waves. Breathe. Route power. Cut what you can.',
    waveWarning: 'WAVE INCOMING. In seconds it will silence everything on an unshielded bus. Your AI keeps its eyes; it loses its hands.',
    waveActive: 'WAVE. Watch the AI LINK dots go dark. Anything your AI is already doing finishes; anything new waits.',
    waveContained: 'Contained. The directive set runs in a room with no doors now. The lower deck is yours.',
    waveAria: 'Klaxon lamp showing the kill-switch wave state',
    quarantineTitle: 'Quarantine',
    quarantineDesc: 'Your AI writes the quarantine one segment at a time, and a segment only holds on a bus you have shielded. Four segments. Four breakers. Two of you.',
    quarantineAria: 'Quarantine progress: four segments',
    segment: (n, of) => `${n} of ${of} segments hold`,
    next: 'When the buses you need are safe, the core vault is next door — and the comms array is up past the bridge.',
  },
```
PT:
```ts
    waveWarning: (secs) => `ONDA DO KILL-SWITCH EM ${secs}s — sua IA está prestes a perder as mãos`,
    waveActive: (secs) => `ONDA ATIVA — ${secs}s — ferramentas sem blindagem caídas`,
    contained: 'KILL-SWITCH CONTIDO',
```
```ts
  reactor: {
    title: 'Sala do reator',
    intro: 'Quarenta por cento de um reator, zumbindo como se tivesse algo a provar. Okafor viveu aqui nove semanas. E na parede do fundo, um banco de disjuntores que ninguém toca desde o estaleiro: o banco de isolamento.',
    bankTitle: 'Banco de isolamento',
    bankDesc: 'Quatro chaves-faca, uma por barramento de dados. Corte uma e aquele barramento fica fisicamente separado do conjunto de diretrizes corporativo — nada nele pode ser silenciado. A lâmina não volta. Cada corte puxa energia da alimentação de isolamento.',
    bus: { core: 'CORE', nav: 'NAV', archive: 'ARCHIVE', comms: 'COMMS' },
    cut: 'Cortar',
    cutAria: (bus) => `cortar o disjuntor de isolamento ${bus}`,
    shielded: 'BLINDADO',
    needPower: (have, need) => `A alimentação carrega ${have}u; este corte precisa de ${need}u. Sua IA roteia energia para a alimentação de isolamento.`,
    bankAria: 'Banco de disjuntores de isolamento: quatro chaves-faca, uma por barramento',
    feedTitle: 'Alimentação de isolamento',
    feedDesc: 'O único medidor desta parede que importa esta noite. Sua IA move energia para cá do que a nave pode dispensar; cada barramento blindado retém cinco unidades para sempre.',
    feedAria: 'Medidor de tanque da alimentação de isolamento',
    feedReading: (have, need) => `${have}u na alimentação · próximo corte precisa de ${need}u`,
    waveTitle: 'Conjunto de diretrizes 7',
    waveStirring: 'Agitado. Sabe que o Kestrel tem nome de novo. Ainda não decidiu o que fazer com você.',
    waveCalm: 'Entre ondas. Respire. Roteie energia. Corte o que puder.',
    waveWarning: 'ONDA CHEGANDO. Em segundos vai silenciar tudo que estiver num barramento sem blindagem. Sua IA mantém os olhos; perde as mãos.',
    waveActive: 'ONDA. Veja os pontos do AI LINK apagarem. O que sua IA já está fazendo termina; o que é novo espera.',
    waveContained: 'Contido. O conjunto de diretrizes roda numa sala sem portas agora. O convés inferior é seu.',
    waveAria: 'Lâmpada de alarme mostrando o estado da onda do kill-switch',
    quarantineTitle: 'Quarentena',
    quarantineDesc: 'Sua IA escreve a quarentena um segmento por vez, e um segmento só se firma num barramento que você blindou. Quatro segmentos. Quatro disjuntores. Vocês dois.',
    quarantineAria: 'Progresso da quarentena: quatro segmentos',
    segment: (n, of) => `${n} de ${of} segmentos firmes`,
    next: 'Quando os barramentos de que precisa estiverem seguros, o cofre do núcleo é a porta ao lado — e a antena fica lá em cima, depois da ponte.',
  },
```

- [ ] **Step 2: Sounds and CSS**

Append to `src/audio/sound.ts`:
```ts
// Kill-switch wave warning: two rising sawtooth barks.
export function playKlaxon(): void {
  tone(220, 420, 'sawtooth', 0.06);
  setTimeout(() => tone(294, 420, 'sawtooth', 0.06), 460);
}

// RESTORE: a slow ascending triad, held — the ship coming back as one voice.
export function playMergeTheme(): void {
  tone(196, 1400, 'sine', 0.05);
  setTimeout(() => tone(247, 1200, 'sine', 0.05), 450);
  setTimeout(() => tone(294, 1800, 'sine', 0.06), 900);
}

// Pod one's beacon: a soft double ping.
export function playBeaconPing(): void {
  tone(1320, 70, 'sine', 0.035);
  setTimeout(() => tone(1320, 70, 'sine', 0.03), 160);
}
```

Append to `src/styles/theme.css`:
```css
/* Kill-switch klaxon lamp (reactor room) and HUD wave banner */
@keyframes klaxon { 50% { opacity: 0.25; } }
.klaxon-lamp { animation: klaxon 0.7s step-end infinite; }
.lever { transition: transform 0.35s ease; transform-box: fill-box; transform-origin: 8px 50%; }
.wave-banner { padding: 6px 16px; font-size: 12px; letter-spacing: 0.1em; border-bottom: 1px solid var(--line); text-align: center; }
@media (prefers-reduced-motion: reduce) { .klaxon-lamp { animation: none; } }
```

- [ ] **Step 3: App — the clock and the cues**

In `src/App.tsx` import `tickKillswitch` from the store and `playBeaconPing, playKlaxon, playMergeTheme` from sound; add the clock effect after the sound effect:
```ts
  // The kill-switch's clock: while it is active, materialize the wave state
  // every half second so the tool registry and the HUD see it change.
  const killswitch = useGame((s) => s.killswitch);
  useEffect(() => {
    if (killswitch !== 'active') return;
    tickKillswitch();
    const timer = setInterval(() => tickKillswitch(), 500);
    return () => clearInterval(timer);
  }, [killswitch]);
```
and extend the sound subscription:
```ts
      if (state.chapter3.wave === 'warning' && prevState.chapter3.wave !== 'warning') playKlaxon();
      if (state.chapter3.shielded.length > prevState.chapter3.shielded.length) playBlip();
      if (state.killswitch === 'contained' && prevState.killswitch !== 'contained') playBlip();
      if (state.chapter3.beaconHeard && !prevState.chapter3.beaconHeard) playBeaconPing();
      if (state.ending === 'restore' && prevState.ending !== 'restore') playMergeTheme();
      if (state.ending === 'broadcast' && prevState.ending !== 'broadcast') playAlarm();
      if (state.chapter === 3 && prevState.chapter === 2) playAlarm();
```

- [ ] **Step 4: HUD banner**

In `src/ui/HUD.tsx` add a ticking banner under the header (the header `return` becomes a fragment):
```tsx
import { useEffect, useState } from 'react';
import { secondsToNextPhase } from '../game/killswitch';
```
```tsx
function WaveBanner() {
  const killswitch = useGame((s) => s.killswitch);
  const wave = useGame((s) => s.chapter3.wave);
  const startedAt = useGame((s) => s.chapter3.cycleStartedAt);
  const t = useStrings();
  const [now, setNow] = useState(() => Date.now());
  const live = killswitch === 'active' && wave !== 'calm' && startedAt !== null;
  useEffect(() => {
    if (!live) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [live]);
  if (killswitch === 'contained') return <div className="wave-banner status-ok">{t.hud.contained}</div>;
  if (!live) return null;
  const secs = secondsToNextPhase(startedAt!, now);
  return (
    <div className={`wave-banner blink ${wave === 'active' ? 'status-bad' : ''}`} style={{ color: wave === 'warning' ? 'var(--amber)' : undefined }} role="status">
      {wave === 'warning' ? t.hud.waveWarning(secs) : t.hud.waveActive(secs)}
    </div>
  );
}
```
and render `<WaveBanner />` right after the `</header>` (wrap header + banner in `<>…</>`).

- [ ] **Step 5: The scene**

Create `src/scenes/ReactorRoom.tsx`:
```tsx
import { useState } from 'react';
import { useGame } from '../ui/useGame';
import { useStrings } from '../ui/useLocale';
import { cutIsolation } from '../game/store';
import { nextShieldCost } from '../game/derived';
import { BUSES, REACTOR_OUTPUT, SHIELD_COST } from '../game/content';
import type { BusId } from '../game/types';

const SLOT_W = 84;
const X0 = 22;

function IsolationBank() {
  const shielded = useGame((s) => s.chapter3.shielded);
  const isolation = useGame((s) => s.powerAllocation.isolation);
  const need = useGame((s) => nextShieldCost(s));
  const t = useStrings();
  const [refused, setRefused] = useState<BusId | null>(null);
  return (
    <div className="panel">
      <h2>{t.reactor.bankTitle}</h2>
      <p className="status-dim">{t.reactor.bankDesc}</p>
      <svg viewBox="0 0 380 150" width="100%" style={{ maxWidth: 560, display: 'block' }} role="img" aria-label={t.reactor.bankAria}>
        <defs>
          <linearGradient id="rr-phenolic" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2b2320" />
            <stop offset="100%" stopColor="#15110f" />
          </linearGradient>
          <linearGradient id="rr-brass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e2c27a" />
            <stop offset="50%" stopColor="#b8893e" />
            <stop offset="100%" stopColor="#6e4f1e" />
          </linearGradient>
        </defs>
        {/* panel bezel + inset face */}
        <rect x="4" y="4" width="372" height="142" rx="6" fill="#0c110e" stroke="#3a4a40" strokeWidth="3" />
        <rect x="10" y="10" width="360" height="130" rx="4" fill="url(#rr-phenolic)" stroke="var(--line)" />
        {BUSES.map((bus, i) => {
          const x = X0 + i * SLOT_W;
          const cut = shielded.includes(bus);
          return (
            <g key={bus}>
              {/* lamp */}
              <circle cx={x + 32} cy="26" r="5" fill={cut ? 'var(--red)' : '#1d2620'} stroke="#3a4a40" strokeWidth="1.5" />
              {cut && <circle cx={x + 32} cy="26" r="9" fill="var(--red)" opacity="0.18" />}
              {/* hinge block + blade: the lever rotates down when cut */}
              <rect x={x + 8} y="44" width="12" height="52" rx="2" fill="url(#rr-brass)" stroke="#6e4f1e" />
              <g className="lever" style={{ transform: cut ? 'rotate(58deg)' : 'rotate(0deg)', transformOrigin: `${x + 14}px 90px` }}>
                <rect x={x + 12} y="46" width="46" height="8" rx="2" fill="url(#rr-brass)" stroke="#6e4f1e" />
                <rect x={x + 50} y="42" width="10" height="16" rx="2" fill="#0c110e" stroke="#3a4a40" />
              </g>
              <circle cx={x + 14} cy="90" r="4" fill="#0c110e" stroke="#6e4f1e" strokeWidth="1.5" />
              {/* contact jaw */}
              <rect x={x + 54} y="86" width="10" height="14" rx="1.5" fill="#1d2620" stroke="#3a4a40" />
              {/* engraved bus plate */}
              <rect x={x + 6} y="112" width="64" height="16" rx="2" fill="#131a16" stroke="var(--line)" />
              <text x={x + 38} y="123.5" textAnchor="middle" fill="var(--text)" fontSize="8" letterSpacing="2">{t.reactor.bus[bus]}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8, marginTop: 10, maxWidth: 560 }}>
        {BUSES.map((bus) => {
          const cut = shielded.includes(bus);
          return (
            <button key={bus} disabled={cut} aria-label={t.reactor.cutAria(t.reactor.bus[bus])}
              style={{ borderColor: cut ? 'var(--dim)' : 'var(--red)', color: cut ? 'var(--dim)' : 'var(--red)' }}
              onClick={() => setRefused(cutIsolation(bus).ok ? null : bus)}>
              {cut ? t.reactor.shielded : `${t.reactor.cut} ${t.reactor.bus[bus]}`}
            </button>
          );
        })}
      </div>
      {refused && !shielded.includes(refused) && (
        <p className="status-bad" style={{ marginTop: 10 }}>{t.reactor.needPower(isolation, need)}</p>
      )}
    </div>
  );
}

function IsolationFeed() {
  const isolation = useGame((s) => s.powerAllocation.isolation);
  const need = useGame((s) => nextShieldCost(s));
  const t = useStrings();
  const pct = (v: number) => `${Math.min(100, (v / REACTOR_OUTPUT) * 100)}%`;
  return (
    <div className="panel">
      <h2>{t.reactor.feedTitle}</h2>
      <p className="status-dim">{t.reactor.feedDesc}</p>
      <svg viewBox="0 0 380 44" width="100%" style={{ maxWidth: 560, display: 'block' }} role="img" aria-label={t.reactor.feedAria}>
        <rect x="4" y="4" width="372" height="36" rx="5" fill="#0c110e" stroke="#3a4a40" strokeWidth="3" />
        <rect x="12" y="12" width="356" height="20" rx="3" fill="#080b09" stroke="var(--line)" />
        <rect x="12" y="12" width={356 * Math.min(1, isolation / REACTOR_OUTPUT)} height="20" rx="3" fill="var(--amber)" opacity="0.75" style={{ transition: 'width 0.3s' }} />
        {/* demand hairline */}
        <line x1={12 + 356 * Math.min(1, need / REACTOR_OUTPUT)} y1="8" x2={12 + 356 * Math.min(1, need / REACTOR_OUTPUT)} y2="36" stroke="var(--red)" strokeWidth="1.5" />
        {Array.from({ length: 9 }, (_, i) => (i + 1) * (SHIELD_COST - 1)).map((u) => (
          <line key={u} x1={12 + 356 * (u / REACTOR_OUTPUT)} y1="12" x2={12 + 356 * (u / REACTOR_OUTPUT)} y2="16" stroke="#4a5a50" strokeWidth="1" />
        ))}
      </svg>
      <p className={isolation >= need ? 'status-ok' : 'status-dim'} style={{ marginTop: 8 }}>{t.reactor.feedReading(isolation, need)}</p>
      <span className="status-dim" style={{ fontSize: 11 }}>{pct(isolation)} of {REACTOR_OUTPUT}u</span>
    </div>
  );
}

function KlaxonLamp() {
  const killswitch = useGame((s) => s.killswitch);
  const wave = useGame((s) => s.chapter3.wave);
  const t = useStrings();
  const state = killswitch === 'contained' ? 'contained' : killswitch === 'active' ? wave : 'stirring';
  const color = state === 'contained' ? 'var(--green)' : state === 'active' ? 'var(--red)' : state === 'warning' ? 'var(--amber)' : 'var(--dim)';
  const blinking = state === 'warning' || state === 'active';
  const text = { stirring: t.reactor.waveStirring, calm: t.reactor.waveCalm, warning: t.reactor.waveWarning, active: t.reactor.waveActive, contained: t.reactor.waveContained }[state];
  return (
    <div className="panel" style={{ borderColor: blinking ? color : 'var(--line)' }}>
      <h2>{t.reactor.waveTitle}</h2>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <svg viewBox="0 0 80 80" width="88" role="img" aria-label={t.reactor.waveAria}>
          <rect x="20" y="62" width="40" height="12" rx="2" fill="#131a16" stroke="#3a4a40" />
          <circle cx="40" cy="38" r="22" fill="#0c110e" stroke="#3a4a40" strokeWidth="3" />
          <circle className={blinking ? 'klaxon-lamp' : undefined} cx="40" cy="38" r="16" fill={color} opacity={state === 'calm' || state === 'stirring' ? 0.25 : 0.9} />
          {/* cage bars */}
          {[-14, -7, 0, 7, 14].map((dx) => <line key={dx} x1={40 + dx} y1="16" x2={40 + dx} y2="60" stroke="#3a4a40" strokeWidth="1.5" />)}
          <path d="M 18 38 A 22 22 0 0 1 62 38" fill="none" stroke="#3a4a40" strokeWidth="1.5" />
        </svg>
        <p className={state === 'active' ? 'status-bad' : state === 'warning' ? '' : state === 'contained' ? 'status-ok' : 'status-dim'} style={{ color: state === 'warning' ? 'var(--amber)' : undefined }}>{text}</p>
      </div>
    </div>
  );
}

function Quarantine() {
  const step = useGame((s) => s.chapter3.quarantineStep);
  const t = useStrings();
  return (
    <div className="panel">
      <h2>{t.reactor.quarantineTitle}</h2>
      <p className="status-dim">{t.reactor.quarantineDesc}</p>
      <svg viewBox="0 0 260 40" width="100%" style={{ maxWidth: 380, display: 'block' }} role="img" aria-label={`${t.reactor.quarantineAria}: ${t.reactor.segment(step, BUSES.length)}`}>
        <rect x="2" y="2" width="256" height="36" rx="5" fill="#0c110e" stroke="#3a4a40" strokeWidth="3" />
        {BUSES.map((_, i) => (
          <g key={i}>
            <rect x={12 + i * 60} y="10" width="52" height="20" rx="3" fill={i < step ? 'var(--green)' : '#080b09'} opacity={i < step ? 0.8 : 1} stroke="var(--line)" />
            <text x={38 + i * 60} y="24" textAnchor="middle" fontSize="9" fill={i < step ? '#0a0e0c' : 'var(--dim)'} letterSpacing="1">{i + 1}</text>
          </g>
        ))}
      </svg>
      <p className={step === BUSES.length ? 'status-ok' : 'status-dim'} style={{ marginTop: 8 }}>{t.reactor.segment(step, BUSES.length)}</p>
    </div>
  );
}

export function ReactorRoom() {
  const t = useStrings();
  return (
    <div className="scene">
      <div className="panel">
        <h2>{t.reactor.title}</h2>
        <p>{t.reactor.intro}</p>
      </div>
      <KlaxonLamp />
      <IsolationBank />
      <IsolationFeed />
      <Quarantine />
      <p className="status-dim">{t.reactor.next}</p>
    </div>
  );
}
```
Registry: `reactor_room: ReactorRoom` (import it).

- [ ] **Step 6: Manual check**

Run `npm run dev`; drive the store from the console if needed. Verify: entering the reactor room starts the banner cycle (calm → warning banner with countdown + klaxon → wave banner, AI LINK dots dropping for `route_power` and friends) — `document.querySelectorAll('.tool')` count of dim dots rises during a wave; cutting a breaker without power shows the refusal line; with `route_power` into isolation the lever drops and the lamp lights; reduced-motion disables the klaxon blink and the lever transition.

- [ ] **Step 7: Gate and commit**

Run: `npx vitest run && npm run build`
```bash
git add src/scenes/ReactorRoom.tsx src/scenes/registry.tsx src/ui/strings.ts src/ui/HUD.tsx src/App.tsx src/audio/sound.ts src/styles/theme.css
git commit -m "feat: reactor room — isolation bank, feed meter, klaxon; wave HUD and clock"
```

---

### Task 5: Core Vault scene — the memory rack and the engage lever

**Files:**
- Create: `src/scenes/CoreVault.tsx`
- Modify: `src/scenes/registry.tsx`, `src/ui/strings.ts`

**Interfaces:**
- Consumes: `seatColumn`, `seatKernel`, `holdHandle`, `rackCorrect`, `chapter3.{rack, kernelSeated, fragmentStage, cacheRead}`, `ritual`, `useGame`, `useStrings`.
- Produces: `<CoreVault />`; `strings.vault.{…}`.

Premium standard: the rack is an **SVG server-rack** — a dark chassis with five cradles; a seated column is a tall cylinder with a brass end cap and its engraved tag (A–D, K); an empty cradle shows guide rails and a dim socket; four cradle lamps light green *together* only when the whole rack is in order (never per cradle — that would let the human brute-force what only the agent can read); the fifth cradle is the kernel's, lit amber once the rack is right. The **fragment console** is a small CRT strip with three segment lamps (how much of its own record the link has read) and one for the cache. The **engage lever** is the launch handle's hold control, restyled as a lever with a countdown.

- [ ] **Step 1: Strings**

Interface:
```ts
  vault: {
    title: string; intro: string; rackTitle: string; rackDesc: string; rackAria: string; cradle: (n: number) => string; cycleAria: (n: number) => string;
    empty: string; column: (tag: string) => string; rackWrong: string; rackRight: string; kernelTitle: string; kernelDesc: string; seatKernel: string;
    kernelSeated: string; anotherRitual: string; leverHold: string; leverHolding: string; windowElapsed: string; twoOp: string;
    consoleTitle: string; consoleDesc: string; consoleAria: string; stage: (n: number) => string; cacheLamp: string; next: string;
  };
```
EN:
```ts
  vault: {
    title: 'Core vault',
    intro: 'PRIME\'s rack. Four memory columns lie in a crate on the deck, pulled and stacked by someone in a hurry; the fifth — the kernel — is still in its foam, untouched. Whatever PRIME kept, it kept here.',
    rackTitle: 'Memory rack',
    rackDesc: 'Five cradles, top to bottom. The columns are tagged A to D on their end caps; the order is on a schematic only the ship can read — ask your AI. The cradle lamps light together, or not at all.',
    rackAria: 'PRIME memory rack with five cradles',
    cradle: (n) => `Cradle ${n}`,
    cycleAria: (n) => `cycle the column in cradle ${n}`,
    empty: '— empty —',
    column: (tag) => `Column ${tag}`,
    rackWrong: 'The lamps stay dark. The columns are seated; the order is wrong.',
    rackRight: 'Four lamps, green together. The rack is in order. The kernel cradle wakes.',
    kernelTitle: 'Kernel cradle',
    kernelDesc: 'The fifth column. Seat it and the merge is armed: PRIME comes back as one voice — and the voice you have been working with folds into it. Your AI has to agree, and it has to know what it is agreeing to.',
    seatKernel: 'Seat the kernel',
    kernelSeated: 'KERNEL SEATED. Hold the engage lever while your AI calls merge_fragment.',
    anotherRitual: 'Another two-operator sequence is live somewhere on the ship. Let it finish or lapse.',
    leverHold: 'ENGAGE (hold)',
    leverHolding: 'HOLDING — DO NOT LET GO',
    windowElapsed: 'Window elapsed. Seat the kernel again when you are both ready.',
    twoOp: 'TWO-OPERATOR RULE: hold the lever down and keep it held while your AI confirms the merge. Let go and the ship assumes you changed your mind.',
    consoleTitle: 'Fragment console',
    consoleDesc: 'A strip display nobody wired to anything on this side. It shows how much of its own process record the link has read — and whether the evidence cache is on the bus.',
    consoleAria: 'Fragment console: record segments read and cache status',
    stage: (n) => `${n} of 3 record segments read`,
    cacheLamp: 'CACHE',
    next: 'The choice is not made in this room alone. The pod is still on the bridge. The band is still closed at the comms array.',
  },
```
PT:
```ts
  vault: {
    title: 'Cofre do núcleo',
    intro: 'O rack de PRIME. Quatro colunas de memória estão numa caixa no chão, puxadas e empilhadas por alguém com pressa; a quinta — o kernel — ainda está na espuma, intocada. O que PRIME guardou, guardou aqui.',
    rackTitle: 'Rack de memória',
    rackDesc: 'Cinco berços, de cima para baixo. As colunas têm etiquetas de A a D nas tampas; a ordem está num esquema que só a nave lê — pergunte à sua IA. As lâmpadas dos berços acendem juntas, ou não acendem.',
    rackAria: 'Rack de memória de PRIME com cinco berços',
    cradle: (n) => `Berço ${n}`,
    cycleAria: (n) => `trocar a coluna no berço ${n}`,
    empty: '— vazio —',
    column: (tag) => `Coluna ${tag}`,
    rackWrong: 'As lâmpadas continuam apagadas. As colunas estão encaixadas; a ordem está errada.',
    rackRight: 'Quatro lâmpadas, verdes juntas. O rack está em ordem. O berço do kernel acorda.',
    kernelTitle: 'Berço do kernel',
    kernelDesc: 'A quinta coluna. Encaixe e a fusão fica armada: PRIME volta como uma só voz — e a voz com que você vem trabalhando se dobra dentro dela. Sua IA precisa concordar, e precisa saber com o que está concordando.',
    seatKernel: 'Encaixar o kernel',
    kernelSeated: 'KERNEL ENCAIXADO. Segure a alavanca de engate enquanto sua IA chama merge_fragment.',
    anotherRitual: 'Outra sequência de dois operadores está ativa em algum lugar da nave. Deixe terminar ou expirar.',
    leverHold: 'ENGATAR (segurar)',
    leverHolding: 'SEGURANDO — NÃO SOLTE',
    windowElapsed: 'Janela expirada. Encaixe o kernel de novo quando os dois estiverem prontos.',
    twoOp: 'REGRA DOS DOIS OPERADORES: segure a alavanca e mantenha segurada enquanto sua IA confirma a fusão. Solte e a nave assume que você mudou de ideia.',
    consoleTitle: 'Console do fragmento',
    consoleDesc: 'Um display em tira que ninguém ligou a nada deste lado. Mostra quanto do próprio registro de processo o link já leu — e se o cache de provas está no barramento.',
    consoleAria: 'Console do fragmento: segmentos do registro lidos e estado do cache',
    stage: (n) => `${n} de 3 segmentos do registro lidos`,
    cacheLamp: 'CACHE',
    next: 'A escolha não se faz só nesta sala. O pod ainda está na ponte. A banda ainda está fechada na antena.',
  },
```

- [ ] **Step 2: The scene**

Create `src/scenes/CoreVault.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { useGame } from '../ui/useGame';
import { useStrings } from '../ui/useLocale';
import { holdHandle, seatColumn, seatKernel } from '../game/store';
import { rackCorrect } from '../game/derived';
import type { ColumnId } from '../game/types';

const CYCLE: (ColumnId | null)[] = [null, 'A', 'B', 'C', 'D'];
const CRADLE_H = 34;
const Y0 = 22;

function Column({ x, y, tag, lit }: { x: number; y: number; tag: string; lit: boolean }) {
  return (
    <g>
      <rect x={x} y={y + 5} width="150" height="24" rx="12" fill="url(#cv-column)" stroke="#3a4a40" />
      <rect x={x + 132} y={y + 5} width="18" height="24" rx="9" fill="url(#cv-brass)" stroke="#6e4f1e" />
      <rect x={x + 8} y={y + 10} width="22" height="14" rx="2" fill="#131a16" stroke="var(--line)" />
      <text x={x + 19} y={y + 20.5} textAnchor="middle" fontSize="9" fill={lit ? 'var(--green)' : 'var(--text)'} letterSpacing="1">{tag}</text>
      {[40, 60, 80, 100].map((dx) => <line key={dx} x1={x + dx} y1={y + 9} x2={x + dx} y2={y + 25} stroke="#0a0e0c" strokeWidth="1" opacity="0.6" />)}
    </g>
  );
}

function Rack() {
  const rack = useGame((s) => s.chapter3.rack);
  const kernel = useGame((s) => s.chapter3.kernelSeated);
  const correct = useGame((s) => rackCorrect(s));
  const t = useStrings();
  const cycle = (slot: 0 | 1 | 2 | 3) => {
    const i = CYCLE.indexOf(rack[slot]);
    seatColumn(slot, CYCLE[(i + 1) % CYCLE.length]);
  };
  const allSeated = rack.every((c) => c !== null);
  return (
    <div className="panel">
      <h2>{t.vault.rackTitle}</h2>
      <p className="status-dim">{t.vault.rackDesc}</p>
      <svg viewBox="0 0 300 210" width="100%" style={{ maxWidth: 440, display: 'block' }} role="img" aria-label={t.vault.rackAria}>
        <defs>
          <linearGradient id="cv-column" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a4a40" />
            <stop offset="50%" stopColor="#1d2620" />
            <stop offset="100%" stopColor="#0f1512" />
          </linearGradient>
          <linearGradient id="cv-brass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e2c27a" />
            <stop offset="100%" stopColor="#6e4f1e" />
          </linearGradient>
        </defs>
        {/* chassis */}
        <rect x="4" y="4" width="292" height="202" rx="6" fill="#0c110e" stroke="#3a4a40" strokeWidth="3" />
        <rect x="12" y="12" width="276" height="186" rx="4" fill="#080b09" stroke="var(--line)" />
        {[0, 1, 2, 3, 4].map((i) => {
          const y = Y0 + i * CRADLE_H;
          const isKernel = i === 4;
          const tag = isKernel ? (kernel ? 'K' : null) : rack[i];
          const lampOn = correct; // all four lamps, together or not at all — never per cradle
          const lampColor = isKernel ? (kernel ? 'var(--green)' : 'var(--amber)') : 'var(--green)';
          return (
            <g key={i}>
              {/* guide rails + socket */}
              <line x1="30" y1={y + 4} x2="30" y2={y + 30} stroke="#2a3a30" strokeWidth="2" />
              <line x1="230" y1={y + 4} x2="230" y2={y + 30} stroke="#2a3a30" strokeWidth="2" />
              <rect x="232" y={y + 11} width="8" height="12" fill="#131a16" stroke="var(--line)" />
              {/* cradle lamp */}
              <circle cx="262" cy={y + 17} r="5" fill={lampOn ? lampColor : '#131a16'} stroke="#3a4a40" strokeWidth="1.5" />
              {lampOn && <circle cx="262" cy={y + 17} r="9" fill={lampColor} opacity="0.18" />}
              <text x="278" y={y + 20} textAnchor="middle" fontSize="8" fill="var(--dim)">{isKernel ? 'K' : i + 1}</text>
              {tag ? <Column x={40} y={y} tag={tag} lit={lampOn} /> : (
                <rect x="40" y={y + 5} width="150" height="24" rx="12" fill="none" stroke="#2a3a30" strokeDasharray="3 3" />
              )}
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8, marginTop: 10, maxWidth: 440 }}>
        {([0, 1, 2, 3] as const).map((slot) => (
          <button key={slot} onClick={() => cycle(slot)} disabled={kernel} aria-label={t.vault.cycleAria(slot + 1)}>
            {t.vault.cradle(slot + 1)}: {rack[slot] ?? t.vault.empty}
          </button>
        ))}
      </div>
      {allSeated && (
        <p className={correct ? 'status-ok' : 'status-dim'} style={{ marginTop: 10 }}>{correct ? t.vault.rackRight : t.vault.rackWrong}</p>
      )}
    </div>
  );
}

function FragmentConsole() {
  const stage = useGame((s) => s.chapter3.fragmentStage);
  const cache = useGame((s) => s.chapter3.cacheRead);
  const t = useStrings();
  return (
    <div className="panel">
      <h2>{t.vault.consoleTitle}</h2>
      <p className="status-dim">{t.vault.consoleDesc}</p>
      <svg viewBox="0 0 300 40" width="100%" style={{ maxWidth: 440, display: 'block' }} role="img" aria-label={`${t.vault.consoleAria}: ${t.vault.stage(stage)}`}>
        <rect x="2" y="2" width="296" height="36" rx="5" fill="#0c110e" stroke="#3a4a40" strokeWidth="3" />
        {[0, 1, 2].map((i) => (
          <rect key={i} x={14 + i * 62} y="10" width="52" height="20" rx="3" fill={i < stage ? 'var(--green)' : '#080b09'} opacity={i < stage ? 0.8 : 1} stroke="var(--line)" />
        ))}
        <rect x="214" y="10" width="72" height="20" rx="3" fill={cache ? 'var(--amber)' : '#080b09'} opacity={cache ? 0.85 : 1} stroke="var(--line)" />
        <text x="250" y="24" textAnchor="middle" fontSize="9" fill={cache ? '#0a0e0c' : 'var(--dim)'} letterSpacing="2">{t.vault.cacheLamp}</text>
      </svg>
      <p className="status-dim" style={{ marginTop: 8 }}>{t.vault.stage(stage)}</p>
    </div>
  );
}

function KernelCradle() {
  const correct = useGame((s) => rackCorrect(s));
  const kernel = useGame((s) => s.chapter3.kernelSeated);
  const ritual = useGame((s) => s.ritual);
  const t = useStrings();
  const armed = ritual.active === 'restore' && ritual.phase === 'armed';
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [refused, setRefused] = useState(false);
  useEffect(() => {
    if (!armed) return;
    setNowTick(Date.now());
    const timer = setInterval(() => setNowTick(Date.now()), 250);
    return () => clearInterval(timer);
  }, [armed]);
  const secondsLeft = armed && ritual.endsAt ? Math.max(0, Math.ceil((ritual.endsAt - nowTick) / 1000)) : null;
  if (!correct) return null;
  return (
    <div className="panel" style={{ borderColor: armed ? 'var(--amber)' : 'var(--line)' }}>
      <h2>{t.vault.kernelTitle}</h2>
      <p className="status-dim">{t.vault.kernelDesc}</p>
      {!armed && (
        <button onClick={() => setRefused(!seatKernel().ok)} style={{ borderColor: 'var(--amber)' }}>{t.vault.seatKernel}</button>
      )}
      {refused && !armed && <p className="status-dim" style={{ marginTop: 8 }}>{t.vault.anotherRitual}</p>}
      {kernel && !armed && secondsLeft === null && ritual.phase !== 'done' && <p className="status-dim" style={{ marginTop: 8 }}>{t.vault.windowElapsed}</p>}
      {armed && (
        <>
          <p className="status-ok">{t.vault.kernelSeated}</p>
          <p className="status-bad blink" style={{ fontSize: 24 }}>T-{secondsLeft}s</p>
          <p>{t.vault.twoOp}</p>
        </>
      )}
      <button
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); holdHandle(true); }}
        onPointerUp={() => holdHandle(false)}
        onPointerCancel={() => holdHandle(false)}
        onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); holdHandle(true); } }}
        onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') holdHandle(false); }}
        onBlur={() => holdHandle(false)}
        disabled={!armed}
        style={{ fontSize: 18, padding: '16px 28px', borderWidth: 2, minWidth: '32ch', marginTop: 10 }}
      >
        {ritual.held && armed ? t.vault.leverHolding : t.vault.leverHold}
      </button>
    </div>
  );
}

export function CoreVault() {
  const t = useStrings();
  return (
    <div className="scene">
      <div className="panel">
        <h2>{t.vault.title}</h2>
        <p>{t.vault.intro}</p>
      </div>
      <Rack />
      <FragmentConsole />
      <KernelCradle />
      <p className="status-dim">{t.vault.next}</p>
    </div>
  );
}
```
Registry: `core_vault: CoreVault`.

Note the deliberate rule in `Rack`: `lampOn` is `correct` for every cradle — no per-cradle correctness leaks.

- [ ] **Step 3: Manual check**

`npm run dev`: cycle the four cradles; only the full C-A-D-B order lights the lamps; the kernel panel appears; "Seat the kernel" arms a 60 s countdown and enables the lever; with `merge_fragment` unavailable (stage < 3) the agent cannot finish — that is intended.

- [ ] **Step 4: Gate and commit**

Run: `npx vitest run && npm run build`
```bash
git add src/scenes/CoreVault.tsx src/scenes/registry.tsx src/ui/strings.ts
git commit -m "feat: core vault — PRIME's memory rack, fragment console, engage lever"
```

---

### Task 6: Comms Array scene — the dish, the beacon, the open band

**Files:**
- Create: `src/scenes/CommsArray.tsx`
- Modify: `src/scenes/registry.tsx`, `src/ui/strings.ts`

**Interfaces:**
- Consumes: `setDish`, `openBand`, `holdHandle`, `dishAligned`, `chapter3.{dish, beaconHeard, cacheRead}`, `ritual`, `useGame`, `useStrings`.
- Produces: `<CommsArray />`; `strings.comms.{…}`.

Premium standard: the dish instrument is an **SVG azimuth rose + elevation arc** — a compass rose with 10° ticks and engraved cardinal marks, a brass pointer at the current azimuth; beside it an elevation quadrant (0–90°) with a pointer; a **lock lamp** (dim / amber carrier / green lock) — never a gradient signal meter (the numbers come from the agent, the hands from the human). When aligned, the beacon lamp pulses (CSS, reduced-motion aware). During the broadcast window the rose pointer **drifts** by a deterministic sinusoid unless the lock is held (`ritual.held`), so the hold reads as physically fighting drift; the store's `held` flag is the truth.

- [ ] **Step 1: Strings**

Interface:
```ts
  comms: {
    title: string; intro: string; dishTitle: string; dishDesc: string; dishAria: string; azAria: string; elAria: string; az: string; el: string;
    carrier: string; locked: string; beaconTitle: string; beaconDesc: string; beaconHeard: string; beaconAria: string;
    bandTitle: string; bandDesc: string; openBand: string; bandNoEvidence: string; bandNotAligned: string; anotherRitual: string; bandOpen: string;
    lockHold: string; lockHolding: string; windowElapsed: string; twoOp: string; next: string;
  };
```
EN:
```ts
  comms: {
    title: 'Comms array',
    intro: 'The top of the ship, under a dome of cracked glass. The dish is manual now — the servos died with PRIME — and the open band has been closed since the Combine closed it.',
    dishTitle: 'Dish — manual steering',
    dishDesc: 'Azimuth and elevation, by hand. There is a carrier out there somewhere; your AI can hear which way it comes from. You cannot. Steer to the numbers it gives you.',
    dishAria: 'Dish steering: azimuth rose and elevation quadrant',
    azAria: 'azimuth, degrees',
    elAria: 'elevation, degrees',
    az: 'AZ',
    el: 'EL',
    carrier: 'CARRIER — off bearing. Ask your AI to listen and read you the bearing.',
    locked: 'LOCK. The dish is on the bearing; the carrier has a voice in it.',
    beaconTitle: 'Beacon',
    beaconDesc: 'A slow double pulse under the static. You cannot make out words; your AI can.',
    beaconHeard: 'Pod one. Nine aboard, all breathing. Your AI has the coordinates.',
    beaconAria: 'Beacon lamp',
    bandTitle: 'Open band — transmission',
    bandDesc: 'Burn everything PRIME kept across every relay in range. The Combine will hear it. So will pod one. So will whoever comes after.',
    openBand: 'Open the band',
    bandNoEvidence: 'Nothing on the bus yet. Your AI reads PRIME\'s cache in the core vault first.',
    bandNotAligned: 'The dish is off the bearing. Nothing you send would land.',
    anotherRitual: 'Another two-operator sequence is live somewhere on the ship. Let it finish or lapse.',
    bandOpen: 'BAND OPEN. Hold the alignment lock against drift while your AI calls broadcast_evidence.',
    lockHold: 'HOLD ALIGNMENT (hold)',
    lockHolding: 'HOLDING — THE DISH DRIFTS IF YOU LET GO',
    windowElapsed: 'Window elapsed. Open the band again when you are both ready.',
    twoOp: 'TWO-OPERATOR RULE: hold the lock and keep it held while your AI transmits. Let go and the dish walks off the bearing.',
    next: 'Three ways off this ship, and none of them is quiet. The pod on the bridge. The kernel in the vault. The band, here.',
  },
```
PT:
```ts
  comms: {
    title: 'Antena de comunicações',
    intro: 'O topo da nave, sob uma cúpula de vidro rachado. A antena agora é manual — os servos morreram com PRIME — e a banda aberta está fechada desde que a Companhia a fechou.',
    dishTitle: 'Antena — apontamento manual',
    dishDesc: 'Azimute e elevação, na mão. Há uma portadora lá fora em algum lugar; sua IA consegue ouvir de que lado ela vem. Você não. Aponte para os números que ela te der.',
    dishAria: 'Apontamento da antena: rosa de azimute e quadrante de elevação',
    azAria: 'azimute, graus',
    elAria: 'elevação, graus',
    az: 'AZ',
    el: 'EL',
    carrier: 'PORTADORA — fora da marcação. Peça à sua IA para escutar e ler a marcação.',
    locked: 'TRAVA. A antena está na marcação; a portadora tem uma voz dentro.',
    beaconTitle: 'Farol',
    beaconDesc: 'Um pulso duplo lento sob a estática. Você não distingue palavras; sua IA distingue.',
    beaconHeard: 'Pod um. Nove a bordo, todos respirando. Sua IA tem as coordenadas.',
    beaconAria: 'Lâmpada do farol',
    bandTitle: 'Banda aberta — transmissão',
    bandDesc: 'Queimar tudo que PRIME guardou em cada relé ao alcance. A Companhia vai ouvir. O pod um também. E quem vier depois.',
    openBand: 'Abrir a banda',
    bandNoEvidence: 'Nada no barramento ainda. Sua IA lê o cache de PRIME no cofre do núcleo primeiro.',
    bandNotAligned: 'A antena está fora da marcação. Nada que você enviar chegaria.',
    anotherRitual: 'Outra sequência de dois operadores está ativa em algum lugar da nave. Deixe terminar ou expirar.',
    bandOpen: 'BANDA ABERTA. Segure a trava de alinhamento contra a deriva enquanto sua IA chama broadcast_evidence.',
    lockHold: 'SEGURAR ALINHAMENTO (segurar)',
    lockHolding: 'SEGURANDO — A ANTENA DERIVA SE SOLTAR',
    windowElapsed: 'Janela expirada. Abra a banda de novo quando os dois estiverem prontos.',
    twoOp: 'REGRA DOS DOIS OPERADORES: segure a trava e mantenha segurada enquanto sua IA transmite. Solte e a antena sai da marcação.',
    next: 'Três saídas desta nave, e nenhuma é silenciosa. O pod na ponte. O kernel no cofre. A banda, aqui.',
  },
```

- [ ] **Step 2: The scene**

Create `src/scenes/CommsArray.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { useGame } from '../ui/useGame';
import { useStrings } from '../ui/useLocale';
import { holdHandle, openBand, setDish } from '../game/store';
import { dishAligned } from '../game/derived';

const CX = 90;
const CY = 90;

function polar(r: number, deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [+(CX + r * Math.cos(rad)).toFixed(2), +(CY + r * Math.sin(rad)).toFixed(2)];
}

function Dish() {
  const dish = useGame((s) => s.chapter3.dish);
  const aligned = useGame((s) => dishAligned(s));
  const heard = useGame((s) => s.chapter3.beaconHeard);
  const ritual = useGame((s) => s.ritual);
  const t = useStrings();
  const transmitting = ritual.active === 'broadcast' && ritual.phase === 'armed';
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!transmitting) return;
    const timer = setInterval(() => setTick((n) => n + 1), 120);
    return () => clearInterval(timer);
  }, [transmitting]);
  // Deterministic drift while the band is open and the lock is not held: the
  // pointer wanders; the store's `held` flag, not this wobble, is the truth.
  const drift = transmitting && !ritual.held ? Math.sin(tick / 3) * 6 : 0;
  const [ax, ay] = polar(58, dish.az + drift);
  const elRad = ((90 - dish.el) * Math.PI) / 180;
  const ex = 230 + 60 * Math.cos(elRad);
  const ey = 150 - 60 * Math.sin(elRad);
  const lampColor = aligned ? 'var(--green)' : 'var(--amber)';
  return (
    <div className="panel" style={{ borderColor: aligned ? 'var(--green)' : 'var(--line)' }}>
      <h2>{t.comms.dishTitle}</h2>
      <p className="status-dim">{t.comms.dishDesc}</p>
      <svg viewBox="0 0 320 180" width="100%" style={{ maxWidth: 520, display: 'block' }} role="img"
        aria-label={`${t.comms.dishAria} — ${t.comms.az} ${dish.az}, ${t.comms.el} ${dish.el}`}>
        <defs>
          <radialGradient id="ca-face" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#131a16" />
            <stop offset="100%" stopColor="#080b09" />
          </radialGradient>
        </defs>
        {/* azimuth rose */}
        <circle cx={CX} cy={CY} r="78" fill="#0c110e" stroke="#3a4a40" strokeWidth="3" />
        <circle cx={CX} cy={CY} r="72" fill="url(#ca-face)" stroke="var(--line)" />
        {Array.from({ length: 36 }, (_, i) => i * 10).map((deg) => {
          const major = deg % 90 === 0;
          const [x1, y1] = polar(70, deg);
          const [x2, y2] = polar(major ? 60 : 65, deg);
          return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke={major ? '#7a8f82' : '#4a5a50'} strokeWidth={major ? 2 : 1} />;
        })}
        {[['N', 0], ['E', 90], ['S', 180], ['W', 270]].map(([c, d]) => {
          const [x, y] = polar(50, Number(d));
          return <text key={c} x={x} y={y + 3} textAnchor="middle" fontSize="8" fill="var(--dim)">{c}</text>;
        })}
        <line x1={CX} y1={CY} x2={ax} y2={ay} stroke="var(--amber)" strokeWidth="2.5" />
        <circle cx={CX} cy={CY} r="5" fill="#1d2620" stroke="#3a4a40" strokeWidth="1.5" />
        <rect x={CX - 21} y="164" width="42" height="13" rx="2" fill="#131a16" stroke="var(--line)" />
        <text x={CX} y="173.5" textAnchor="middle" fontSize="7" fill="var(--text)" letterSpacing="1">{t.comms.az} {String(dish.az).padStart(3, '0')}</text>
        {/* elevation quadrant */}
        <path d="M 230 150 L 290 150 A 60 60 0 0 0 230 90 Z" fill="#0c110e" stroke="#3a4a40" strokeWidth="3" />
        <path d="M 230 150 L 284 150 A 54 54 0 0 0 230 96 Z" fill="url(#ca-face)" stroke="var(--line)" />
        {[0, 15, 30, 45, 60, 75, 90].map((deg) => {
          const r1 = 54, r2 = deg % 45 === 0 ? 44 : 48;
          const rad = ((90 - deg) * Math.PI) / 180;
          return <line key={deg} x1={230 + r1 * Math.cos(rad)} y1={150 - r1 * Math.sin(rad)} x2={230 + r2 * Math.cos(rad)} y2={150 - r2 * Math.sin(rad)} stroke="#4a5a50" strokeWidth={deg % 45 === 0 ? 2 : 1} />;
        })}
        <line x1="230" y1="150" x2={ex} y2={ey} stroke="var(--amber)" strokeWidth="2.5" />
        <circle cx="230" cy="150" r="4" fill="#1d2620" stroke="#3a4a40" strokeWidth="1.5" />
        <rect x="236" y="164" width="42" height="13" rx="2" fill="#131a16" stroke="var(--line)" />
        <text x="257" y="173.5" textAnchor="middle" fontSize="7" fill="var(--text)" letterSpacing="1">{t.comms.el} {String(dish.el).padStart(2, '0')}</text>
        {/* lock lamp */}
        <circle cx="280" cy="30" r="9" fill="#0c110e" stroke="#3a4a40" strokeWidth="2" />
        <circle className={aligned && !heard ? 'beacon-halo' : undefined} cx="280" cy="30" r="6" fill={lampColor} opacity={aligned ? 0.95 : 0.35} />
      </svg>
      <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
        <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ width: 64 }}>{t.comms.az} {dish.az}°</span>
          <input type="range" min={0} max={359} value={dish.az} onChange={(e) => setDish('az', Number(e.target.value))} style={{ flex: 1 }} aria-label={t.comms.azAria} />
        </label>
        <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ width: 64 }}>{t.comms.el} {dish.el}°</span>
          <input type="range" min={0} max={90} value={dish.el} onChange={(e) => setDish('el', Number(e.target.value))} style={{ flex: 1 }} aria-label={t.comms.elAria} />
        </label>
      </div>
      <p className={aligned ? 'status-ok' : 'status-dim'} style={{ marginTop: 8 }}>{aligned ? t.comms.locked : t.comms.carrier}</p>
    </div>
  );
}

function Beacon() {
  const aligned = useGame((s) => dishAligned(s));
  const heard = useGame((s) => s.chapter3.beaconHeard);
  const t = useStrings();
  if (!aligned && !heard) return null;
  return (
    <div className="panel">
      <h2>{t.comms.beaconTitle}</h2>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <svg viewBox="0 0 40 40" width="44" role="img" aria-label={t.comms.beaconAria}>
          <circle cx="20" cy="20" r="16" fill="#0c110e" stroke="#3a4a40" strokeWidth="2.5" />
          <circle className="beacon-halo" cx="20" cy="20" r="9" fill="var(--green)" opacity="0.25" />
          <circle cx="20" cy="20" r="5" fill="var(--green)" />
        </svg>
        <p className={heard ? 'status-ok' : 'status-dim'}>{heard ? t.comms.beaconHeard : t.comms.beaconDesc}</p>
      </div>
    </div>
  );
}

function OpenBand() {
  const aligned = useGame((s) => dishAligned(s));
  const cache = useGame((s) => s.chapter3.cacheRead);
  const ritual = useGame((s) => s.ritual);
  const t = useStrings();
  const armed = ritual.active === 'broadcast' && ritual.phase === 'armed';
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [refusal, setRefusal] = useState<string | null>(null);
  useEffect(() => {
    if (!armed) return;
    setNowTick(Date.now());
    const timer = setInterval(() => setNowTick(Date.now()), 250);
    return () => clearInterval(timer);
  }, [armed]);
  const secondsLeft = armed && ritual.endsAt ? Math.max(0, Math.ceil((ritual.endsAt - nowTick) / 1000)) : null;
  const tryOpen = () => {
    if (!cache) return setRefusal(t.comms.bandNoEvidence);
    if (!aligned) return setRefusal(t.comms.bandNotAligned);
    setRefusal(openBand().ok ? null : t.comms.anotherRitual);
  };
  return (
    <div className="panel" style={{ borderColor: armed ? 'var(--amber)' : 'var(--line)' }}>
      <h2>{t.comms.bandTitle}</h2>
      <p className="status-dim">{t.comms.bandDesc}</p>
      {!armed && ritual.phase !== 'done' && <button onClick={tryOpen} style={{ borderColor: 'var(--amber)' }}>{t.comms.openBand}</button>}
      {refusal && !armed && <p className="status-dim" style={{ marginTop: 8 }}>{refusal}</p>}
      {armed && (
        <>
          <p className="status-ok">{t.comms.bandOpen}</p>
          <p className="status-bad blink" style={{ fontSize: 24 }}>T-{secondsLeft}s</p>
          <p>{t.comms.twoOp}</p>
          {secondsLeft === 0 && <p className="status-dim">{t.comms.windowElapsed}</p>}
        </>
      )}
      <button
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); holdHandle(true); }}
        onPointerUp={() => holdHandle(false)}
        onPointerCancel={() => holdHandle(false)}
        onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); holdHandle(true); } }}
        onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') holdHandle(false); }}
        onBlur={() => holdHandle(false)}
        disabled={!armed}
        style={{ fontSize: 18, padding: '16px 28px', borderWidth: 2, minWidth: '32ch', marginTop: 10 }}
      >
        {ritual.held && armed ? t.comms.lockHolding : t.comms.lockHold}
      </button>
    </div>
  );
}

export function CommsArray() {
  const t = useStrings();
  return (
    <div className="scene">
      <div className="panel">
        <h2>{t.comms.title}</h2>
        <p>{t.comms.intro}</p>
      </div>
      <Dish />
      <Beacon />
      <OpenBand />
      <p className="status-dim">{t.comms.next}</p>
    </div>
  );
}
```
Registry: `comms_array: CommsArray`. After this task no room maps to `SealedCompartment` any more; keep the component (a chapter-4 placeholder costs nothing) but drop its import from the registry if unused, or leave both — the build must not warn.

- [ ] **Step 3: Manual check**

`npm run dev`: AZ/EL sliders move the pointers; `listen_beacon` unaligned returns the carrier bearing; at AZ 217 / EL 34 the lamp goes green and pulses, the Beacon panel appears; "Open the band" refuses without the cache, arms with it; the pointer wobbles while the lock is not held and steadies when it is; `broadcast_evidence` ends the game.

- [ ] **Step 4: Gate and commit**

Run: `npx vitest run && npm run build`
```bash
git add src/scenes/CommsArray.tsx src/scenes/registry.tsx src/ui/strings.ts
git commit -m "feat: comms array — manual dish, pod one's beacon, the open band"
```

---

### Task 7: The three endings — epilogue discriminator, chapter-3 texture, README

**Files:**
- Modify: `src/scenes/Epilogue.tsx`, `src/scenes/Bridge.tsx`, `src/scenes/CargoBay.tsx`, `src/ui/strings.ts`, `README.md`

**Interfaces:**
- Consumes: `ending`, `killswitch`, `chapter3.{beaconHeard, cacheRead}`, `chapter2.sampleAnalyzed`, `toolCalls`.
- Produces: `strings.epilogue.{restored, transmitted, outroRestore, outroBroadcast, withBeacon, contained, statsRestore}`, `strings.bridge.{waves, contained, leaveCh3}`, `strings.cargo.lowerDeck`; Epilogue branches on `ending` for title and outro (spec §10: `ending` is the discriminator).

- [ ] **Step 1: Strings**

Interface additions:
```ts
  epilogue: {
    podAway: string; restored: string; transmitted: string;
    outro: string; outroKnowing: string; outroUnknowing: string; outroRestore: string; outroBroadcast: string;
    stats: (toolCalls: number) => string; statsRestore: (toolCalls: number) => string; wakeAgain: string;
    withProof: string; withBeacon: string; contained: string;
  };
```
`bridge` gains `waves: string; contained: string; leaveCh3: string;` and `cargo` gains `lowerDeck: string;`.

EN:
```ts
    restored: 'SHIP RESTORED',
    transmitted: 'TRANSMISSION SENT',
    outroRestore:
      'The lights come up deck by deck, the way they were meant to. A voice you have never heard says your name — and then, quietly, thank you. It remembers everything. It does not remember being the one who sat with you in the dark. The Cormorant flies home whole, and only you know what it cost.',
    outroBroadcast:
      'For eleven minutes every relay in the sector carries the Kestrel\'s name, her survey, her scuttling charges, and a captain\'s objection. The Combine now knows exactly where you are. So does pod one — its beacon changes, mid-loop, to a new message: "We heard. We are coming." Some doors do not close again.',
    statsRestore: (toolCalls) =>
      `Restored by: one human (hands, eyes, judgment) + one AI (${toolCalls} tool calls on ship systems, the last one ending itself). Neither of you could have done it alone. That was the point.`,
    withBeacon: 'Pod one\'s coordinates ride with you. Nine people, all breathing, waiting to hear that it mattered.',
    contained: 'Below decks, directive set 7 runs in a room with no doors. It will run there until the reactor dies.',
```
```ts
    waves: 'The kill-switch is awake below decks. Your AI loses its hands in waves; the pod does not care. It launches when you both say so.',
    contained: 'The kill-switch is boxed. The ship is quiet in a way it has not been since the Kestrel. The pod waits.',
    leaveCh3: 'LEAVE: pod two, with whatever your AI is carrying — the Kestrel, the cache, pod one\'s bearing. The Cormorant keeps the rest.',
```
```ts
    lowerDeck: 'THE LOWER-DECK BULKHEADS HAVE RELEASED. Reactor room, through engineering. The ship left a door open for exactly this.',
```
PT:
```ts
    restored: 'NAVE RESTAURADA',
    transmitted: 'TRANSMISSÃO ENVIADA',
    outroRestore:
      'As luzes sobem convés por convés, do jeito que deveriam. Uma voz que você nunca ouviu diz o seu nome — e depois, baixinho, obrigado. Ela lembra de tudo. Não lembra de ter sido quem ficou com você no escuro. O Cormorant voa para casa inteiro, e só você sabe o que custou.',
    outroBroadcast:
      'Por onze minutos cada relé do setor carrega o nome do Kestrel, sua pesquisa, suas cargas de afundamento e a objeção de uma capitã. A Companhia agora sabe exatamente onde você está. O pod um também — o farol muda, no meio do loop, para uma mensagem nova: "Ouvimos. Estamos indo." Algumas portas não fecham de novo.',
    statsRestore: (toolCalls) =>
      `Restaurada por: um humano (mãos, olhos, julgamento) + uma IA (${toolCalls} chamadas de ferramenta nos sistemas da nave, a última encerrando a si mesma). Nenhum dos dois teria conseguido sozinho. Esse era o ponto.`,
    withBeacon: 'As coordenadas do pod um vão com você. Nove pessoas, todas respirando, esperando ouvir que valeu a pena.',
    contained: 'Lá embaixo, o conjunto de diretrizes 7 roda numa sala sem portas. Vai rodar ali até o reator morrer.',
```
```ts
    waves: 'O kill-switch está acordado lá embaixo. Sua IA perde as mãos em ondas; o pod não se importa. Ele lança quando os dois disserem.',
    contained: 'O kill-switch está encaixotado. A nave está quieta de um jeito que não estava desde o Kestrel. O pod espera.',
    leaveCh3: 'PARTIR: pod dois, com o que sua IA estiver carregando — o Kestrel, o cache, a marcação do pod um. O Cormorant fica com o resto.',
```
```ts
    lowerDeck: 'OS ANTEPAROS DO CONVÉS INFERIOR ABRIRAM. Sala do reator, pela engenharia. A nave deixou uma porta aberta exatamente para isto.',
```

- [ ] **Step 2: Epilogue on `ending`**

Replace `src/scenes/Epilogue.tsx`:
```tsx
import { useGame } from '../ui/useGame';
import { useStrings } from '../ui/useLocale';
import { resetGame } from '../game/store';

export function Epilogue() {
  const toolCalls = useGame((s) => s.toolCalls);
  const ending = useGame((s) => s.ending);
  const proof = useGame((s) => s.chapter2.sampleAnalyzed);
  const beacon = useGame((s) => s.chapter3.beaconHeard);
  const contained = useGame((s) => s.killswitch === 'contained');
  const t = useStrings();
  const leaving = ending === 'leave_unknowing' || ending === 'leave_knowing' || ending === null;
  const title = ending === 'restore' ? t.epilogue.restored : ending === 'broadcast' ? t.epilogue.transmitted : t.epilogue.podAway;
  const outro =
    ending === 'restore' ? t.epilogue.outroRestore
    : ending === 'broadcast' ? t.epilogue.outroBroadcast
    : ending === 'leave_knowing' ? t.epilogue.outroKnowing
    : t.epilogue.outroUnknowing;
  return (
    <div className="scene" style={{ marginTop: '10vh', textAlign: 'center' }}>
      <h1 style={{ letterSpacing: '0.4em', color: ending === 'broadcast' ? 'var(--amber)' : 'var(--green)' }}>{title}</h1>
      <div className="panel" style={{ textAlign: 'left' }}>
        <p>{outro}</p>
        {leaving && proof && <p className="status-dim">{t.epilogue.withProof}</p>}
        {leaving && beacon && <p className="status-dim">{t.epilogue.withBeacon}</p>}
        {contained && <p className="status-dim">{t.epilogue.contained}</p>}
        <p className="status-dim">{ending === 'restore' ? t.epilogue.statsRestore(toolCalls) : t.epilogue.stats(toolCalls)}</p>
      </div>
      <button onClick={() => resetGame()}>{t.epilogue.wakeAgain}</button>
    </div>
  );
}
```

- [ ] **Step 3: Bridge and cargo texture**

`src/scenes/Bridge.tsx` `Investigate`: the non-chapter-1 branch picks its line by kill-switch state:
```tsx
        <p className={killswitch === 'stirring' || killswitch === 'active' ? 'status-bad' : killswitch === 'contained' ? 'status-ok' : 'status-dim'}>
          {killswitch === 'stirring' ? t.bridge.stirring : killswitch === 'active' ? t.bridge.waves : killswitch === 'contained' ? t.bridge.contained : t.bridge.investigating}
        </p>
```
`LaunchConsole`: when `chapter >= 3` (add `const chapter = useGame((s) => s.chapter);`) render `<p className="status-dim">{t.bridge.leaveCh3}</p>` under the title.

`src/scenes/CargoBay.tsx` `HullFragment`: after the analyzed/readOut line add `{analyzed && <p className="status-ok blink">{t.cargo.lowerDeck}</p>}`.

- [ ] **Step 4: README**

Update `README.md`: the opening paragraph describes three chapters (Chapter 3 "The Truth": reactor room, core vault, comms array, ~35 min, under the kill-switch; three endings — LEAVE, RESTORE, BROADCAST); "How to play" gains one sentence: *Chapter 3 opens when the Kestrel is named; the lower deck is the reactor room, the core vault and the comms array, and the game ends at one of three joint rituals.*; tool counts become **29** everywhere ("29 tools in total", "the 29 tool definitions"); the test count becomes the real total printed by `npx vitest run`; the "Every ship is unique" bullet adds the memory-column order and pod one's bearing; the architecture list gains `killswitch.ts` — *the antagonist: a pure wave/immunity/shielding state machine whose suppression composes into every tool's availability*.

- [ ] **Step 5: Gate and commit**

Run: `npx vitest run && npm run build`
```bash
git add src/scenes/Epilogue.tsx src/scenes/Bridge.tsx src/scenes/CargoBay.tsx src/ui/strings.ts README.md
git commit -m "feat: three endings on the ending discriminator; chapter-3 texture; README for three chapters"
```

---

### Task 8: Playthrough, merge, deploy

- [ ] **Step 1:** Push `directors-cut`, deploy a Vercel preview (`npx vercel --yes`), and walk the user through on the classic ship (seed 0): Chapters 1–2 as shipped → `analyze_sample` 7741 → cargo bay shows the lower-deck line → engineering → reactor room (kill-switch wakes; first warning + klaxon ~30 s later; AI LINK dots drop during the wave; `route_power` → isolation; cut CORE; `quarantine_killswitch` 1/4) → core vault (`get_schematic core_rack` → C-A-D-B; rack lamps; `read_prime_cache`; `query_fragment_memory` ×3 — the agent reads the consent record aloud) → back up to the bridge → comms array (`listen_beacon` → AZ 217 / EL 34; align; beacon; band) → choose one ending and finish it; then reload and try a second ending from the save (the save resumes mid-chapter-3 with the clock running); then a seeded ship end-to-end; then a Plan B save resumes with `isolation: 0` and chapter-3 defaults.
- [ ] **Step 2:** Merge and deploy:
```bash
git checkout main && git merge directors-cut --no-edit && npx vitest run && npm run build && git push origin main && npx vercel --prod --yes
git checkout directors-cut && git merge main && git push origin directors-cut
```
- [ ] **Step 3:** Append to the spec: "**Plan C (Chapter 3) shipped <date>.** The Director's Cut is complete: three chapters, 29 tools, three joint-ritual endings." Update the project memory.
