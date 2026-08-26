# DERELICT — Design Document

**Date:** 2026-08-26
**Target:** OpenAI WebMCP Challenge (submission deadline: Sep 3, 2026, 1:00 PM PDT)
**Status:** Approved design, pre-implementation

## 1. Concept

DERELICT is an asymmetric cooperative escape room played by a human and their AI agent — together, in the same browser tab. The human wakes from cryosleep on a drifting spaceship whose main computer is dead. What survived is an auxiliary shipboard AI with partial access to ship subsystems — and that AI is literally the player's own agent (ChatGPT, or any WebMCP-capable agent), connected through WebMCP.

The fiction and the technology are the same thing: the WebMCP tools the page registers *are* the ship systems the AI can operate. Neither player can escape alone — the game is designed so that every puzzle requires information or capability to cross the human/agent boundary.

**Tone:** tense with dry humor (FTL / The Martian). Sample voice: *"Life support: 94%. Statistically excellent. The remaining 6% is concentrated entirely in the room you're about to enter."*

**Language:** all game content in English.

## 2. Why this fits the judging criteria

- **WebMCP Leverage:** tools are registered and revoked dynamically as ship systems gain or lose power; rich input schemas (subsystem enums, structured parameters); structured JSON returns (logs, sensor arrays) the agent must actually reason over. The mechanic *is* the protocol.
- **Execution:** a complete, self-contained game with a beginning, middle, and dramatic end (~15–20 min), not a tech demo.
- **Potential Impact:** demonstrates a new interaction paradigm — asymmetric human+agent co-op — that generalizes beyond games (any workflow where a human has situational context and an agent has system access).
- **Creativity & Ambition:** the challenge brief asks for "something we haven't seen before" where humans and agents "interact, collaborate, and create together." A co-op escape room where your own ChatGPT is your teammate is the most literal possible answer.

## 3. The asymmetry (core mechanic)

| Human (visual UI) | Agent (WebMCP tools) |
|---|---|
| Sees and navigates rooms, objects, colors, symbols, animated gauges | Reads crew logs, schematics, sensor data |
| Physical actions: pull levers, connect wires, flip breakers, hold buttons | System actions: unlock doors, route power, run diagnostics |

Two layers of asymmetry:

1. **Capability asymmetry (inviolable):** the agent cannot click the UI; the human cannot call tools. Even if the agent can see the page, it cannot act on it.
2. **Information asymmetry (designed):** human-side clues are visual/spatial/interaction-gated (icons, positions, things revealed by dragging or hovering); agent-side information lives only in tool responses.

Every puzzle requires at least one boundary crossing: human describes what they see → agent cross-references logs → agent acts or instructs → human acts physically.

## 4. Game structure — three acts

### Act 1 — Cryo Bay (tutorial, ~4 min)

Emergency lighting only. Agent wakes with a minimal toolset: `read_emergency_bulletin`, `ping_subsystems`, `get_ship_status`.

- **Beat 1 (teaches agent → human):** the exit door has no power. The human finds an auxiliary power panel behind a vent grate (drag grate off) with three unlabeled breakers. The correct flip sequence is only in the maintenance log the agent can read.
- **Beat 2 (teaches human → agent):** aux power comes online → **the agent's toolset visibly expands** (`unlock_door` comes online — the demo's first magic moment). Unlocking requires a crew authorization code; the agent learns from the crew manifest that the chief engineer's code is his daughter's birthdate; the human finds a family photo pinned by a bunk with the date on it, and relays it. Agent calls `unlock_door({door: "cryo_exit", auth_code})`.

### Act 2 — Engineering (~8 min)

Two interlocking puzzles plus the narrative thread.

- **Power routing:** reactor at 40% output. Agent gets `route_power({from, to, amount})` and `run_diagnostics({subsystem})` across subsystems (`life_support`, `doors`, `medbay`, `engines`, `comms`), constrained to keep life support above a threshold. In parallel the human must replace a blown fuse — the correct fuse rating is visually ambiguous on the physical fuses and specified only in schematics the agent reads via `get_schematic({system})`.
- **Coolant valves:** the human sees animated pressure gauges; the agent's `read_sensors({system})` returns everything *except* those gauges (damaged sensor — stated in-fiction). The human must report gauge readings; the agent computes the correct valve settings from the schematic; the human sets the valves. Information flows both ways in one puzzle.
- **Narrative thread:** `read_crew_logs({entry_id})` entries unlock progressively. The agent pieces together why the ship is derelict and retells it to the player — emergent storytelling by the player's own agent. The final log entry seeds Act 3 (where the escape pod authorization lives).

### Act 3 — Bridge (climax, ~5 min)

- **Star fix:** the agent's `compute_escape_trajectory` needs a navigation fix the human takes at the viewport (align a reticle, read off three symbols).
- **Two-operator launch (finale):** the agent calls `initiate_launch_sequence()` → countdown begins; the human must physically hold the CONFIRM LAUNCH handle during the arming window while the agent calls `confirm_launch()`. Timing windows are generous (tens of seconds, not seconds) to absorb agent response latency. Launch cinematic, epilogue, and a stats screen: elapsed time, tool calls made, log entries found.

## 5. WebMCP tool surface

All tools registered via `document.modelContext.registerTool(...)`. Availability is driven by game state — a subsystem without power has its tools revoked. Exact API signature to be confirmed by the Day-1 spike (see §9).

| Tool | Online when | Notes |
|---|---|---|
| `get_ship_status` | always | structured snapshot: power, subsystem states, current room |
| `read_emergency_bulletin` | always | tutorial breadcrumb |
| `ping_subsystems` | always | which systems respond |
| `read_maintenance_log` | always | Act 1 breaker sequence |
| `access_crew_manifest` | aux power | crew records, auth code riddle |
| `unlock_door` | aux power | `{door: enum, auth_code: string}` |
| `run_diagnostics` | Act 2 | `{subsystem: enum}` |
| `route_power` | Act 2 | `{from, to, amount}`; validates life-support constraint |
| `get_schematic` | Act 2 | fuse ratings, valve math |
| `read_sensors` | Act 2 | structured array; gauge sensor marked FAULT |
| `read_crew_logs` | Act 2, progressive | `{entry_id}`; narrative |
| `compute_escape_trajectory` | Act 3 | needs human-supplied star fix symbols |
| `initiate_launch_sequence` | Act 3, trajectory set | starts countdown |
| `confirm_launch` | during arming window | two-operator rule |

Tool descriptions are written in-fiction (the agent is addressed as the shipboard AI) — this steers the agent into role and improves cooperation quality without any prompt engineering on the player's side.

## 6. Architecture

Frontend-only SPA. No backend: all game state lives in the client (memory + `localStorage` for save/resume). React + TypeScript + Vite. Deployed on Vercel (a challenge sponsor), with Netlify as fallback if anything blocks.

Modules, each with a clear boundary:

1. **Game core (`src/game/`):** a Zustand store holding the full state machine — puzzle flags, per-subsystem power, doors, inventory, act progression. The single source of truth for both UI and tools. Puzzle and content definitions live as typed data, not scattered through components.
2. **WebMCP layer (`src/mcp/`):** observes the store and reconciles the set of registered tools against game state (register/revoke on transitions). Owns all schemas and tool handlers; handlers only dispatch store actions and read store state — no game logic of their own.
3. **Scene UI (`src/scenes/`):** one component tree per room (CryoBay, Engineering, Bridge) plus a persistent HUD. The HUD includes an **AI LINK panel** showing, live, which tools the agent currently has online — making WebMCP itself visible in the demo.
4. **Fallback (`src/mcp/detect.ts`):** if `modelContext` is absent, show a polished banner explaining how to enable it (ChatGPT in-app browser, or Chrome via `chrome://flags/#enable-webmcp-testing`).

**Rendering:** DOM/SVG with CSS animations — no game engine. Visual identity: dark ship-terminal aesthetic (amber/green on near-black, minimalist SVG), deliberately consistent so no drawn illustration is needed. Web Audio for ambience and SFX.

## 7. Error handling

- Tool calls with invalid input (wrong enum, out-of-range power) return structured, in-fiction errors (`{ok: false, reason: "Insufficient reactor output"}`) — never throw raw exceptions at the agent.
- Tool calls arriving out of order / for offline subsystems return an in-fiction "system offline" response (defense in depth; revocation is the primary mechanism).
- `localStorage` access wrapped in try/catch; the game runs fine with no save available.
- If the WebMCP registration API itself fails at runtime, the AI LINK panel shows a degraded state instead of breaking the game.

## 8. Testing

- **Vitest unit tests** on the game core: state machine transitions, puzzle logic, power-budget constraints, launch-window timing. This is where bugs would hurt most.
- **WebMCP layer** tested against a mock `modelContext` (register/revoke reconciliation, handler dispatch, error shapes).
- **Playtesting:** a full end-to-end playthrough in ChatGPT's in-app browser and in Chrome (flag enabled) at mid-week to calibrate puzzle difficulty; the agent's natural hinting behavior is the difficulty safety valve.

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| WebMCP API surface differs from assumptions (experimental spec) | **Day-1 spike:** read current spec + Chrome docs, test a toy `registerTool` in both target browsers, confirm dynamic registration behavior before building the layer |
| Agent response latency breaks timed finale | Generous timing windows (30s-scale, not seconds) |
| Puzzle difficulty miscalibrated | Mid-week playtest; agent doubles as organic hint system |
| Art scope creep | Single consistent terminal aesthetic; SVG only |
| Deadline | Submission logistics scheduled as tasks, not afterthoughts (§10) |

## 10. Submission logistics (scheduled work, not an afterthought)

- Public GitHub repo, MIT license visible in the About section.
- Devpost registration in the first days, not the last.
- Demo video < 3 min, public on YouTube, with audio. Script: hook (a person and ChatGPT escaping together), the toolset-expansion moment, both-directions puzzle, two-operator launch as the closer.
- Text description structured around the four judging criteria.
- Live URL on Vercel.
- Re-read official rules before submitting (note: the rules list country eligibility restrictions, including Brazil — participant has been made aware and should confirm their own eligibility).

## 11. Milestones (Aug 26 – Sep 3)

1. **Day 1:** WebMCP spike (spec + both browsers), project scaffold, deploy pipeline live from the start.
2. **Days 2–3:** game core + WebMCP layer + Act 1 complete and playable end-to-end.
3. **Days 4–5:** Act 2 (both puzzles + log thread).
4. **Day 6:** Act 3 + finale + epilogue/stats.
5. **Day 7:** polish (audio, transitions), two full playtests, difficulty tuning.
6. **Day 8:** video, description, Devpost submission — with buffer before the Sep 3 deadline.

## 12. Out of scope (YAGNI)

- Multiplayer / shared sessions
- Mobile layout (desktop-first; judges test in desktop browsers)
- Localization (English only)
- Accounts, backend, telemetry
- Difficulty modes
- Additional rooms beyond the three acts
