# DERELICT — Demo video script

**Target runtime:** under 3:00. **Format:** screen recording + voiceover (one person, one
mic, one browser tab — no editing tricks needed beyond cuts between beats).

Record in either ChatGPT's in-app browser or Chrome 149+ with
`chrome://flags/#enable-webmcp-testing` enabled, at https://webmcp-challenger.vercel.app.
Play for real — the beats below map onto actual game moments, not staged UI.

---

## 0:00–0:20 — Hook

**Screen:** DERELICT start screen, then a slow pan across the HUD, ending on the AI LINK
panel showing its small starting set of online tools.

**VO:**
> "This is DERELICT. I can't beat it. Neither can my AI. Together, we can."

Cut in immediately with the cryo bay coming up on screen as the line lands.

## 0:20–1:00 — Act 1: the first handoff

**Screen:** Human explores the cryo bay, finds the vent grate and the breaker panel. Cut to
the agent's side (chat panel or agent UI) reading the maintenance log tool call and
response. Human flips breakers C, A, B in that order. Camera holds on the AI LINK panel as
aux power comes online and two new tools light up (`access_crew_manifest`, `unlock_door`).
Then: human finds the photo, zooms in, reads off the birthdate; agent calls `unlock_door`
with the auth code; door opens.

**VO (over the action, not describing it beat-for-beat):**
> "My agent can read the ship's systems. I can't. I can see the room. It can't. It finds
> the power sequence in a maintenance log I'll never lay eyes on — I flip the breakers.
> The second the ship has power, look — its toolset just grew. That's not scripted; that's
> WebMCP tools coming online live, tied to what's actually true about the ship right now.
> Now it needs a code only I can find, pinned over a bunk."

## 1:00–1:50 — Act 2 highlights: two-way information, real trade-offs

**Screen:** Power triage panel — agent narrating (via voice or visible text) which
subsystem to sacrifice as it calls `route_power`. Then the coolant valve puzzle: camera on
the three analog gauge needles, cut to agent reading a schematic and computing valve
settings, cut back to human turning the physical dials to match.

**VO:**
> "The reactor's only putting out 40%. My agent has to decide what the ship can live
> without — it can see the constraint, I can't touch the power bus at all. And here" —
> [gauges] — "these are just needles on a page to me. My agent's own sensor feed for this
> exact channel is dead — marked FAULT, on purpose. So I read it the numbers, it does the
> math, I turn the valves. Neither of us has enough to solve this alone."

## 1:50–2:30 — Finale: two-operator launch

**Screen:** Bridge. Star fix taken at the viewport, relayed, `compute_escape_trajectory`
locks it in. Agent calls `initiate_launch_sequence`; countdown starts. Human grips and
holds the CONFIRM LAUNCH handle — hold it visibly through the countdown. Agent calls
`confirm_launch` while the handle is still held. Launch cinematic → "POD AWAY" → epilogue
stat line (tool calls made).

**VO:**
> "Trajectory's locked. My agent starts the launch sequence — but it can't finish it alone.
> I have to physically hold this handle while it confirms the launch — hold and call have
> to overlap. One of us without the other, and this ship never leaves."

Let the countdown and the "POD AWAY" screen breathe for a few seconds — don't talk over the
payoff.

## 2:30–2:50 — Close

**Screen:** Cut to a single, static, readable screen of `src/mcp/registry.ts` — enough of
the file that the `availableWhen` / `registerTool` / `AbortController.abort()` pattern is
visible.

**VO:**
> "Tools come and go as the ship changes — that's WebMCP. DERELICT: live at
> webmcp-challenger.vercel.app, source at github.com/mariohercules/derelict."

**On-screen text (final frame, held 2–3s):**
```
webmcp-challenger.vercel.app
github.com/mariohercules/derelict
```

---

## Notes for the recording

- Keep the AI LINK panel in frame for as much of the recording as practical — it's the one
  UI element that makes the WebMCP mechanic legible to a judge who's never played the game.
- Don't narrate every click; let 2–3 seconds of real gameplay breathe between VO lines so
  the video doesn't feel like a voiceover slapped over a speedrun.
- If a live take runs long, cut *within* Act 2 (there's a second gauge/valve or a second
  power-routing decision that can be trimmed) rather than compressing the hook or the
  finale — those two beats are what sell the concept.
