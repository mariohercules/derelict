# WebMCP spike findings

Status: planning-stage facts confirmed; live-browser verification pending (needs a human — see checklist below).

## Confirmed by planning research (WebMCP spec + Chrome docs, 2026-08-26)

These are the facts Task 1's spike (`src/spike.ts`) is built to exercise, and that later tasks (notably the `src/mcp/` registry in Task 5) assume hold:

- **API surface:** the browser exposes `document.modelContext.registerTool(toolConfig, { signal })`. `toolConfig` carries `name`, `description`, `inputSchema` (JSON Schema), and an async `execute()`.
- **Revocation:** a tool is unregistered by aborting the `AbortSignal` passed as `{ signal }` at registration time — no separate `unregisterTool` call is needed or expected.
- **Execute return shape:** `execute()` returns `{ content: [{ type: 'text', text: string }] }`.
- **Target browsers:** ChatGPT in-app browser (WebMCP on by default) and Chrome 149+ with `chrome://flags/#enable-webmcp-testing` enabled.

These facts are asserted by the plan's Global Constraints (`docs/superpowers/plans/2026-08-26-derelict.md`) and are not yet independently confirmed against a live browser by this task — that confirmation is the point of Step 7, below.

## Pending manual verification (needs the user)

Not yet performed — requires a human opening the deployed spike page in both target browsers. Steps 5 (`gh repo create`) and 6 (`vercel --prod`) are also pending (see task-1-report.md), so there is no deployed URL yet for this checklist to run against.

Once a production URL exists, open it in both browsers and check:

1. **Chrome** with `chrome://flags/#enable-webmcp-testing` enabled:
   - [ ] Page logs `modelContext available`.
   - [ ] Page logs `hello_ship registered`.
   - [ ] Page logs `toggle_me registered`.
2. **ChatGPT in-app browser:**
   - [ ] Ask ChatGPT "what tools do you see on this page?" — it should list `hello_ship` and `toggle_me`.
   - [ ] Ask it to call `hello_ship` — the greeting ("Hello from ISV Cormorant.") returns.
   - [ ] Press **Revoke toggle_me** on the page, then ask again what tools it sees — `toggle_me` should be gone (`hello_ship` should remain).

When this is run, record here:
- The exact global the tools appeared under (confirm it is `document.modelContext`, or note the actual global if different).
- The exact return shape ChatGPT accepted from `execute()` (confirm `{ content: [{ type: 'text', text }] }`, or note differences).
- Observed revocation behavior (did aborting the signal remove `toggle_me` from the agent's visible toolset without further action?).
- Any surprises (timing, caching, prompts shown to the user, tool name/description handling, etc).

**If reality differs from the Global Constraints above, STOP and update the plan's `src/mcp/` tasks before proceeding** — later tasks build the tool registry directly against this API shape.
