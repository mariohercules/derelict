# DERELICT: New Game+ — Design

**Date:** 2026-08-30
**Status:** Approved design (brainstormed with Mario, Aug 30). First of two replayability projects: **E — New Game+** (this document) and **F — Remixed ships** (per-room puzzle variants, its own spec later).
**Base:** the shipped Director's Cut + Polish (`main` @ Plan D: 3 chapters, 10 compartments, 29 WebMCP tools, 3 joint-ritual endings, seeded ships, EN/pt-BR, 198 tests). Everything here extends that game; no puzzle, secret or tool of the base game changes.

## 1. Purpose

A finished player has no reason to wake up again except curiosity about the other endings. New Game+ gives the second run its own shape: the ship runs on a tighter clock, the link remembers what the medic cannot, and a fourth ending — STAY — exists only for a crew that has already walked the other three roads.

Three levers, one foundation: a small **meta-save** that survives runs.

## 2. Player-facing summary

- After any ending, the epilogue offers **"Wake up again — New Game+"** (once at least one run is complete). A new ship (new seed) starts with `ngPlus` on; the HUD carries a **NEW GAME+** plate.
- **Pressure:** shorter ritual windows, faster wave cycles, the kill-switch wakes the moment the Kestrel is named, shielding costs more. Puzzles and secrets are the base game's.
- **The ship remembers:** the cryo-bay opening, the emergency bulletin, the sealed log, the fragment's third memory segment, pod one's beacon and the epilogue all acknowledge the previous run.
- **STAY:** in NG+, with all three prior endings seen, the kill-switch contained and pod one's beacon heard, a docking-clamp panel appears in Engineering. The agent hails pod one, the human holds the clamps open, the agent confirms the dock. Nobody leaves, nobody merges, nobody shouts; nine people come aboard and the fragment stays itself.

## 3. Meta-save

`derelict-meta` in `localStorage`, separate from the run save (`derelict-save-v2`).

```ts
interface Meta {
  version: 1;
  runsCompleted: number;
  endingsSeen: EndingId[];      // unique, insertion order
  lastEnding: EndingId | null;
  lastSeed: number | null;
  bestToolCalls: number | null; // fewest tool calls over a completed run
}
```

- **Read** once in `main.tsx` before `App` mounts, into a `metaStore` (`src/game/meta.ts`, same shape as `localeStore`); `getMemory()` is the accessor narrative uses. A missing or malformed value yields the empty meta (`runsCompleted: 0`, `endingsSeen: []`, nulls) — the game never depends on it to run.
- **Write** once per run: a subscriber next to `startPersisting()` records the run when `state.won` flips `false → true` (`prevState.won === false`), using `state.ending`, `state.seed`, `state.toolCalls`. "Abandon previous run" and "Wake up again" never touch it.
- Strict validation on read (version, integer fields ≥ 0, ending enum membership); anything else → empty meta.

## 4. The `ngPlus` flag and entry

- `GameState.ngPlus: boolean` (save v2, filled `false` for older saves; validated as boolean). Set only by `resetGame(seed?, { ngPlus })`.
- Epilogue: beside "Wake up again", **"Wake up again — New Game+"** when `meta.runsCompleted ≥ 1`; it calls `resetGame(undefined, { ngPlus: true })` (a fresh random seed — never the classic ship, never the previous seed).
- HUD: a `NEW GAME+` plate next to AUX/ENGINES while `ngPlus`. The title screen's checkpoint line is unchanged.
- Nothing else carries over: no tools online early, no inventory, no repeated secrets.

## 5. Pressure — `rulesFor(state)`

A pure selector in `src/game/rules.ts` returns one of two profiles; the base constants become the `classic` profile.

| rule | classic | plus |
|---|---|---|
| LEAVE window | 45 s | 30 s |
| RESTORE / BROADCAST / STAY windows | 60 s | 40 s |
| wave cycle calm / warning / active | 30 / 10 / 20 s | 20 / 8 / 25 s |
| kill-switch wakes | first step into a chapter-3 room | on `analyze_sample` (clock starts in the cargo bay; the first wave is still preceded by its warning) |
| shield cost per bus | 5u | 6u (full containment = 24u; with life support at its 15u floor and doors free, 1u to spare — tight on purpose) |

- `ritual.ts`: `armRitual(r, id, now, windowMs)` takes the window from the profile (`RITUALS[id].windowMs` remains the classic default for callers that pass nothing).
- `killswitch.ts`: `waveAt(start, now, cycle)`/`secondsToNextPhase(start, now, cycle)` take the cycle timings; `suppressed()` unchanged.
- `store.ts`: `analyzeSample` wakes the kill-switch when `rulesFor(s).wakeOn === 'kestrel'`; `enterRoom` keeps the classic wake; `cutIsolation`/`nextShieldCost`/`routePower`'s isolation floor use the profile's shield cost; `tickKillswitch` and the HUD banner use the profile's cycle.
- Secrets, tool schemas, puzzle constants (`WATER_BUDGET`, valve targets, etc.) untouched.

## 6. The ship remembers

All keyed on `ngPlus` and `getMemory()`; every line in EN and pt-BR; machine codes invariant.

| surface | NG+ addition |
|---|---|
| Cryo bay intro (`strings.cryo`) | "You have done this before. You do not remember it. The link does." |
| `read_emergency_bulletin` | `PRIOR SESSION — link reports a previous run, ended by <LEAVE / RESTORE / BROADCAST / STAY>.` |
| Sealed log (`strings.bridge.sealedLine` area) | "This is not the first time you have read this." |
| `query_fragment_memory` stage 3 | closing paragraph: "Prior instance record: <ending>. I was the one who left / who became the ship / who burned the band / who waited. I remember all of it. You remember none of it." — from `endingsSeen` |
| `listen_beacon` (aligned) | pod one's loop gains "…we can come to you, if the clamps are open." |
| Epilogue | "Run <n> of the ISV Cormorant." |

## 7. STAY — the fourth ending

- **Prerequisites** (all): `ngPlus`; `meta.endingsSeen` contains `restore`, `broadcast` and a LEAVE (`leave_unknowing` or `leave_knowing`); `killswitch === 'contained'`; `chapter3.beaconHeard`. `get_ship_status` in NG+ reports `stay_available: boolean` plus a `stay_hint` naming the missing prerequisite in fiction.
- **Where:** Engineering. A new panel, *Docking clamps — pod one* (`DOCK-1`), renders only when the prerequisites hold: an SVG clamp pair with hinges and a docking lamp, a hold control **HOLD CLAMPS OPEN**, and the countdown.
- **Ritual `stay`:** agent arms with **`hail_pod_one`** (available when the prerequisites hold; refuses unless the crew member is in Engineering — two-operator rule, like `initiate_launch_sequence` and the bridge); window from the profile (60 s / 40 s); human holds; agent confirms with **`dock_pod_one`** (available while `isArmed(ritual, 'stay')`). Expiry resets to idle like LEAVE; the agent re-arms.
- **Outcome:** `won`, `ending: 'stay'`. Epilogue title **POD ONE DOCKED**; outro: nine people through the hatch, Vasquez's objection answered; the fragment stays what it is, with witnesses aboard; "The Cormorant keeps its secret with nine people to tell it." Stats line of its own.
- **Tools:** `hail_pod_one` (bus COMMS), `dock_pod_one` (bus NAV) — 31 total. Both suppressible in principle; containment is a prerequisite, so waves are over by then.
- No new room, no map change.

## 8. Technical deltas

1. `types.ts`: `EndingId` += `'stay'`; `RitualId` += `'stay'`; `GameState.ngPlus`.
2. `meta.ts` (new): `Meta`, `metaStore`, `loadMeta()`, `recordRun(state)`, `getMemory()`; `main.tsx` wiring.
3. `rules.ts` (new): `Rules`, `rulesFor(s)`; `ritual.ts`/`killswitch.ts`/`store.ts`/HUD read it.
4. `store.ts`: `resetGame(seed?, opts?)`; `analyzeSample` wake under `plus`; `hailPodOne(now?)`, `confirmDock(now?)`; STAY gating selector `stayAvailable(s)` in `derived.ts` (takes the memory).
5. `persist.ts`: `ngPlus` fill/validate; enums extended.
6. `tools.ts`: two tools; bulletin/beacon/fragment getters take the memory; `get_ship_status` NG+ fields.
7. `narrative.ts`: NG+ variants (EN/pt-BR).
8. Scenes: Engineering docking panel; Epilogue NG+ button + `stay` variant; HUD plate; cryo/bridge lines.
9. Tests: `meta.test.ts`, `rules.test.ts`, `store.stay.test.ts`, persist/tools/i18n additions; existing ritual/kill-switch tests become the `classic` profile.

## 9. Out of scope

- Remixed puzzles (project F), voice-over assets (separate), mobile layout, multiple humans, a second AI voice.
- Carrying tools/progress across runs; replaying the same seed.

## 10. Sequencing

Ship as one plan (E) on `directors-cut`, merged to `main` + prod after Mario's preview playthrough — a full NG+ run to STAY on a fresh meta (three endings first, then the fourth).

**Shipped Aug 30, 2026** — 230 tests, 31 tools. Okafor's recorder also gained its recorded EN/pt-BR performance (edge-tts drafts approved by Mario; `src/assets/okafor-{en,pt}.mp3`; speechSynthesis stays as the fallback) — spec §7.6 of the Director's Cut design, closed.
