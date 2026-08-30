# DERELICT: Remixed Ships — Design

**Date:** 2026-08-30
**Status:** Approved design (brainstormed with Mario, Aug 30). Second of the two replayability projects (E — New Game+ shipped Aug 30; this is **F**).
**Base:** `main` after Plan E (3 chapters + New Game+, 4 endings, 31 WebMCP tools, 230 tests; `secretsFor` append-only with seed 0 = the classic ship; `rulesFor` profiles; premium instrument standard).

## 1. Purpose

Seeded ships today differ in numbers — codes, pressures, combinations — but never in structure: every ship has the same three chapter-1 puzzles. Remixed ships make two random ships differ in *kind*: a seed may roll a patch bay instead of breakers, coils instead of a fuse, a drifting fix instead of a parallax fix. Chapter 1 is the highest-traffic deck (every run, classic and NG+, crosses it), so it gets the variants first; chapters 2–3 wait for a future F2 if this lands well.

## 2. Player-facing summary

Three chapter-1 rooms each have two puzzle variants — variant 0 is the shipped puzzle, variant 1 is new — chosen by the ship's seed (~50/50 per room, independent per room). The classic ship (seed 0) always rolls variant 0 everywhere. The agent keeps the exact same tools with the same schemas; only what they *read* follows the ship (the maintenance log describes the patch bay, the schematic describes coils, diagnostics name the variant's faults). New Game+ composes with no extra work: variants apply to every run.

| room | variant 0 (shipped) | variant 1 (new) |
|---|---|---|
| Cryo bay | three breakers in load order | **Patch bay P-7B** — three coloured cables into the right buses; ENERGIZE tests the wiring |
| Engineering | fuse cartridge + coolant valves | **Coils & gear** — the right coupling gear (tooth count) + three coil phase dials (0–11) |
| Bridge | parallax star fix (one slider, three glyphs) | **Drift correction** — track a drifting target with pitch/yaw; the reticle engraves three two-digit codes |

## 3. Variant derivation — `src/game/variants.ts`

- `variantFor(seed, room: 'cryo_bay' | 'engineering' | 'bridge'): 0 | 1` — pure. Seed 0 returns 0 for every room, always. Other seeds derive from a **dedicated PRNG stream** (`mulberry32(seed ^ salt(room))`, one salt constant per room) — `secretsFor`'s draw order is untouched and stays frozen (the frozen-seed test keeps passing unmodified). Roughly 50/50 per room, independent across rooms.
- `variantSecretsFor(seed)` (same module, same independent stream discipline):
  - `cableBuses: [number, number, number]` — a full permutation of buses 1–3 for red/green/blue;
  - `gearTeeth: { target: number; decoys: [number, number] }` — three distinct tooth counts in 13–29, one correct;
  - `coilPhases: [number, number, number]` — each 0–11;
  - `driftFix: [string, string, string]` — three two-digit codes (`'07'`–`'99'` style, zero-padded).
- Defined for every seed (including 0, even though the classic ship never uses them) so tests can pin determinism.
- Drift path parameters (lissajous amplitudes/periods) are shared constants, not secrets — only the codes vary.

## 4. State — `chapter1v`

```ts
interface Chapter1VariantState {
  sockets: [number | null, number | null, number | null]; // bus per cable, red/green/blue
  energized: boolean;   // last ENERGIZE press succeeded
  gear: number | null;  // seated tooth count
  phases: [number, number, number]; // coil dials, 0–11
}
```
- Outcomes stay in the existing flags: `auxPower` (cryo), `enginesOnline` (derived, now variant-aware), `starFixTaken`/`trajectorySet` (bridge). No new outcome state, no ritual/tool changes.
- Persisted in save v2 with fill-on-load defaults (same pattern as `chapter2`/`chapter3`); `validShape` checks sockets `null | 1–3` (distinctness not required — validation is shape, the store enforces the game rule), `energized` boolean, `gear` `null |` integer, phases three ints 0–11. Old saves load; a mid-variant save resumes exactly.

## 5. The puzzles

**Patch bay (cryo, v1).** Human: one cycle control per cable steps through buses 1–3, skipping a bus already taken by another cable (like the vault rack); **ENERGIZE** is a real button — correct permutation → `auxPower: true` (blip, same downstream as breakers); wrong → the panel blips off, sockets keep their state, no penalty beyond the tell. Store: `plugCable(cable: 0|1|2, bus: number | null)`, `energize(): ActionResult`. Agent: `read_maintenance_log` returns the variant sheet — `PATCH BAY P-7B — red → bus <n>, green → bus <m>, blue → bus <k>. ENERGIZE only after all three seat; the panel forgives nothing and remembers less.` (EN/pt-BR; colours and the machine code `P-7B` invariant).

**Coils & gear (engineering, v1).** Human: a gear tray (three gears, tooth counts engraved as real drawn teeth — counting them is the puzzle, like the fuse bands) with one seatable at a time (`seatGear(teeth)`); three coil phase dials 0–11 (`setPhase(index, value)`, cycle buttons with clock-position marks). Agent: `get_schematic engine_feed` (variant) gives the target tooth count and the three phases; `run_diagnostics engines` (variant) reports faults in the variant's terms ("coupling gear seated but wrong tooth count — carries no torque", "coil B out of phase"). `enginesOnline` (variant 1) = `power ≥ ENGINES_REQUIRED && gear === target && phases match`. The fuse/valves do not exist on this ship (and the coolant panel's copy adapts: the manifold reads nominal).

**Drift correction (bridge, v1).** Human: the viewport shows a drifting amber target (deterministic lissajous over a time tick); two sliders (pitch 0–100, yaw 0–100) move the reticle; when the target sits inside the ring (tolerance window as the parallax variant's 47–53), `takeStarFix()` fires and the reticle engraves the three two-digit codes. Agent: `compute_escape_trajectory({ symbols })` unchanged — validation reads the variant-aware fix (`driftFix` instead of `starFix` when variant 1); the tool's description already says "three symbols read at the viewport". Store: `setAim(axis: 'pitch' | 'yaw', value)` as local scene state OR reuse the existing local-slider pattern (the parallax variant keeps `alignment` local; the drift variant keeps pitch/yaw local too — only `starFixTaken` hits the store, via the same `takeStarFix()`).

## 6. Agent surface

No new tools, no schema changes, no description changes. Variant-aware **content** only: `getMaintenanceLog(seed)` (patch-bay sheet on variant 1), `getSchematics()` → `getSchematics(seed)` (engine_feed sheet varies; power/coolant adapt one line each), `run_diagnostics` fault lists, `read_sensors` coolant channel reads nominal on variant 1. Machine codes (`P-7B`, tooth counts, phase numbers, the fix codes) identical across locales. `get_ship_status` is untouched — the agent discovers the ship by reading, like the human does by looking.

## 7. Scenes (premium standard)

- `PatchBay` (defs `pb-`): steel bezel, three brass sockets with lamps, woven bezier cables in red/green/blue (scene-material colours, like hydroponics' soil/water), engraved `P-7B` plate, ENERGIZE as a real button; cables settle with the standard transition.
- `GearAndCoils` (defs `gc-`): gear tray in the fuse-tray mould with real drawn teeth; three coil dials with engraved clock marks; a coupling lamp.
- `DriftViewport` (defs `dv-`): reuses the star-field visual language; amber drifting target; industrial sliders; the ring closes green on centre; the codes engrave on plates like today's glyphs.
- The existing scenes swap only the puzzle panel by `variantFor(seed, room)`; intro, photo, doors, sealed log, launch console are untouched. Deterministic geometry, palette tokens, reduced-motion, `role="img"` + aria-labels, real controls.

## 8. Testing

~+30 tests: `variants.test.ts` (purity/determinism; seed 0 → 0/0/0; distribution sanity over 400 seeds; secrets well-formed — full permutation, distinct tooth counts, phases 0–11, zero-padded codes); store (plug/energize right and wrong; gear+phases → engines with diagnostics faults asserted; drift fix accepted by `computeTrajectory` on a variant-1 ship); derived variant-aware; tools content per variant (contract unchanged — same names/schemas asserted); i18n machine codes; persist fill + rejections. The frozen-seed secrets test stays untouched and green.

## 9. Out of scope

- Chapter 2–3 variants (F2, if F lands well); more than one new variant per room; variant choice by the player; any tool/schema change; mobile.

## 10. Sequencing

One plan (F) on `directors-cut`, superpowers SDD, final review on the most capable model, Vercel preview, Mario's playthrough (including a seed that rolls all three variants — the plan's last task finds and names one), then merge to `main` + prod.

---

**Shipped 2026-08-30** — 253 tests; chapter-1 structural variants live (patch bay / coil drive / drift fix, one per room, drawn on a dedicated PRNG stream; seed 0 and every pre-existing ship untouched).
