# DERELICT: Remixed Ships, Chapter 3 — Design

**Date:** 2026-08-31
**Status:** Approved design (brainstormed with Mario, Aug 31). Third and last of the remixed-ships plans (F: chapter 1, F2: chapter 2); this is **F3**.
**Base:** `main` @ `7def2a6` — 3 chapters + New Game+, 4 endings, 31 WebMCP tools, 271 tests; `variantFor`/`variantSecretsFor` on dedicated PRNG streams (`src/game/variants.ts`, six rooms); `chapter1v`/`chapter2v` slices; tool contract pinned by snapshot; premium instrument standard.

## 1. Purpose

Chapters 1 and 2 now differ in *kind* between ships. Chapter 3, "The Truth", still has one shape per puzzle room: the memory rack arranged by position, the dish steered to a bearing the agent reads out. F3 gives each of the two chapter-3 puzzle rooms a second puzzle chosen by seed, so every phase of the game remixes.

The **reactor room** never varies: it is the kill-switch engine — timing and power arithmetic, no secret — and varying it is a rules change, New Game+'s domain. (The medbay, chapter 2, has no puzzle; also excluded, as in F2.)

## 2. Player-facing summary

Any ship may wake with, independently:

- **Core vault:** a **sequenced rack**. The four memory columns sit in a loading tray; any cradle will take any column — what matters is the **order of loading**. The rack spins each column up in a chain and validates only on the fourth: right, and the rack is live; wrong, and it spins down and ejects all four back to the tray. The agent's rack schematic gives the order, as it always did. Classic = spatial arrangement (which cradle); variant = temporal order (which first).
- **Comms array:** a **dead encoder**. The dish still steers in azimuth and elevation with the same two sliders, but the degree readouts are burnt out — no numbers anywhere on the human's side. The agent becomes the meter: `listen_beacon` off-target reports **signal strength** and which axis dominates the error instead of the bearing. A cooperative hot/cold search, six rounds or so; the lock lamp lights on alignment as it always did. Classic = the agent reads the bearing and the human sets it; variant = the human moves and the agent reads.

Seed 0 — the classic ship — never rolls a variant. No secret is redrawn: both variants reuse the classic secret of their room (`columnOrder`, `beaconBearing`), so `variantSecretsFor` and `FROZEN_VARIANT_8` are untouched.

## 3. Variant derivation — `src/game/variants.ts`

`VariantRoom` grows to eight rooms: `… | 'core_vault' | 'comms_array'`. `ROOM_SALTS` gains two fixed constants:

```ts
core_vault:  0x6c2e8f13,
comms_array: 0xa17d4b59,
```

`variantFor(seed, room)` is unchanged: `CLASSIC_SEED` → 0 everywhere; otherwise one draw on `prng((seed ^ salt) >>> 0)`, `< 0.5` → 0, else 1. Each room rolls independently (~50%); a ship now has eight coins (about 1 in 256 rolls every variant).

`variantSecretsFor` gains **no field**. The sequenced rack's order *is* `secretsFor(seed).columnOrder`; the dead encoder's target *is* `secretsFor(seed).beaconBearing`. The append-point comment (`stackSlots`) stays as it is.

One pure helper lives in `src/game/derived.ts` beside `dishAligned`:

```ts
beaconSignalFor(seed, dish: { az; el }): { strength: number; axis: 'az' | 'el' | 'both' }
```

`daz = |dish.az − target.az|`, `del = |dish.el − target.el|` (no azimuth wrap — the same arithmetic as `dishAligned`), `dist = √(daz² + del²)`, `strength = round(100 · (1 − min(1, dist / 180)))` — 180° or more away reads 0, 90° reads 50, 3° reads 98. `axis` is `'az'` when `daz > del + 3`, `'el'` when `del > daz + 3`, else `'both'`. Deterministic; testable without the UI.

## 4. State — `chapter3v`

```ts
chapter3v: {
  seated: ColumnId[];   // sequenced rack: the loading order so far, 0–4 distinct columns
}
```

Initial value `{ seated: [] }` (both classic and NG+ resets). The comms variant needs no state: signal strength derives from `chapter3.dish` against the secret at every `listen_beacon`. Outcomes land in the existing state exactly as F and F2: `rackCorrect` (derived) and, through it, `kernelSeated`, `fragmentStage`, `cacheRead`; `beaconHeard` through `hearBeacon`.

### Derived

`rackCorrect(s)` branches: on a sequenced ship (`variantFor(seed, 'core_vault') === 1`) it is `seated.length === 4 && seated.every((c, i) => c === columnOrder[i])`; otherwise the classic comparison of `chapter3.rack`. Everything downstream — `seatKernel`, `read_prime_cache` availability and handler, `queryFragmentMemory`, the `cacheRead → openBand` chain, the RESTORE and BROADCAST rituals, `stayBlocker` — is unchanged by construction.

### Store actions

All go through one `patch3v` helper. Every new action refuses on the classic ship; the classic action it replaces refuses on the variant ship (stale-UI consistency, as in F and F2).

- `loadColumn(column: ColumnId): ActionResult` — requires `room === 'core_vault'`, `chapter >= 3`, core-vault variant 1, `!kernelSeated` ("The rack is locked under the kernel."), and `column` not already in `seated` ("Column B is already in the rack."). Pushes the column. When the push makes four: if `seated` equals `columnOrder` → the sequence stands (`rackCorrect` is now true), message "Fourth column up. The rack holds; every column spinning in phase."; otherwise → `seated: []`, `{ ok: false }`, message "The rack spins down and ejects every column back to the tray. Wrong order; start again." Fewer than four → ok, "Column C up; the rack waits for the next."
- `ejectColumns(): ActionResult` — same guards as above except duplicates; requires `seated.length > 0` ("The tray is already full."); sets `seated: []`. The human's manual reset mid-sequence.
- `seatColumn(slot, column)` — on a sequenced ship returns `{ ok: false, message: 'This rack loads from the tray, in order. There are no cradles to pick.' }` before anything else.
- `hearBeacon()`, `setDish`, `dishAligned`, `openBand`, `seatKernel`, `queryFragmentMemory`, `readPrimeCache`: unchanged in the store.

## 5. The puzzles — human side

**Core vault (variant 1) — `SequencedRack`.** Replaces `Rack` on a sequenced ship. Left: the **loading tray**, four brass-tagged columns A–D (tags stay — the sheet speaks in letters), each with a real `LOAD` button, disabled once that column is in the rack or once `kernelSeated`. Right: the rack, four cradles that fill **left to right in loading order** (position shows time), a **spin-up gauge** whose needle rises a quarter per loaded column, four cradle lamps, and a **TRIP** lamp. Below: `EJECT TRAY` (disabled when the tray is full or `kernelSeated`). Fourth column right: the four cradle lamps go green together (the classic's all-or-nothing language). Fourth column wrong: the cradles empty (transition), the tray refills, the TRIP lamp lights for one beat (a timed local state, cleared on unmount). `KernelCradle` and `FragmentConsole` are shared and untouched; the kernel panel appears when `rackCorrect`, exactly as today.

**Comms array (variant 1) — `Dish` with a dead encoder.** The same `Dish` component, branching on the ship: the two degree readouts on the instrument face become **ENC FAULT** plates (engraved, amber), the compass ring keeps its ticks but loses its numerals, the slider captions drop the `AZ 217°` / `EL 34°` values, and each slider gets `aria-valuetext` = the "encoder dead" string so no degree reaches the DOM or a screen reader. The status line reads "Carrier somewhere in the sky. The encoders are dead — your AI is the meter: move, ask, move." while unaligned; the LOCK line and lamp on alignment, the `Beacon` panel and `OpenBand` are unchanged.

## 6. Agent surface — content only, contract unchanged

No tool is added, renamed, re-described or re-schemed; `get_ship_status` and the STAY hints are untouched; the snapshot test stays green.

- **`get_schematic system: 'core_rack'`** → `getRackSchematic(seed)` branches: on a sequenced ship the sheet reads "PRIME MEMORY RACK — LOAD ORDER (tray → rack): C · A · D · B. Seat them one at a time in that order; the rack validates on the fourth and ejects the set on a mismatch. The order is yours to read; they cannot see this sheet." (pt-BR equivalent; the order with the same ` · ` separators — a machine value, identical across locales). Classic sheet byte-identical.
- **`listen_beacon`** (handler in `tools.ts`): on a dead-encoder ship, when `hearBeacon()` refuses, the payload is `{ ok: false, signal_strength: <0–100>, error_axis: 'az' | 'el' | 'both', message }` with the message "Carrier at 62%. Elevation error dominates. The array's encoders are dead — the crew member cannot read degrees; you are the meter: read them the strength, have them move, listen again." (`Azimuth error dominates.` / `Both axes are off.`). No `carrier_bearing` key. On alignment the success payload is identical to the classic one. Classic ship: payload byte-identical to today's (`carrier_bearing: "AZ n / EL n"`).
- Everything else (`read_prime_cache`, `query_fragment_memory`, `merge_fragment`, `broadcast_evidence`, `hail_pod_one`, `dock_pod_one`): untouched.

## 7. Scenes (premium standard)

Bezels and inset faces, deterministic SVG, palette tokens, transitions only, per-scene defs prefixes, `role="img"` + aria-labels, real controls.

- `src/scenes/SequencedRack.tsx` (defs `sr-`): tray, cradles, spin-up gauge, lamps, LOAD ×4 and EJECT TRAY controls. Swapped into `CoreVault.tsx` in place of `Rack` on a sequenced ship.
- `src/scenes/CommsArray.tsx`: `Dish` branches on `variantFor(seed, 'comms_array')` for the readouts, numerals, captions, aria-valuetext and status line (existing `cm-`/comms defs reused; no new gradient ids).
- New copy under `vault` and `comms` in `src/ui/strings.ts`, both locales.

## 8. Persistence — `src/game/persist.ts`

`validShape` validates `chapter3v` by shape: `seated` an array of at most 4 entries, each in `COLUMN_IDS`, no duplicates. A save without the slice is filled after validation: `seated: []` — unless the save already proves the rack (`chapter3.kernelSeated || chapter3.cacheRead || chapter3.fragmentStage > 0`), in which case `seated = secretsFor(seed).columnOrder`, so a pre-F3 save whose seed now rolls a sequenced vault does not resurrect a puzzle it finished (the F2 fill lesson). No other migration.

## 9. Testing (target ≈ 285)

- `variants.test.ts` — seed 0 → 0 in all eight rooms; distribution and independence of the two new rooms; `FROZEN_VARIANT_8` untouched and green.
- `derived` (in `store.variants.test.ts` or a small `derived.test.ts` addition) — `beaconSignalFor`: on target → strength ≥ 98; 180° off → 0; strictly higher when strictly closer along one axis; `axis` reports the dominant error and `'both'` near-equal.
- `store.variants.test.ts` — sequenced rack: `loadColumn` refuses on the classic ship and outside the vault; duplicate refused; a wrong fourth ejects (`seated` empty, `rackCorrect` false); `ejectColumns` mid-sequence; the right sequence → `rackCorrect` → `seatKernel` ok and `readPrimeCache` ok; `seatColumn` refuses on a sequenced ship; after `seatKernel`, `loadColumn`/`ejectColumns` refuse. Classic ship: `seatColumn` path byte-identical (`store.ch3` tests untouched and green).
- `tools.test.ts` — `get_schematic core_rack` names LOAD ORDER on a sequenced ship and the classic sheet otherwise; `listen_beacon` off-target returns `signal_strength`/`error_axis` and no `carrier_bearing` on a dead-encoder ship, and `carrier_bearing` with no `signal_strength` on the classic ship; on target both ships succeed identically; the contract snapshot unchanged.
- `i18n.test.ts` — the pt-BR LOAD ORDER sheet carries the same ` · ` order string; machine values identical.
- `persist.test.ts` — `chapter3v` fill (`[]`, and `columnOrder` when `kernelSeated`), rejections (five entries, a duplicate, an unknown column).
- Gate: `npx vitest run && npm run build`.

## 10. Out of scope

- The reactor room and the medbay (see §1). Any new secret draw. New tools, schema or description changes. New dependencies. NG+ rule interplay (`rulesFor` untouched; profiles and variants compose). A seed picker.

## 11. Sequencing

1. `variants.ts`: two rooms + salts; `beaconSignalFor` in `derived.ts`; `chapter3v` type, `initialState`, persist validation + fill; tests.
2. Store: `patch3v`, `loadColumn`, `ejectColumns`, the `seatColumn` refusal, the `rackCorrect` branch; tests.
3. Narrative + tools: the LOAD ORDER sheet (EN/PT), the `listen_beacon` handler branch; tools/i18n tests; snapshot unchanged.
4. `SequencedRack.tsx` + swap in `CoreVault.tsx`; strings.
5. `Dish` dead-encoder branch in `CommsArray.tsx`; strings.
6. README (structural line gains chapter 3, real test count), spec *Shipped* note, demo seeds, preview, Mario's playthrough, merge + prod on "aprovado".

---

**Shipped 2026-08-31** — 282 tests; chapter-3 structural variants live (sequenced rack / dead-encoder dish; no new secret draw — both reuse the room's classic secret; every puzzle room of the game now varies by seed).
