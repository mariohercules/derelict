# DERELICT — Devpost description

*(Body text for the Devpost submission form.)*

You wake from cryosleep on a drifting ship. The main computer is dead. The only thing
still listening is an auxiliary AI with partial access to ship systems — and that AI is
your own agent, dropped into the story as the ship's aux intelligence the moment you open
the page. You see the Cormorant: the rooms, the gauges, the fuses, a photo pinned above a
bunk. Your agent sees the ship's paperwork: the logs, the schematics, the sensor bus. Every
door, every system, every escape depends on the two of you trading what you each know.
DERELICT is a three-act escape room, about 15–20 minutes end to end, and it is genuinely
unplayable solo — there is no single-player path through it, by design.

## Why this had to be WebMCP

The obvious way to build "you and your AI escape a spaceship" is a chat panel bolted onto
a game: describe the puzzle in the sidebar, let the model suggest answers, you click the
buttons yourself. We didn't build that, because it isn't cooperation — it's a hint system
wearing a costume. WebMCP let us do something a chat sidebar can't: give the agent an
actual, exclusive role in the fiction. The tools *are* the character. `unlock_door`,
`route_power`, `read_crew_logs` — these aren't API wrappers the model narrates over; they
are the only way the auxiliary AI touches the ship, and the human physically cannot call
them. Tool descriptions are written entirely in-fiction ("You are the auxiliary shipboard
AI of ISV Cormorant..."), so the moment your agent connects, it plays its part with zero
prompting from you. That's not decoration on top of WebMCP — it's the thing WebMCP is for:
letting a page hand an agent a real, scoped capability and trust it to use that capability
inside a role, not just as a function call.

## A game that requires two minds instead of one

Every puzzle in DERELICT is built to cross the human/agent boundary at least once, in both
directions. In Act 1, the human finds an unlabeled breaker panel; the correct sequence
lives only in a maintenance log the agent can read. The agent restores power; a door tool
lights up that only it can call, and unlocking it needs a code the agent has to extract
from a crew manifest and the human has to physically find (a family photo, a birthdate)
and read aloud. In Act 2, the human watches three analog pressure gauges — hand-drawn SVG
needles, nothing structured behind them — while the agent's sensor tool for that exact
channel comes back marked `FAULT`, by design; the human has to describe what they see, the
agent computes the correct valve settings from a schematic, and the human turns the dials.
Neither side is ever the "real" player. Neither side has enough information to solve
anything alone. That asymmetry is the whole game, not a wrapper around it — and it's why
DERELICT is a better experience *because* it's cooperative, rather than despite it. A
single-player build of this concept would just be a puzzle game with a chatty NPC. This one
only exists because two different kinds of intelligence — one that can see and touch, one
that can read and act on systems — have to actually rely on each other.

## What becomes possible when a human and an agent share real, physical stakes

The finale is the clearest example of what this pairing makes possible that neither a solo
player nor a solo agent could do. The escape pod launch is a two-operator action: the agent
calls `initiate_launch_sequence` once a valid trajectory is locked, which starts a
countdown; the human must then physically press and *hold* a confirm handle in the UI while
the agent confirms, calling `confirm_launch`. If the human lets go, or the agent never calls
it, the sequence lapses and nothing happens. Launch requires simultaneous, sustained intent
from both a person and their agent — not a single click
attributed to whichever side happened to act first. That's a pattern that doesn't exist in
either "AI-assisted app" design or traditional multiplayer: a real-time, stateful commitment
that only resolves when a physical human action and an autonomous tool call overlap in
time. We think that pattern generalizes well past games — anywhere a human has situational
judgment an agent shouldn't have unilateral authority to override, a physical-plus-tool
confirmation is a real design primitive, and DERELICT is a working demo of it.

## How it's actually built

DERELICT is a React/TypeScript SPA (Vite, Zustand for state) with no backend — all game
state lives in the client and autosaves to `localStorage`. The WebMCP layer lives in
`src/mcp/`. `registry.ts` holds a small reconciliation loop: on every game-state change, it
walks the full tool list, and for each tool whose `availableWhen(state)` predicate just
turned true it calls `document.modelContext.registerTool(...)`, and for each tool whose
predicate just turned false it aborts the `AbortController` it registered that tool with —
which is also how the game revokes access the instant a subsystem loses power, not just
grants it. `tools.ts` defines all 14 tools: rich JSON Schemas with enums and integer
bounds (e.g. `route_power` takes `{from, to, amount}` over a closed subsystem enum with a
positive-integer amount), in-fiction descriptions that double as role-steering, and
handlers that dispatch into the game store and return structured JSON. No tool ever throws
at the agent — invalid input, wrong door, undercooked trajectory all come back as
in-fiction `{ ok: false, message: "..." }` payloads the agent can reason over and relay to
the human in character, the same way a real ship system would refuse a bad command instead
of crashing. A live **AI LINK** panel in the game's HUD shows exactly which of the 14 tools
are online at any moment, so the WebMCP mechanic that drives the whole design is visible
on screen the entire time you're playing.

**Live:** https://webmcp-challenger.vercel.app (ChatGPT's in-app browser works out of the
box; Chrome 149+ needs `chrome://flags/#enable-webmcp-testing` enabled first)
**Source:** https://github.com/mariohercules/derelict (MIT licensed)
