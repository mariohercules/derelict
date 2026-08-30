# DERELICT

You wake from cryosleep on a drifting ship whose main computer is dead. The only thing
still listening is an auxiliary AI with partial access to ship systems — and that AI is
your own agent, connected through WebMCP. You can see the ship: the doors, the gauges,
the fuses, the photo pinned above the bunk. Your agent can act on it: unlock doors, route
power, read the logs and schematics you can't reach. Neither of you has the whole picture,
and neither of you can escape alone.

DERELICT is a three-act asymmetric co-op escape room (Cryo Bay → Engineering → Bridge,
about 15–20 minutes) built for the OpenAI WebMCP Challenge. There's no lobby, no second
player to invite — you bring the teammate you already have. Talk to your agent, describe
what you see, and let it tell you what it can do about it.

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

Chapter 2 opens from the bridge once the sealed log is read.

## How WebMCP is used

The game registers and revokes tools live, in step with the ship. A subsystem that has no
power has no tools — the agent starts with just 5 tools online, and when the human restores
aux power, new tools visibly light up on the in-game **AI LINK** panel, and the agent can
suddenly act where it couldn't a second ago. Across the three acts the game defines 23
tools in total, gated open and closed by ship state: reading the ship's status and logs,
unlocking doors, routing power, running diagnostics, pulling schematics and sensor data,
computing a nav fix, and — in the two-operator finale — initiating and then confirming the
escape pod launch, which requires the human to be physically holding a confirm handle in
the UI at the same moment the agent calls `confirm_launch`.

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
  phrase. Nothing is memorizable, and the answers are not sitting in this repository.

Tool descriptions are written in-fiction — the agent is addressed directly as the ship's
auxiliary AI — so it plays its role without any prompting from the human. Every tool
returns structured JSON and reports in-fiction failures as `{ ok: false, message: ... }`
rather than throwing, so a wrong guess reads as the ship talking back, not an error.

The implementation lives in [`src/mcp/`](src/mcp/):

- [`registry.ts`](src/mcp/registry.ts) — subscribes to the game store and reconciles the
  registered tool set against current game state on every change, registering newly
  available tools and revoking (via `AbortController`) tools whose subsystem just lost
  power.
- [`tools.ts`](src/mcp/tools.ts) — the 23 tool definitions: schemas, in-fiction
  descriptions, availability predicates, and handlers that dispatch into the game store.
- [`detect.ts`](src/mcp/detect.ts) — detects whether `document.modelContext` exists so the
  game can fall back gracefully when it doesn't.

## Local development

```bash
npm install
npm run dev    # start the dev server
npm test       # run the test suite (Vitest, 129 tests)
```

`npm run build` runs a type check (`tsc`) and produces a production build via Vite.

## License

MIT — see [`LICENSE`](LICENSE).
