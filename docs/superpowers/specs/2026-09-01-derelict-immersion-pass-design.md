# DERELICT: Immersion Pass — Design

**Date:** 2026-09-01
**Status:** Approved design (brainstormed with Mario, Sep 1). First plan after the remixed-ships cycle; this is **G**.
**Base:** `main` @ `d688119` — 3 chapters + New Game+, 4 endings, 31 WebMCP tools, 282 tests; every puzzle room varies by seed; tool contract pinned by snapshot; premium instrument standard.

## 1. Purpose

The puzzles are done. What the game still lacks is *presence*: the human never sees the agent act, the ship is nearly silent, a run starts on a plain title card and ends on a paragraph, and the seed that makes every ship unique is invisible. This pass adds five things, none of them a puzzle, all of them felt in every run:

1. an **AUX LINK console** — the human watches the partner act, and watches it be silenced;
2. a **diegetic soundscape** — the ship sounds like the room you are in and the state it is in;
3. a **cold open** and **bulkhead transitions** — a run begins in the pod and the ship is crossed, not switched;
4. **ending vignettes** and a **FLIGHT RECORD** — an ending is a picture and a ledger, not a paragraph;
5. **ship codes** — a run's ship can be shared as a link, so two crews can wake on the same hull.

Nothing in this document touches `GameState`, `persist.ts`, the save schema, a tool's name, description or schema, or the kill-switch and ritual rules. The tool-contract snapshot stays byte-identical.

## 2. Architecture — instruments beside the store

Every new piece of state lives in a small store *beside* the game store, on the pattern of `localeStore` and `metaStore`:

| Store | File | Persisted | Holds |
|---|---|---|---|
| `linkStore` | `src/game/link.ts` | no | the last 12 AUX LINK events |
| `prefsStore` | `src/game/prefs.ts` | `derelict-prefs` | `muted`, `linkCollapsed` |

Everything else is either a pure function (`mixFor`, `coldOpenSchedule`, `isFreshRun`, the ship-code codec) or a presentational component reading those stores. A resumed run starts with an empty link buffer — its first line is the registry's initial sync, which in fiction reads as the link coming back.

## 3. The AUX LINK console

### 3.1 Events — `src/game/link.ts`

```ts
export type LinkStatus = 'ok' | 'refused' | 'error';
export type LinkEvent =
  | { kind: 'call'; at: number; tool: string; input: string; status: LinkStatus }
  | { kind: 'link'; at: number; online: string[]; offline: string[] };
export const LINK_CAPACITY = 12;
export const linkStore: StoreApi<{ events: LinkEvent[] }>; // oldest → newest
export function pushLinkEvent(e: LinkEvent): void;   // drops the oldest past LINK_CAPACITY
export function clearLink(): void;                    // App calls it when the run's seed changes
export function summarizeInput(input: Record<string, unknown>, max = 48): string;
```

`summarizeInput` renders `key=value` pairs separated by one space (arrays joined by `,`, nested objects as JSON, strings verbatim), truncated to `max` characters with a trailing `…`. An empty input renders as `''`.

**Call events** are emitted inside `mkTool`'s `execute` wrapper in `src/mcp/tools.ts`, right after `bumpToolCalls()`: `status` is `'refused'` when the handler's return value is an object whose `ok === false`, `'error'` when it throws (the existing catch), `'ok'` otherwise. The event carries the summarized **input only** — never the payload the ship returned, never its message. That is the asymmetry rule applied to the console: the human sees what the agent *tried*, not what the agent *read*. Every tool emits, including `get_ship_status`; activity is the point.

**Link events** come from the registry. `createToolRegistry(mc, tools, store, onChange?)` gains an optional fourth argument, `onChange?(change: { online: string[]; offline: string[] })`, called once per `sync()` that registers or revokes anything (the initial sync included). The registry stays pure; `App` wires `onChange` to `pushLinkEvent`. Existing registry tests pass unchanged.

### 3.2 Availability, with the reason

`toolAvailability(s)` grows from `{ name, online }` to:

```ts
{ name: string; online: boolean; bus: BusId; readOnly: boolean; silenced: boolean }
```

`silenced` is true when the tool would be online but for the kill-switch: `baseAvailable(s) && suppressed(s, meta)`. To compute it, the tool object built by `mkTool` carries `meta: ToolMeta` and `baseAvailable` (the un-composed predicate) alongside the composed `availableWhen`; `GameTool` in `registry.ts` is unchanged (tools.ts exports its own `ShipTool extends GameTool`). The snapshot test pins definitions, not these fields.

### 3.3 The instrument — `src/ui/LinkConsole.tsx`

Replaces the `.ailink` text list in the HUD header. The header keeps the ship line on the left (name, room, AUX, ENGINES, NG+ plate) and gains the SOUND toggle beside the locale toggle on the right. The console is a full-width strip **between the header and the wave banner**.

```
AUX LINK ● LINKED   ONLINE 5/31                                        [▾]
CORE     ○ quarantine_killswitch  ○ query_fragment_memory  ○ read_prime_cache …
NAV      ● get_ship_status  ● get_deck_map  ● read_emergency_bulletin  ○ unlock_door …
ARCHIVE  ○ trace_command_origin  ○ decrypt_private_log  ○ run_irrigation …
COMMS    ○ listen_beacon  ○ broadcast_evidence  ○ hail_pod_one
──────────────────────────────────────────────────────────────────────────
12:04:31 › unlock_door  door=cryo_exit code=0407                     ● OK
12:04:02 › unlock_door  door=cryo_exit code=0704                     ● REFUSED
12:03:40 › LINK  +run_diagnostics +read_sensors +get_schematic       ● ONLINE
```

- **Bezel:** steel frame, inset face, engraved labels (`--steel*`, `--face*`, `--brass*` tokens only; the palette test is extended to `src/ui/*.tsx`).
- **Banks:** four engraved rows, `CORE · NAV · ARCHIVE · COMMS`, one lamp per tool with its name beside it, wrapping within the row. Lamp states: **lit** (green) online; **dark** (dim) offline; **silenced** (red, `klaxon-lamp` blink) — the human watches the partner go quiet, bus by bus. A shielded bus gets a brass `SHIELDED` tag on its row. Buses are shown from chapter 1: they teach the reactor room's vocabulary before it matters.
- **Link lamp:** `LINKED` green when `modelContext` is present, `SEVERED` red blinking otherwise (the fallback banner still shows below, as today).
- **Ticker:** the last three events, newest first, in the ship's monospace: `HH:MM:SS › tool  input  ● STATUS`. Link events read `› LINK  +a +b −c  ● ONLINE` / `● OFFLINE` (whichever list is non-empty; both when both are). Status words are localized (`OK/REFUSED/ERROR/ONLINE/OFFLINE`, pt-BR `OK/RECUSADO/ERRO/ONLINE/OFFLINE`); tool names and input values are never translated.
- **Collapse:** `[▾]` folds the console to one line — `AUX LINK ● 5/31 · last: unlock_door ● OK` — persisted in `prefsStore.linkCollapsed`. Expanded by default.
- **Sound:** every call event triggers a short relay click (§4.4), so the agent is audible even when the human is looking at a valve.
- `role="region"` + `aria-label`, lamps with `aria-label` `<tool> online|offline|silenced`.

## 4. The soundscape — `src/audio/mixer.ts`

Diegetic only: everything is a sound the ship makes. No pads, no drones, no music; the RESTORE merge theme stays the one tonal phrase in the game.

### 4.1 Master and mute — `src/audio/sound.ts`

`sound.ts` keeps every cue as it is and gains a **master gain** node that every `tone()` and the mixer route through, plus `setMuted(muted: boolean)` (master gain 0/1, ramped over 60 ms) and `getAudioContext()` for the mixer. `startAmbience()` is replaced by `startMixer(store)`; the 55 Hz hum moves into the mixer as the reactive hum layer. The `AudioContext` is still created on the WAKE UP gesture.

### 4.2 Preferences — `src/game/prefs.ts`

```ts
export interface Prefs { version: 1; muted: boolean; linkCollapsed: boolean }
export const PREFS_KEY = 'derelict-prefs';
export const EMPTY_PREFS: Prefs = { version: 1, muted: false, linkCollapsed: false };
export function validPrefs(v: unknown): v is Prefs;
export function loadPrefs(): Prefs; export function setPref<K extends keyof Prefs>(k: K, v: Prefs[K]): void;
export const prefsStore: StoreApi<Prefs>;
```

Hydrated in `main.tsx` beside the meta. A bad value is `EMPTY_PREFS`. The HUD's SOUND toggle (`SOUND ●` / `SOUND ○`, engraved) writes `muted`; the mixer subscribes to `prefsStore` and calls `setMuted`.

### 4.3 Targets — pure

```ts
export interface MixTargets {
  room: RoomId;
  bed: number;              // 0 or 1 — the room layer's gain (0 once won)
  hum: { freq: number; gain: number };
  engineDrive: number;      // 0..1 — engineering turbine pitch/level
  lowpassHz: number;        // ambience bus filter: 12000 open, 2400 warning, 400 active wave
  tremoloHz: number;        // 0 off; 6 during an active wave
  reactorPulseHz: number;   // 0.8 calm, 1.6 warning, 2.4 active, 0.6 contained
  ritualTick: boolean;      // ritual.phase === 'armed'
}
export function mixFor(s: GameState): MixTargets;
```

- `hum.gain` = `0.004` with aux power off; `0.012 + 0.0004 × Σ powerAllocation` with it on. `hum.freq` = 55, or 58 once `enginesOnline`.
- `engineDrive` = `min(1, powerAllocation.engines / ENGINES_REQUIRED)`, plus `0.3` (capped at 1) once `enginesOnline`.
- Wave targets read `killswitch === 'active'` and `chapter3.wave`; when `won`, the filter is open, tremolo off, `bed` 0.
- **Comms rule:** `mixFor` never reads `chapter3.dish`, `beaconHeard`, or `beaconSignalFor`. On a dead-encoder ship the agent is the meter; a carrier the human could *hear* rise would solve the puzzle by ear. A test pins this by deep-equality across dish positions and beacon flags.

### 4.4 Layers — Web Audio, no assets

`startMixer(store)` builds: master ← ambience bus (lowpass + tremolo gain) ← one **room layer** at a time (crossfade 1.5 s on `room` change; the outgoing layer's nodes are stopped after the fade) plus the global layers (hum, ritual tick, relay click). Noise is a 2 s looped white-noise buffer generated at start. Random intervals (drips, creaks) use `Math.random` — they carry no gameplay.

| Room | Layer |
|---|---|
| cryo_bay | band-passed hiss (~2 kHz) with a slow amplitude LFO — the compressor breathing; an occasional tick |
| engineering | turbine: two detuned sawtooths (~110 Hz) through a lowpass whose cutoff and level follow `engineDrive` |
| bridge | near-silent high-passed hiss and a soft relay click every ~6 s |
| medbay | vitals monitor beep every 1.2 s (the player's own), fan noise |
| crew_quarters | vent noise only, the quietest room; a creak (noise burst through a resonant bandpass) now and then |
| hydroponics | drips (short sine pings, random 800–1400 Hz, through a feedback delay) and a fan whir with an LFO |
| cargo_bay | low rumble and metal creaks |
| reactor_room | 40 Hz sine pulsed at `reactorPulseHz` |
| core_vault | 60 Hz electrical hum with the 2nd and 3rd harmonics, quiet; a rising whine once `kernelSeated` |
| comms_array | band-passed static — independent of dish and beacon (§4.3) |

Global: the **hum** (freq/gain from targets, ramped with `setTargetAtTime`); the **ritual tick** (one relay click per second while `ritualTick`); the **relay click** on each link `call` event (the mixer subscribes to `linkStore`); the **bulkhead** cue (§5.2) as a `playBulkhead()` in `sound.ts` — a noise burst through a lowpass plus a low thunk.

The wiring is thin and untested; `mixFor` is where the logic lives and is tested.

## 5. Cold open and bulkheads

### 5.1 Cold open — `src/ui/ColdOpen.tsx` + `src/ui/coldOpen.ts`

The title screen stays (it carries the fallback banner, the how-to, resume/abandon, the ship plate of §7). The cold open plays **after WAKE UP, on a fresh run only**:

```ts
export function isFreshRun(s: GameState): boolean;
// chapter 1, room cryo_bay, !grateRemoved, breakersFlipped empty, toolCalls 0, checkpoint null, !won
export interface ColdOpenStep { id: 'vitals' | 'frost' | 'bulletin' | 'open'; at: number }
export function coldOpenSchedule(): ColdOpenStep[]; // at 0, 1800, 3400, 6200 ms; done at 7000
```

`App` shows the overlay when `isFreshRun(state)` and the run's seed is not in the session's `coldOpenSeen` set; on done (or skip) the seed is added. A resumed save that never left the pod plays it again; "wake again" from the epilogue and a ship-code wake play it for the new seed.

Four steps, one full-viewport overlay on the hull colour, instrument style:

1. **vitals** — a plate `CRYO POD 3 · THAW CYCLE` (NG+: `THAW CYCLE · AGAIN`, with `RUN n`), an ECG trace drawing itself left to right, core temperature counting `31.2 → 36.4 °C` on deterministic keyframes.
2. **frost** — an SVG frost layer (crystal polygons from a PRNG seeded with the ship's seed, `--parchment` at low opacity) clearing from the centre out via an animated mask radius.
3. **bulletin** — four lines printed typewriter-style: `MAIN COMPUTER: OFFLINE` / `AUX MODEL-CONTEXT LINK: ACTIVE` / `CREW LIFE SIGNS: 1` / `RECOMMENDATION: COOPERATE WITH IT.` (localized in `strings.ts`).
4. **open** — the `POD OPEN` lamp goes green, `playBulkhead()`, fade to the cryo bay.

Skippable at any moment by click, `Escape` or `Space`. Under `prefers-reduced-motion` the overlay shows the final frame — plate, all four lines, lamp lit — and a `CONTINUE` button; nothing auto-advances. `role="dialog"`, `aria-label`, focus moved into it and returned after.

### 5.2 Bulkhead transitions — `src/ui/Bulkhead.tsx`

`App` renders the scene inside `<Bulkhead room={room}>`. The component keeps `displayedRoom`; when the prop changes it runs `closing` (two steel door halves, CSS gradients on the tokens, slide shut over 180 ms with the destination room's name engraved on them) → swaps the child → `opening` (220 ms) → idle. `playBulkhead()` fires at the start of `closing`. It never runs on mount or on resume (`displayedRoom` initializes to `room`). Under reduced motion the swap is immediate and silent. The same doors serve chapter transitions; nothing special-cases the lower deck.

## 6. Ending vignettes and the FLIGHT RECORD

### 6.1 `src/scenes/EndingVignette.tsx` (defs prefix `ev-`)

A 480×200 deterministic SVG above the epilogue's text, `role="img"` with an aria-label per ending, animated with CSS keyframes and `animation-delay`; under reduced motion every element sits at its final frame. The hull silhouette is the deck map's path, exported as `HULL_PATH` from `DeckMap.tsx`. Stars are placed by a PRNG seeded with the ship's seed.

- **LEAVE** (`leave_unknowing` / `leave_knowing`): the hull receding; pod 2 a bright dot drifting right with a thruster flicker. When `beaconHeard`, pod one's dot pulses at the far edge (`beacon-halo`).
- **RESTORE:** the ten room boxes dark, lighting up green deck by deck in `ROOMS` order, the bridge last.
- **BROADCAST:** rings expanding from the comms array; relay dots lighting one after another to the edge, amber.
- **STAY:** pod one entering from the left along a dotted path to the docking clamps at engineering; the clamps close, brass.

### 6.2 `src/ui/FlightRecord.tsx`

An engraved plate under the epilogue text: `FLIGHT RECORD · ISV CORMORANT`, rows `HULL` (the ship code, §7, with `COPY LINK`), `RUN n`, `PROFILE CLASSIC|PLUS`, `CALLS n · BEST m` (from `meta.bestToolCalls`), `WAVES n`, three lamps `PROOF · BEACON · CONTAINED`, and four **ending lamps** `LEAVE · RESTORE · BROADCAST · —`: lit when the ending is in `meta.endingsSeen` or is the current one; the fourth is engraved `—` until STAY has been seen, then `STAY`. `compact` mode (the title screen, when `runsCompleted > 0` or a save exists) shows only `HULL`, `RUN`, and the four lamps — a dark unlabeled fourth lamp is the invitation to New Game+.

`COPY LINK` writes the ship link to the clipboard (`navigator.clipboard.writeText`, try/catch) and lights a `COPIED` lamp for 1.5 s; when the clipboard is unavailable it reveals the link in a read-only input, selected.

The epilogue's layout becomes: vignette → text panel (unchanged copy) → FLIGHT RECORD → buttons.

## 7. Ship codes — `src/game/shipcode.ts`

```ts
export const SHIP_PREFIX = 'CMR-';
export function encodeShipCode(seed: number, ngPlus = false): string;
// 'CMR-' + seed.toString(36).toUpperCase() + (ngPlus ? '+' : '')   → CMR-0 … CMR-ZIK0ZI, CMR-4X+
export function decodeShipCode(code: string): { seed: number; ngPlus: boolean } | null;
// trims, uppercases, prefix optional; seed an integer in [0, 2147483646]; anything else → null
export function shipFromSearch(search: string): { seed: number; ngPlus: boolean } | null;
// ?ship=CMR-4X first; else ?seed=177 (integer) with optional &plus=1 — the demo seeds keep working
export function shipLink(origin: string, seed: number, ngPlus: boolean): string; // `${origin}/?ship=${code}`
```

`App` reads the invite once at mount (`useState(() => shipFromSearch(location.search))`) and strips the parameter with `history.replaceState` so a reload does not re-offer it.

Title screen with a valid invite: a plate `HULL CMR-4X RECEIVED` and a `WAKE ON THIS SHIP` button that calls `resetGame(seed, { ngPlus })`, clears the saved-state hint and starts (the cold open follows). With a save present, `RESUME` stays beside it and the plate warns the wake abandons the current run. An invalid code shows one dim line, `hull number unreadable`, and the default flow. The `+` suffix is honoured only when `meta.runsCompleted >= 1` on this device; otherwise the ship wakes classic and the plate says `plus profile needs a completed run here` — STAY and the "ship remembers" lines are meta-gated and must not be entered with an empty memory.

## 8. Strings and palette

New namespaces in `src/ui/strings.ts`, both locales: `link` (labels, statuses, aria), `open` (the plate, the four bulletin lines, `CONTINUE`, skip hint), `record` (row labels, ending names, `COPY LINK`, `COPIED`), `ship` (invite plate, buttons, warnings), plus `hud.sound`. Machine values — tool names, ship codes, `HH:MM:SS`, input summaries — are identical across locales.

The palette test's glob grows to `../ui/*.tsx`; the new components use the tokens only.

## 9. Testing (target ≈ 315)

- `link.test.ts` — capacity (13 pushes keep the newest 12), `clearLink`, `summarizeInput` (pairs, arrays, nesting, truncation with `…`, empty).
- `tools.test.ts` — a call emits one event with the summarized input and `ok`; a refusing handler emits `refused`; a throwing handler emits `error`; the payload never appears in the event; `toolAvailability` reports `bus`/`readOnly`, and `silenced` true for an unshielded bus during an active wave and false when the bus is shielded or the tool is immune; **the contract snapshot unchanged**.
- `registry.test.ts` — `onChange` receives the initial online set and later `{ online, offline }` deltas; the registry without `onChange` behaves as before.
- `prefs.test.ts` — validation, load fallback, `setPref` persistence.
- `mixer.test.ts` — `mixFor`: hum follows aux power and allocation; `engineDrive` follows engines; the three wave states and `won`; `reactorPulseHz` per state; `ritualTick` only while armed; **comms independence** (identical targets across dish positions and `beaconHeard`).
- `coldOpen.test.ts` — `isFreshRun` true on a fresh reset (classic and NG+), false after `removeGrate`, after a tool call, on a checkpoint, when won; `coldOpenSchedule` order and total.
- `shipcode.test.ts` — round trip for 0, 177, 2147483646, NG+; prefix optional and case-insensitive; rejects negatives, floats, out-of-range, junk; `shipFromSearch` precedence (`ship` over `seed`), `plus=1`; `shipLink`.
- `palette.test.ts` — extended glob green.
- Gate: `npx vitest run && npm run build`.

## 10. Out of scope

- The items parked from the analysis: the human's discovery journal, hull sensors for the agent, the fragment's terminal, any new chapter (Ninety-Four Seconds, the EVA), a medbay puzzle, `adjust_atmosphere`.
- Music or tonal beds; recorded ambience; new dependencies; mobile; VO changes.
- Persisting the link buffer; a second AI voice; any change to `GameState`, `persist.ts`, tools' contract, rules or rituals.

## 11. Sequencing

One plan, tasks in this order, each leaving the game playable and green:

1. `shipcode.ts` + tests; the title plate, `WAKE ON THIS SHIP`, URL strip; the `+` gate.
2. `link.ts` + `mkTool` emission + registry `onChange` + `toolAvailability` fields; tests. `LinkConsole` replaces the header list; strings; palette glob.
3. `prefs.ts`, master gain + `setMuted` + `playBulkhead` in `sound.ts`, the SOUND toggle; `mixer.ts` (`mixFor` + layers) replacing `startAmbience`; tests.
4. `coldOpen.ts` + `ColdOpen.tsx`; `Bulkhead.tsx` around the scene; strings.
5. `EndingVignette.tsx` + `HULL_PATH`; `FlightRecord.tsx` (full and compact) + `COPY LINK`; epilogue and title layout.
6. README (console, sound, ship codes, test count), spec *Shipped* note, preview deploy, Mario's playthrough, merge + prod on "aprovado".
