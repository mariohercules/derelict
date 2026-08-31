# DERELICT: Remixed Ships, Chapter 2 — Design

**Date:** 2026-08-30
**Status:** Approved design (brainstormed with Mario, Aug 30). Follow-up to Plan F (chapter-1 variants, shipped Aug 30); this is **F2**. Chapter 3 (rack + dish) is deferred to **F3**.
**Base:** `main` @ `0fc559f` — 3 chapters + New Game+, 4 endings, 31 WebMCP tools, 253 tests; `secretsFor` append-only with seed 0 = the classic ship; `variantFor`/`variantSecretsFor` on dedicated PRNG streams (`src/game/variants.ts`); premium instrument standard.

## 1. Purpose

Plan F made chapter 1 differ in *kind* between ships. Chapter 2, "The Investigation", still has one shape per room on every ship: the three-wheel safe, the water budget with visible need tags, the crane driven to a coordinate. F2 gives each of the three puzzle rooms a second puzzle chosen by seed, so the middle of the game remixes the way the opening does.

Two chapter-2 rooms are deliberately excluded. The **medbay** has no puzzle (examine a strip; no failure state, no gate) — there is nothing to vary. The **reactor room** (chapter 3) is the kill-switch engine — timing and power arithmetic, no secret — and varying it is a rules change, which is New Game+'s domain, not a structural variant.

## 2. Player-facing summary

Any ship may wake with, independently:

- **Crew quarters:** a cabin safe with a **mechanical key lock** instead of three wheels. The captain's spare key is taped behind one of Amara's six drawings on the wall; only the crew manifest — agent-only — says which. Find the key, turn it, the private log comes online.
- **Hydroponics:** the beds' brass **need tags are corroded** to illegibility. The pump's moisture probe reads a bed only when its line is closed, so the protocol becomes: close every valve, the agent runs a sweep and reads the deficits, the crew member sets the valves, the agent runs the cycle. The classic ship gives the human every number; the variant gives them to the agent.
- **Cargo bay:** the bay was **re-racked after the storm** — three slots carry two crates, and the quarantine container is on the *lower* tier. The crane holds one crate at a time and gains a LOWER control: lift the pallet off the top, park it on any single-tier slot, come back, lift the container. Logistics instead of a drive to a coordinate.

Seed 0 — the classic ship — never rolls a variant. Every pre-existing ship keeps its secrets: chapter-1 variant draws are frozen exactly as shipped, and the new draws append after them.

## 3. Variant derivation — `src/game/variants.ts`

`VariantRoom` grows to `'cryo_bay' | 'engineering' | 'bridge' | 'crew_quarters' | 'hydroponics' | 'cargo_bay'`. `ROOM_SALTS` gains three fixed constants:

```ts
crew_quarters: 0x3d7e9a51,
hydroponics:   0x92b4c6e8,
cargo_bay:     0x4f81d2a7,
```

`variantFor(seed, room)` is unchanged: `CLASSIC_SEED` → 0 in every room; otherwise one draw on `prng((seed ^ salt) >>> 0)`, `< 0.5` → 0, else 1. Each room rolls independently (~50%); across both chapters a ship now has six coins, so roughly 1 in 64 rolls every variant.

`variantSecretsFor(seed)` appends **after `driftFix`** — the chapter-1 fields are in production and their draw positions are frozen forever:

```ts
keyDrawing: number;               // 0–5: which of Amara's drawings hides the key
stackSlots: [number, number];     // two distinct slot indices 0–8, both ≠ the quarantine slot index (row*3+col)
```

`keyDrawing` is a single `int(0, 5)`. `stackSlots` are drawn with a reject-and-redraw loop (duplicates and the quarantine index are rejected), so its draw count varies per seed: **any future field appends after `stackSlots`**, never between. The comment in `variants.ts` that today names `driftFix` as the append point moves to `stackSlots`.

Hydroponics draws nothing new: the variant reuses `secretsFor(seed).waterNeeds` (three needs 1–5, sum ≤ 10) — the same numbers, hidden from a different side.

Two helpers live beside the derivation:

- `DRAWINGS = ['rocket', 'cake', 'cat', 'cormorant', 'sun', 'family'] as const` — the fixed subjects of the six wall drawings, indexed by `keyDrawing`.
- `tiersFor(seed): number[]` — nine entries, 1 or 2 crates per slot: `2` at the quarantine index and at both `stackSlots` when `variantFor(seed, 'cargo_bay') === 1`, otherwise all `1`.

**Frozen guard.** `variants.test.ts` gains `FROZEN_VARIANT_8`: the four Plan F fields of `variantSecretsFor(8)` (`cableBuses`, `gearTeeth`, `coilPhases`, `driftFix`) pinned to their shipped values, the way `secrets.test.ts` pins `FROZEN_1234`. Any insertion before `driftFix` breaks it.

## 4. State — `chapter2v`

```ts
chapter2v: {
  keyFound: boolean;   // crew quarters: the key is out from behind the drawing
  held: boolean;       // cargo bay: the crane's hook carries a crate
  tiers: number[];     // cargo bay: crates per slot, 9 entries of 1 or 2
}
```

Initial value: `keyFound: false, held: false, tiers: tiersFor(seed)` — set in `resetGame(seed)` (both classic and NG+ resets). Outcomes land in the **existing** chapter-2 flags, exactly as Plan F landed its outcomes in `auxPower`: `chapter2.safeOpened`, `chapter2.crateLifted`, `chapter2.irrigationSolved` / `lastCycle`. Downstream gates (`decrypt_private_log`, `analyze_sample`, `read_data_spike`, the atomic chapter-3 transition in `analyzeSample`) do not change.

### Store actions

All chapter-2 variant actions go through one `patch2v` helper, mirroring `patch1v`. Every new action refuses on the classic ship, and the classic action it replaces refuses on the variant ship, so the store stays consistent whichever panel a stale UI shows.

- `liftDrawing(index: 0 | 1 | 2 | 3 | 4 | 5): ActionResult` — requires `room === 'crew_quarters'`, `variantFor(seed, 'crew_quarters') === 1`, `!keyFound`. `index === variantSecretsFor(seed).keyDrawing` → `keyFound: true`, message "A brass key, taped to the back." Otherwise `{ ok: false }` naming the drawing ("Nothing behind the cat.") and **no state change** — wrong lifts are not recorded.
- `turnSafeKey(): ActionResult` — requires room, variant 1, `keyFound`, `!safeOpened` → `chapter2.safeOpened: true`; success message mirrors `dialSafe`'s.
- `dialSafe(combo)` — on a keyed ship returns `{ ok: false, message: 'This safe has no wheels.' }` before comparing anything.
- `lowerCrate(): ActionResult` — requires `room === 'cargo_bay'`, `variantFor(seed, 'cargo_bay') === 1`, `held`, and `tiers[at] === 1` at the crane's current slot → `tiers[at] = 2`, `held: false`. Refuses with "Nothing on the hook" / "That slot is already two high."
- `liftCrate()` — gains the variant branch. Let `at = craneAt.row*3 + craneAt.col`:
  - `held` → refuse: "The crane holds one crate. Lower it first."
  - `tiers[at] === 2` → lift the upper crate: `tiers[at] = 1`, `held: true`, ok message ("Ration pallet on the hook. Park it on a single-tier slot.").
  - `tiers[at] === 1` and `at` is the quarantine slot → the classic success path: `crateLifted: true`.
  - otherwise → the classic refusal.
  - Re-covering is allowed (lowering the pallet back onto the quarantine slot); nothing prevents it, nothing rewards it.
- `moveCrane(dir)` — unchanged; moving while holding is allowed.
- `runIrrigation()` — on a hydroponics-variant ship the report gains `deficits: (number | null)[]`: for each bed, the bed's need when its valve is `0` (the probe reads a closed line), `null` when the valve is open. Bed states, `overBudget`, `solved`, `irrigationSolved` and `lastCycle` are computed exactly as today (a closed bed reads `dry`). The message branches: a sweep with every valve closed says "Moisture sweep: bed 1 reads −4, bed 2 −3, bed 3 −3. The tags are gone — you are the tags now; read the crew member the numbers." A cycle with any valve open uses the classic messages. Classic ships never emit `deficits` — the field is absent, the payload byte-identical.

No derived predicate changes: `irrigationReportFor`, `rackCorrect`, `stayBlocker` etc. are untouched. The three new store predicates a scene needs are tiny selectors: `keyFound`, `held`, `tiers` read straight from the slice.

## 5. The puzzles — human side

**Crew quarters (variant 1).** The `Safe` panel swaps its three wheels for a **keyed lock plate**: steel plate, brass bezel, engraved `SAFE — KEYED`, a keyhole, and a real `TURN KEY` control that is disabled until `keyFound`. The wall panel (today decorative) becomes `DrawingWall`: six framed drawings in a fixed order — *rocket, cake, cat, the Cormorant, the sun, family* — each a `role="button"` with an aria-label naming the subject. Clicking one calls `liftDrawing(i)`: a wrong drawing tilts and settles back (transform, reduced-motion aware); the right one tilts and a brass key renders beneath it, then the lock plate's control activates. Brute force in six clicks is accepted by design (the patch bay has six permutations); the agent's manifest line is the intended pointer and the relay is the game.

**Hydroponics (variant 1).** The three brass need tags render **corroded** — scratched plates with deterministic marks keyed on bed index, no legible number. Sliders (0–9), the budget meter and the three bed lamps are unchanged. One instrument is added on the manifold: the **MOISTURE PROBE** lamp, lit when the last cycle was a sweep (`lastCycle !== null` and some valve is `0`; `setIrrigation` already clears `lastCycle`, so the lamp goes dark the moment a valve moves). Nothing on the human's side shows a number: the sweep numbers exist only in the agent's report.

**Cargo bay (variant 1).** `CraneDeck` is replaced by `StackedDeck`: the same 3×3 stack drawn in light isometric perspective so a second tier reads at a glance, a **HOOK** lamp on the crane housing lit while `held`, and a fifth engraved control, **LOWER**, beside the four direction buttons (disabled unless `held`). Lifting at a two-tier slot takes the upper crate; LOWER at a single-tier slot parks it. The exposed quarantine container lifts into the classic `HullFragment` plate, which is unchanged. Per-crate wear stays keyed on grid index only; the scene never reads the secret slot before the lift (the existing rule).

## 6. Agent surface — content only, contract unchanged

No tool is added, renamed, re-described or re-schemed. `get_ship_status` is untouched. Content varies through the existing getters, branching on `variantFor(seed, room)` the way `getMaintenanceLog` does:

- **`access_crew_manifest`** → `getCrewManifest(seed)`: on a keyed ship the Vasquez line replaces "Cabin safe keyed to its last three, per a regulation nobody follows but her." with "Commission {n}. Cabin safe is a mechanical lock; her spare key is logged with the quartermaster — taped behind Amara's drawing of the **{subject}**." The commission number stays printed. Subjects are localized (EN/pt-BR); agent and human share the page, so they share a locale.
- **`run_irrigation`**: the `deficits` field and sweep message from §4. The tool description already promises three beds, a 10-unit budget and dry/ok/flooded — all kept.
- **`query_manifest`** → `getCargoManifest(seed)` plus the JSON: on a stacked ship the text becomes "Slot {slot}, LOWER tier — re-racked after the storm with a ration pallet on top. The crane holds one crate; park the pallet on any single-tier slot first." and the payload adds `tier: 'lower'` beside the unchanged `quarantine_slot`. Classic ships keep the classic text and no `tier` field.
- `decrypt_private_log`, `analyze_sample`, `read_data_spike`, `get_schematic`, `read_sensors`, `run_diagnostics`: untouched.

Machine values — the slot label, the deficits, `tier` — are identical across locales.

## 7. Scenes (premium standard)

Every new graphic meets the instrument standard: steel/brass/parchment palette tokens, bezels and engraved labels, deterministic SVG (no randomness at render), per-scene defs prefixes, `role="img"` with aria-labels on instruments, real controls with visible focus, `prefers-reduced-motion` respected.

- `src/scenes/KeyedSafe.tsx` (defs `ks-`) — lock plate + key + TURN KEY; and `DrawingWall` (same file or `DrawingWall.tsx`, defs `dw-`) — six child-drawn subjects in parchment strokes, framed, each a button.
- `src/scenes/Hydroponics.tsx` — `CorrodedTags` in place of the need tags, MOISTURE PROBE lamp on the manifold (existing `hp-` prefix).
- `src/scenes/StackedDeck.tsx` (defs `sd-`) — stacked crates, hook lamp, LOWER control.
- Hosts swap only the puzzle panel: `CrewQuarters.tsx` (safe + wall), `Hydroponics.tsx` (tags), `CargoBay.tsx` (deck). Intro copy, the recorder, the vines, `SpikeBed`, `HullFragment` are shared.
- New copy lives in `src/ui/strings.ts` under `quarters`, `hydro`, `cargo` for both locales.

## 8. Persistence — `src/game/persist.ts`

`validShape` validates `chapter2v` by shape only: `keyFound` and `held` booleans; `tiers` an array of exactly 9 integers each 1 or 2. A save without the slice (every pre-F2 save) is filled with `keyFound: false, held: false, tiers: tiersFor(seed)`. That fill is correct for old saves that now roll a cargo variant: if `crateLifted` is already true the scene shows the plate regardless of tiers; if not, the bay is simply stacked when they return. No other migration.

## 9. Testing (target ≈ 275)

- `variants.test.ts` — seed 0 → 0 in all six rooms; distribution and independence of the three new rooms over 400 seeds; `keyDrawing` in 0–5; `stackSlots` distinct and ≠ quarantine index; `tiersFor` shape (nine entries, exactly three 2s on a stacked ship, all 1s otherwise); **`FROZEN_VARIANT_8`**.
- `store.variants.test.ts` — keyed safe: wrong drawing leaves state untouched, right drawing → `keyFound`, `turnSafeKey` → `safeOpened` → `decrypt_private_log` available; `dialSafe` refuses on a keyed ship. Sweep: all valves 0 → `deficits` equals `waterNeeds`, open beds read `null`, then the correct settings → `solved`, `lastCycle`, `retrieveSpike`. Stack: lift at a two-tier slot → `held`, second lift refused, LOWER on a two-tier slot refused, park on a single-tier slot, return, lift → `crateLifted`, `analyze_sample` → chapter 3 in the same atomic write. Classic ship byte-identical: no `deficits`, no `tier`, `dialSafe`/`liftCrate` unchanged.
- `tools.test.ts` — the three contents through the tool surface (manifest line names the drawing, sweep deficits, `tier: 'lower'`), plus a snapshot of every tool's name, description and input schema proving the contract unchanged.
- `i18n.test.ts` — slot label, `tier`, deficits identical EN/pt-BR; the manifest line in each locale names a subject from that locale's list.
- `persist.test.ts` — `chapter2v` fill on load (tiers from seed), rejections for a 8-entry `tiers`, a `3`, a non-boolean `held`.
- The gate stays `npx vitest run && npm run build`.

## 10. Out of scope

- Medbay and reactor room (no puzzle / rules domain, see §1). Chapter 3 variants (core-vault rack, comms dish) → **F3**.
- New tools, schema or description changes. New dependencies.
- Changing `secretsFor` or any chapter-1 variant draw.
- NG+ rule interplay: `rulesFor` is untouched; variants and profiles compose without coordination.
- A seed picker. Demo seeds are computed in the final task, as in Plan F.

## 11. Sequencing

1. `variants.ts`: rooms, salts, `keyDrawing`, `stackSlots`, `DRAWINGS`, `tiersFor`, the moved append-point comment; `FROZEN_VARIANT_8` guard.
2. Store: `chapter2v`, `patch2v`, `liftDrawing`/`turnSafeKey`/`lowerCrate`, the `liftCrate`/`dialSafe`/`runIrrigation` branches; `persist.ts` validation and fill.
3. Narrative + tools content: `getCrewManifest`, `getCargoManifest` + `tier`, sweep message; contract snapshot test; i18n strings.
4. `KeyedSafe` + `DrawingWall`, swapped into `CrewQuarters.tsx`.
5. `CorrodedTags` + MOISTURE PROBE in `Hydroponics.tsx`.
6. `StackedDeck`, swapped into `CargoBay.tsx`.
7. README ("every ship is unique" gains chapter 2, real test count), spec *Shipped* note, demo seeds, preview, Mario's playthrough, merge + prod on "aprovado".
