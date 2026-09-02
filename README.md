# DERELICT

[![CI](https://github.com/mariohercules/derelict/actions/workflows/ci.yml/badge.svg)](https://github.com/mariohercules/derelict/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

You wake from cryosleep on a drifting ship whose main computer is dead. The only thing
still listening is an auxiliary AI with partial access to ship systems — and that AI is
your own agent, connected through WebMCP. You can see the ship: the doors, the gauges,
the fuses, the photo pinned above the bunk. Your agent can act on it: unlock doors, route
power, read the logs and schematics you can't reach. Neither of you has the whole picture,
and neither of you can escape alone.

DERELICT is an asymmetric co-op escape room, played in chapters. Chapter 1 (cryo bay →
engineering → bridge, about 20 minutes) is the original build, made for the OpenAI WebMCP
Challenge. Chapter 2, "The Investigation" (medbay, crew quarters, hydroponics, cargo bay,
about 30 minutes more), opens once you've chosen to stay and find out what really happened
here. Chapter 3, "The Truth" (reactor room, core vault, comms array, about 35 minutes more),
opens once the Kestrel is named, and runs under a corporate kill-switch that hunts your AI's
tools in waves the deeper you go. This is the Director's Cut, complete: three chapters, and
three endings — LEAVE the ship behind, RESTORE the drowned intelligence that ran it, or
BROADCAST what it hid. There's no lobby, no second player to invite — you bring the teammate
you already have. Talk to your agent, describe what you see, and let it tell you what it can
do about it.

## How to play

**Play it live:** [derelict-game.vercel.app](https://derelict-game.vercel.app)

WebMCP needs a host that exposes `document.modelContext` to the page. Two ways to get one:

- **ChatGPT's in-app browser** — works out of the box, no setup.
- **Chrome 149+** — enable `chrome://flags/#enable-webmcp-testing` first.

Open the link in one of those, then just talk to your agent like a crewmate standing next
to you: tell it what you're looking at, ask what it can see on its end, and follow its
instructions. If WebMCP isn't available, the game shows a fallback banner explaining how to
turn it on rather than failing silently.

The interface and ship narrative are available in **English and Brazilian Portuguese** — the
game auto-detects your browser language, and an EN/PT-BR toggle sits in the corner. Tool
names and machine codes stay in English in both; ships do not translate codes.

Chapter 2 opens from the bridge once the sealed log is read. Chapter 3 opens when the
Kestrel is named; the lower deck is the reactor room, the core vault and the comms array,
and the game ends at one of the joint rituals.

Every ship has a **hull number** — `CMR-` and the seed in base 36, `CMR-4X+` for New
Game+ — on the title screen and the FLIGHT RECORD at the end. **COPY LINK** gives a
`?ship=` URL; whoever opens it wakes on the same ship, and the record's four ending lamps
show what this device's crew has seen. The **SOUND** toggle in the header mutes the ship.

Finish a run and the epilogue offers **New Game+**: a fresh ship on a tighter clock — shorter
ritual windows, faster kill-switch waves that wake the moment the Kestrel is named, costlier
bus shielding — and a ship that remembers the run you do not: the bulletin, the sealed log,
the fragment's own memory and pod one's beacon all acknowledge it. A crew that has already
left, restored and broadcast finds a fourth ending waiting: STAY — hold the docking clamps
open and bring pod one home.

## How WebMCP is used

The game registers and revokes tools live, in step with the ship. A subsystem that has no
power has no tools — the agent starts with just 5 tools online, and when the human restores
aux power, the agent can suddenly act where it couldn't a second ago: new tools visibly
light up on the in-game **AUX LINK** console — one lamp per tool, grouped by data bus, with
a ticker of the agent's last calls (tool, input and OK/REFUSED, never the ship's reply) —
and during a kill-switch wave the human watches the lamps on unshielded buses go red.
Across all three chapters the game defines 31 tools in total, gated open and closed by
ship state: reading the ship's status and logs, unlocking doors, routing power, running
diagnostics, pulling schematics and sensor data, computing a nav fix, shielding data buses
against a corporate kill-switch, and — in three two-operator finales — initiating and
confirming the escape pod launch, seating PRIME's kernel, or opening the transmission
band, each requiring the human to be physically holding a confirm handle in the UI at the
same moment the agent calls `confirm_launch`, `merge_fragment`, or `broadcast_evidence`.

Two layers of asymmetry make the tools necessary rather than decorative:

- **Capability asymmetry:** the agent cannot click anything in the UI; the human cannot
  call a tool. Every action has exactly one operator.
- **Information asymmetry:** some information only exists on the human's side (analog
  gauge needles drawn in SVG, color-banded fuses, a family photo the agent never sees) and
  some only on the agent's side (crew logs, engineering schematics, sensor channels). Most
  puzzles require relaying information across that boundary in both directions before
  either side can act.
- **Every ship is unique:** each run rolls a seed that decides the breaker order, Amara's
  birthday (the door PIN), the gauge pressures, the three star-fix glyphs, and the launch
  phrase — in Chapter 2, the captain's commission number (its last three digits are the
  safe combination), each hydroponics bed's water needs, the cargo bay's quarantine slot,
  and the registry fragment stencilled on the hull plate — and, in Chapter 3, the core
  vault's memory-column order and pod one's beacon bearing. And the seed redraws structure, not just numbers: a ship may wake
  with a patch bay where the cryo breakers would be, a coil drive in place of the coolant
  valves, or a drifting nav fix instead of the parallax star fix; deeper in, a keyed safe
  whose key hides behind one of Amara's drawings, a hydroponics manifold whose need tags
  have corroded away, a cargo bay re-racked with the quarantine container under a pallet, a
  memory rack that cares about loading order instead of position, a dish whose encoders are
  dead so the agent has to be the signal meter — each rolled independently, each a different
  puzzle with its own logs, schematics and instruments.
  Nothing is memorizable, and the answers are not sitting in this repository.

Tool descriptions are written in-fiction — the agent is addressed directly as the ship's
auxiliary AI — so it plays its role without any prompting from the human. Every tool
returns structured JSON and reports in-fiction failures as `{ ok: false, message: ... }`
rather than throwing, so a wrong guess reads as the ship talking back, not an error.

The implementation lives mostly in [`src/mcp/`](src/mcp/):

- [`registry.ts`](src/mcp/registry.ts) — subscribes to the game store and reconciles the
  registered tool set against current game state on every change, registering newly
  available tools and revoking (via `AbortController`) tools whose subsystem just lost
  power.
- [`tools.ts`](src/mcp/tools.ts) — the 31 tool definitions: schemas, in-fiction
  descriptions, availability predicates, and handlers that dispatch into the game store.
- [`killswitch.ts`](src/game/killswitch.ts) — the antagonist: a pure wave/immunity/shielding
  state machine whose suppression composes into every tool's availability.
- [`detect.ts`](src/mcp/detect.ts) — detects whether `document.modelContext` exists so the
  game can fall back gracefully when it doesn't.

## Local development

```bash
npm install
npm run dev    # start the dev server
npm test       # run the test suite (Vitest, 316 tests)
```

`npm run build` runs a type check (`tsc`) and produces a production build via Vite.

## License

MIT — see [`LICENSE`](LICENSE).
