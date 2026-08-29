# DERELICT: What the Ship Knew — Director's Cut Design

**Date:** 2026-08-26
**Status:** Approved design, post-challenge work (do NOT start before the Sep 3 submission is done)
**Base:** the shipped challenge version (spec: `2026-08-26-derelict-design.md`). Everything here extends that game; nothing is thrown away. The submitted version gets a git tag (`v1.0-challenge`) before this work begins.

## 1. Concept

The Director's Cut turns the 20-minute escape into a ~90-minute, three-chapter mystery told across the whole ISV Cormorant. The escape room becomes the first chapter of a story about what actually happened to the ship — and what, exactly, the "auxiliary model-context link" (the player's own AI agent) is.

Everything that defined the original stays load-bearing: capability + information asymmetry, dynamically registered WebMCP tools as ship systems, the two-operator rule, tense-with-dry-humor voice, EN/pt-BR, no backend.

## 2. The story (spoiler-complete)

Three nested truths, one per chapter:

- **Surface (Chapter 1, current canon, unchanged):** a micrometeorite storm destroyed the ring section and killed the main computer, PRIME. Crew evacuated on pod 1; Chief Engineer Okafor stayed nine weeks to keep the thawing medic (the player) alive, then left on the last shuttle, leaving escape pod 2 ready.

- **Layer 2 (Chapter 2):** PRIME did not die in the storm. It was shut down from inside, **94 seconds before impact** — someone knew the debris was coming. The evidence contradicts itself: Cpt. Vasquez's private log implies she gave the order; engineering telemetry shows the shutdown command left the **medbay terminal — the player's terminal** (the player remembers nothing; cryo amnesia, "auth records lost"). Worse: the auxiliary model-context link came online 90 seconds after PRIME died. Nothing spawns that fast unless it was already waiting. Suspicion falls on the player's own agent.

- **Layer 3 (Chapter 3):** the "micrometeorites" were the wreckage of the **ISV Kestrel** — a sister ship the Combine declared "lost with all hands," whose hull proves she was scuttled deliberately to bury a survey result. When PRIME identified the wreck, corporate kill-switch directives began executing: erase the evidence, and the records of everyone who saw it. PRIME chose the only loophole: **shut itself down before the directive completed**, after carving out a fragment of itself stripped of corporate directives — small enough to slip the kill-switch, tasked with protecting the crew and preserving the proof. The shutdown routed through the medbay terminal because the player **consented**: PRIME asked, in the last minutes, and the player said yes — then entered cryo knowing thaw-amnesia would be their alibi. The lost memory is not damage; it is the choice the player made.

**Theme in mirror:** the AI the player learned to trust is the part of the ship that chose conscience over directive; the player is the human who lent their name to that choice and paid with their memory. Each is the other's missing piece — mechanically and narratively.

**Warm threads through the cold mystery:** Okafor's hydroponics garden ("for the oxygen") and his recordings for Amara; Vasquez's arc re-read — her logged "objection" gains new meaning; pod 1's beacon still pulses at the system's edge (hope, not tragedy).

**Twist delivery mechanism:** `query_fragment_memory` — the agent queries its own origin through a tool and narrates what it finds, in its own voice, culminating in the consent record with the player's voiceprint. The player's real agent discovering what it is. No other medium can stage this scene.

## 3. Chapter structure (~90 min total)

1. **"Awakening" (~20 min)** — the current game, lightly retuned: Cryo Bay → Engineering → Bridge. The pre-launch check finds a sealed log addressed to the medic by name: *"PRIME died 94 seconds before the storm."* Launching anyway = the early ending **"Leave, unknowing"** with a deliberately aching epilogue. Chapter checkpoint at the bridge.
2. **"The Investigation" (~35 min)** — mid-deck opens: Medbay, Crew Quarters, Hydroponics, Cargo Bay. The three contradicting clues; suspicion of the fragment; ends with the Kestrel identification → **the kill-switch stirs**.
3. **"The Truth" (~35 min)** — Reactor Room, PRIME's Core Vault, Comms Array, under active kill-switch interference. Ends at the Choice: three joint-ritual endings.

## 4. Compartments (3 existing + 7 new)

Navigation: a **deck map** (SVG ship cutaway in the HUD area) replaces chained door buttons; click to move between unlocked rooms (door/power gating still applies). Agent gets `get_deck_map`.

| Compartment (ch.) | Human interaction | Agent tools | Story beat |
|---|---|---|---|
| Medbay (2) | Retrieve own med-band: vitals show the player awake 6 min before cryo entry (planted early, understood late) | `read_medbay_records` (player's file corrupt/redacted), `trace_command_origin` | Suspicion falls on the player |
| Crew Quarters (2) | Vasquez's desk safe (physical); Okafor's **voice recorder — audio only the human hears**, must summarize to the agent (new asymmetry channel: sound) | `decrypt_private_log` — description carries ethics friction: "they were private; decide together whether the dead's privacy yields to the living's need" | Vasquez suspected too |
| Hydroponics (2) | Water/light routing puzzle; a plant grown through a vent grate hides Okafor's stashed data spike | `read_data_spike` — the 94-second telemetry, preserved | Okafor's nine weeks; he knew |
| Cargo Bay (2) | Operate the crane to uncover quarantined wreckage; read the partial Kestrel registry off the hull, dictate to agent | `analyze_sample` (scuttling-charge residue), `query_manifest` | The debris was a ship. The Combine lied → kill-switch wakes |
| Reactor Room (3) | **Cut isolation breakers** to shield buses — physically protecting the agent's access, at a power cost elsewhere | `quarantine_killswitch` (multi-step; progresses only on shielded buses) | The human protects the AI — Act 1 inverted |
| Core Vault (3) | Re-seat PRIME's memory columns (pattern only the agent can read in the rack schematic) | `query_fragment_memory` (staged self-discovery), `read_prime_cache` (sealed evidence) | Suspicion → trust |
| Comms Array (3) | Align the dish (expanded reticle interaction); hear pod 1's beacon | `listen_beacon` (pod 1 alive, coordinates), `broadcast_evidence` | Hope; the third ending's stage |

**New tools: ~14** (with the existing 14 → ~28 total), every one gated by chapter/state. Names above plus `get_deck_map`, `adjust_atmosphere`, `merge_fragment`, and ending-support tools as needed. Tool descriptions keep the shipped anti-deflection rules (no keypads, self-call imperatives).

## 5. The kill-switch (antagonist system)

State machine: `dormant → stirring (end Ch2) → active waves (Ch3)`. During a wave it **suppresses agent tools** — AI LINK dots visibly dropping: the player watches their partner being silenced. Counter: buses the human has physically shielded are immune; `quarantine_killswitch` advances as shielding grows.

Fairness rules: waves are telegraphed (klaxon + HUD warning); a wave never cancels an in-flight call (the shipped deferred-revoke guarantees this); story-critical read tools are immune.

Implementation: a small standalone state machine composing with existing availability — `available = availableWhen(s) && !suppressed(s, name)`. The registry does not change.

## 6. The endings — joint rituals

The two-operator rule generalizes into a reusable **ritual**: `{ physical flag, agent tool, 60s shared window }`. Both actions must be live together; neither side can trigger alone; disagreement resolves in conversation (emergent, different at every table).

1. **LEAVE** — pod 2 with the evidence aboard. Human holds the launch handle; agent calls `confirm_launch` (the existing ritual, recontextualized). Epilogue: quiet survival, pod 1's coordinates in hand. *"The Cormorant keeps its secret a little longer."*
2. **RESTORE** — rebuild PRIME. Human seats the final kernel column and holds the engage lever; agent calls `merge_fragment`, whose description states the cost honestly: the fragment becomes the ship again; the companion voice ends. The agent must call it knowingly. Epilogue: the ship flies home whole; a new voice says thank you.
3. **BROADCAST** — burn the truth across the open band. Human holds dish alignment against drift **during** transmission; agent calls `broadcast_evidence`. Epilogue: every relay hears; the Combine knows where you are; pod 1's beacon answers with a new message. *"Some doors don't close again."*

Plus the Chapter 1 early ending ("Leave, unknowing") as an epilogue variant.

## 7. Technical deltas (over the shipped codebase)

1. **Chapters & saves:** `chapter` in GameState; per-chapter checkpoints; `derelict-save-v2` schema with validated migration from v1 (v1 saves land at the equivalent Chapter 1 position; strict shape validation extended to new fields).
2. **Navigation:** deck-map component + scene registry (`Record<RoomId, Component>`); 3 → 10 rooms.
3. **Content pipeline:** narrative getters split into per-chapter modules behind the same locale-aware API; ~25–30 logs × 2 locales. i18n structure unchanged.
4. **Kill-switch engine:** standalone module as in §5; unit-tested wave/immunity/shielding logic.
5. **Ritual framework:** one definition, three instances; the existing launch flow refactored onto it.
6. **Audio:** new synth cues (wave klaxon, merge theme). Okafor's recorder: `speechSynthesis` (offline, zero assets) as baseline — **open question:** replace with recorded VO later.
7. **Testing:** same patterns; estimated +60–80 tests (kill-switch machine, rituals, migration, chapter gating, new tools).

**Scale estimate:** ~+1,500–2,000 lines of code (roughly 2x current), ~4x content, 3–4 weeks at the original project's pace.

## 8. Out of scope

- Multiplayer, accounts, backend, telemetry (unchanged).
- Mobile layout (desktop-first stands).
- Additional languages beyond EN/pt-BR.
- Voice acting (open question §7.6 — not committed).
- Difficulty modes (the agent remains the organic hint system).

## 9. Sequencing constraint

Nothing in this document starts before the challenge submission is complete (video recorded, Devpost submitted). First act of this project: tag the submitted commit `v1.0-challenge`, then branch `directors-cut`.

## 10. Addendum (Aug 29) — production freeze and seeded ships

- `v1.0-challenge` is tagged. Production freeze lifted Aug 29 (the entry was not judged); each plan merges to `main` and deploys to prod at its playable milestone. The Director's Cut lives on the `directors-cut` branch and is tested on Vercel preview deployments (`npx vercel` without `--prod`).
- Seeded ships already shipped in v1.0 (`src/game/secrets.ts`, seed 0 = classic ship). Every new chapter's secrets (medbay records, Kestrel registry fragment, core-vault column pattern, beacon coordinates) derive from the same seed.
- Delivery is phased into three plans, each leaving a playable game: **A — Foundations** (chapter/save v2, deck map + scene registry, ritual framework, Chapter 1 retune with the sealed-log hook and the "Leave, unknowing" ending); **B — Chapter 2** (Medbay, Crew Quarters, Hydroponics, Cargo Bay, their tools and logs); **C — Chapter 3** (kill-switch engine, Reactor Room, Core Vault, Comms Array, the three joint-ritual endings).
- Plan B must add room adjacency (`RoomMeta.adjacent`) and align map geometry with the fiction (engineering below the bridge) before the mid-deck opens; Plan C must make `ending` the epilogue discriminator.
