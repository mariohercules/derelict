# Immersion Pass — Plan G — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every run *presence* without touching a puzzle: an AUX LINK console where the human watches the agent act and be silenced, a diegetic soundscape generated in Web Audio, a cold open in the cryo pod and bulkhead transitions between rooms, a vignette and a FLIGHT RECORD at every ending, and shareable ship codes — while `GameState`, the save schema and the 31-tool contract stay byte-identical.

**Architecture:** Every new piece of state lives in a small store *beside* the game store on the `localeStore`/`metaStore` pattern: `linkStore` (ephemeral, the last 12 AUX LINK events, fed by `mkTool`'s execute wrapper and the registry's new `onChange`) and `prefsStore` (`derelict-prefs`: `muted`, `linkCollapsed`). Logic is pure and tested (`mixFor`, `isFreshRun`, `coldOpenSchedule`, the ship-code codec, `summarizeInput`); the Web Audio graph and the React components are thin wiring on top. The tool-contract snapshot is the guard that nothing agent-facing moved.

**Tech Stack:** React 19 + TypeScript + Vite, Zustand, Vitest, Web Audio API. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-01-derelict-immersion-pass-design.md` (§2 architecture, §3 console, §4 soundscape, §5 cold open + bulkheads, §6 vignettes + record, §7 ship codes, §8 strings, §9 testing). Base: `directors-cut` @ `37ab7ac` (= `main` `d688119` + the spec; 282 tests, 31 tools).

## Global Constraints

- **Nothing agent-facing moves:** no tool added, renamed, re-described or re-schemed; `buildTools()` stays 31; the snapshot `src/mcp/__snapshots__/tools.test.ts.snap` stays green (only `mkTool`'s wrapper and `toolAvailability`'s return type change). `GameState`, `persist.ts`, `rules.ts`, `ritual.ts`, `killswitch.ts` are not edited.
- **The asymmetry rule applies to the console:** a link event carries the tool name, a summary of the *input*, and a status. Never the payload the ship returned, never its message.
- **The comms array never sounds different for the dish or the beacon** (`mixFor` must not read `chapter3.dish`, `chapter3.beaconHeard`, or `beaconSignalFor`) — a test pins it.
- **Premium instrument standard (non-negotiable):** bezels and inset faces; deterministic geometry (any randomness at render comes from `prng(seed)`); palette tokens only (`--steel*`, `--face*`, `--brass*`, `--parchment`, `--amber`, `--green`, `--red`, `--hull`, `--panel-solid`, `--line`, `--dim`, `--text`); the palette test's glob grows to `../ui/*.tsx`; every animation has a reduced-motion path; SVG defs prefixes `ev-` (vignette) and `co-` (cold open); `role="img"`/`role="region"`/`role="dialog"` + aria-labels from strings; real `<button>` controls.
- All player-facing text in both locales in `src/ui/strings.ts` (a key missing in either locale fails `tsc`). Machine values — tool names, ship codes, `HH:MM:SS`, input summaries — identical across locales.
- Branch `directors-cut`; merge to `main` + prod deploy in Task 6 only after Mario's preview playthrough and explicit "aprovado".
- Commit messages end with a blank line then
  `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01MUJfbE723MBfr34oDFgZJ9`
- Verification gate for every commit: `npx vitest run && npm run build` both exit 0 (judge on exit codes).

## File structure

| File | Responsibility |
|---|---|
| `src/game/shipcode.ts` (new) | ship code codec + URL parsing, pure |
| `src/ui/InvitePlate.tsx` (new) | title-screen plate for a ship invite |
| `src/game/prefs.ts` (new), `src/ui/usePrefs.ts` (new) | `derelict-prefs` store |
| `src/game/link.ts` (new), `src/ui/useLink.ts` (new) | the AUX LINK event buffer |
| `src/mcp/registry.ts` | + `onChange` |
| `src/mcp/tools.ts` | `mkTool` emits link events; `ShipTool`; `toolAvailability` with bus/silenced |
| `src/ui/LinkConsole.tsx` (new), `src/ui/HUD.tsx` | the console instrument replaces the header list |
| `src/audio/sound.ts` | master gain + mute, `playRelayClick`, `playBulkhead`, `noiseBuffer` |
| `src/audio/mixer.ts` (new) | `mixFor` (pure) + `startMixer` (Web Audio wiring) |
| `src/ui/SoundToggle.tsx` (new) | SOUND ●/○ |
| `src/ui/coldOpen.ts` (new), `src/ui/ColdOpen.tsx` (new) | thaw schedule + overlay |
| `src/ui/Bulkhead.tsx` (new) | door transition around the scene |
| `src/scenes/EndingVignette.tsx` (new), `src/ui/FlightRecord.tsx` (new), `src/ui/DeckMap.tsx` (`HULL_PATH`) | epilogue picture + ledger |
| `src/ui/strings.ts`, `src/styles/theme.css`, `src/App.tsx`, `src/main.tsx`, `src/scenes/Epilogue.tsx` | wiring |

---

### Task 1: Ship codes — the codec, the URL, the invite plate

**Files:**
- Create: `src/game/shipcode.ts`, `src/game/shipcode.test.ts`, `src/ui/InvitePlate.tsx`
- Modify: `src/ui/strings.ts` (new `ship` namespace), `src/styles/theme.css` (`.plate`), `src/App.tsx`

**Interfaces:**
- Consumes: `resetGame(seed?, { ngPlus? })` (`src/game/store.ts`), `useMeta` (`src/ui/useMeta.ts`), `randomSeed()`'s range `[1, 2147483646]` (`src/game/secrets.ts`).
- Produces: `SHIP_PREFIX`, `MAX_SEED`, `ShipRef { seed; ngPlus }`, `ShipInvite = ({ ok: true } & ShipRef) | { ok: false }`, `encodeShipCode(seed, ngPlus?)`, `decodeShipCode(code): ShipRef | null`, `shipFromSearch(search): ShipInvite | null`, `shipLink(origin, seed, ngPlus?)`; `InvitePlate`; the `.plate` / `.plate-engraved` CSS classes (reused by Task 5's FLIGHT RECORD).

- [ ] **Step 1: Failing tests**

Create `src/game/shipcode.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { MAX_SEED, decodeShipCode, encodeShipCode, shipFromSearch, shipLink } from './shipcode';

describe('ship codes', () => {
  it('encodes the seed in base 36 behind the hull prefix, with + for New Game+', () => {
    expect(encodeShipCode(0)).toBe('CMR-0');
    expect(encodeShipCode(177)).toBe('CMR-4X');
    expect(encodeShipCode(MAX_SEED)).toBe('CMR-ZIK0ZI');
    expect(encodeShipCode(177, true)).toBe('CMR-4X+');
  });

  it('round-trips every code; prefix optional, case-insensitive, whitespace ignored', () => {
    for (const seed of [0, 1, 177, 4096, MAX_SEED]) {
      expect(decodeShipCode(encodeShipCode(seed))).toEqual({ seed, ngPlus: false });
      expect(decodeShipCode(encodeShipCode(seed, true))).toEqual({ seed, ngPlus: true });
    }
    expect(decodeShipCode('4x')).toEqual({ seed: 177, ngPlus: false });
    expect(decodeShipCode('  cmr-4x+ ')).toEqual({ seed: 177, ngPlus: true });
  });

  it('rejects junk, negatives, floats and seeds past the PRNG range', () => {
    for (const bad of ['', 'CMR-', '+', 'CMR-4X++', 'CMR--1', 'CMR-4.5', 'CMR-ZIK0ZJ', 'CMR-ZZZZZZZZ', 'hello world']) {
      expect(decodeShipCode(bad)).toBeNull();
    }
  });

  it('reads ?ship first, then ?seed with &plus=1, and reports an unreadable invite', () => {
    expect(shipFromSearch('')).toBeNull();
    expect(shipFromSearch('?foo=1')).toBeNull();
    expect(shipFromSearch('?ship=CMR-4X')).toEqual({ ok: true, seed: 177, ngPlus: false });
    expect(shipFromSearch('?ship=CMR-4X%2B')).toEqual({ ok: true, seed: 177, ngPlus: true });
    expect(shipFromSearch('?ship=CMR-4X+')).toEqual({ ok: true, seed: 177, ngPlus: true }); // a literal + reaches us as a space
    expect(shipFromSearch('?ship=CMR-4X&seed=5')).toEqual({ ok: true, seed: 177, ngPlus: false });
    expect(shipFromSearch('?seed=177')).toEqual({ ok: true, seed: 177, ngPlus: false });
    expect(shipFromSearch('?seed=177&plus=1')).toEqual({ ok: true, seed: 177, ngPlus: true });
    expect(shipFromSearch('?ship=nope!')).toEqual({ ok: false });
    expect(shipFromSearch('?seed=-3')).toEqual({ ok: false });
    expect(shipFromSearch('?seed=99999999999')).toEqual({ ok: false });
  });

  it('builds a link the title screen reads back', () => {
    const link = shipLink('https://derelict-game.vercel.app', 177, true);
    expect(link).toBe('https://derelict-game.vercel.app/?ship=CMR-4X%2B');
    expect(shipFromSearch(new URL(link).search)).toEqual({ ok: true, seed: 177, ngPlus: true });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/game/shipcode.test.ts`
Expected: FAIL — cannot resolve `./shipcode`.

- [ ] **Step 3: Implement the codec**

Create `src/game/shipcode.ts`:

```ts
// A ship is its seed. The hull code is the seed in base 36, uppercase, behind
// the CMR- prefix, with a trailing '+' for a New Game+ profile: CMR-0 is the
// classic ship, CMR-ZIK0ZI the largest seed randomSeed() can draw.
export const SHIP_PREFIX = 'CMR-';
export const MAX_SEED = 2_147_483_646;

export interface ShipRef { seed: number; ngPlus: boolean }
// null from shipFromSearch means "no ship on the URL"; { ok: false } means
// something was there and it did not read.
export type ShipInvite = ({ ok: true } & ShipRef) | { ok: false };

export function encodeShipCode(seed: number, ngPlus = false): string {
  return `${SHIP_PREFIX}${seed.toString(36).toUpperCase()}${ngPlus ? '+' : ''}`;
}

export function decodeShipCode(code: string): ShipRef | null {
  let s = code.trim().toUpperCase();
  if (s.startsWith(SHIP_PREFIX)) s = s.slice(SHIP_PREFIX.length);
  const ngPlus = s.endsWith('+');
  if (ngPlus) s = s.slice(0, -1);
  if (!/^[0-9A-Z]{1,7}$/.test(s)) return null;
  const seed = parseInt(s, 36);
  if (!Number.isInteger(seed) || seed < 0 || seed > MAX_SEED) return null;
  return { seed, ngPlus };
}

export function shipFromSearch(search: string): ShipInvite | null {
  const params = new URLSearchParams(search);
  const ship = params.get('ship');
  if (ship !== null) {
    // A '+' typed straight into a URL decodes as a space; a trailing space can
    // only have been that plus.
    const fixed = ship.endsWith(' ') ? `${ship.trimEnd()}+` : ship;
    const ref = decodeShipCode(fixed);
    return ref ? { ok: true, ...ref } : { ok: false };
  }
  const seed = params.get('seed');
  if (seed === null) return null;
  const digits = seed.trim();
  if (!/^\d{1,10}$/.test(digits)) return { ok: false };
  const n = Number(digits);
  if (n > MAX_SEED) return { ok: false };
  return { ok: true, seed: n, ngPlus: params.get('plus') === '1' };
}

export function shipLink(origin: string, seed: number, ngPlus = false): string {
  return `${origin}/?ship=${encodeURIComponent(encodeShipCode(seed, ngPlus))}`;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/game/shipcode.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Strings — the `ship` namespace**

In `src/ui/strings.ts`, immediately after the `deck:` line of the **`UIStrings` interface** (`deck: { title: string; ... };`) add:

```ts
  ship: {
    received: (code: string) => string; wakeOn: (code: string) => string; abandons: string;
    unreadable: string; plusNeedsRun: string;
  };
```

After the `deck:` line of the **`en` object** add:

```ts
  ship: {
    received: (code) => `HULL ${code} RECEIVED`,
    wakeOn: (code) => `Wake on ${code}`,
    abandons: 'Waking on this hull abandons the run in progress.',
    unreadable: 'Hull number unreadable. The ship you wake on is your own.',
    plusNeedsRun: 'The plus profile needs a completed run on this device; this hull wakes classic.',
  },
```

After the `deck:` line of the **`ptBR` object** add:

```ts
  ship: {
    received: (code) => `CASCO ${code} RECEBIDO`,
    wakeOn: (code) => `Acordar no ${code}`,
    abandons: 'Acordar neste casco abandona a jornada em andamento.',
    unreadable: 'Número de casco ilegível. A nave em que você acorda é a sua.',
    plusNeedsRun: 'O perfil plus precisa de uma jornada completa neste dispositivo; este casco acorda clássico.',
  },
```

- [ ] **Step 6: The plate**

Append to `src/styles/theme.css`:

```css
/* Engraved plates (title invite, flight record) */
.plate { display: inline-block; text-align: left; margin: 12px auto; padding: 10px 14px; border: 2px solid var(--steel); border-radius: 6px; background: var(--face); box-shadow: inset 0 0 0 1px var(--line); }
.plate-engraved { color: var(--parchment); letter-spacing: 0.2em; font-size: 11px; margin-bottom: 6px; }
```

Create `src/ui/InvitePlate.tsx`:

```tsx
import type { ShipInvite } from '../game/shipcode';
import { encodeShipCode } from '../game/shipcode';
import { useStrings } from './useLocale';

export function InvitePlate({ invite, hasSave, plusAllowed, onWake }: { invite: ShipInvite; hasSave: boolean; plusAllowed: boolean; onWake: () => void }) {
  const t = useStrings();
  if (!invite.ok) return <p className="status-dim">{t.ship.unreadable}</p>;
  const code = encodeShipCode(invite.seed, invite.ngPlus);
  return (
    <div className="plate" role="group" aria-label={t.ship.received(code)}>
      <div className="plate-engraved">{t.ship.received(code)}</div>
      {invite.ngPlus && !plusAllowed && <p className="status-dim" style={{ margin: '4px 0' }}>{t.ship.plusNeedsRun}</p>}
      {hasSave && <p className="status-dim" style={{ margin: '4px 0' }}>{t.ship.abandons}</p>}
      <button onClick={onWake} style={{ borderColor: 'var(--brass)', color: 'var(--brass-hi)' }}>{t.ship.wakeOn(code)}</button>
    </div>
  );
}
```

- [ ] **Step 7: Wire the title screen**

In `src/App.tsx`:

Add imports:

```tsx
import { shipFromSearch } from './game/shipcode';
import { InvitePlate } from './ui/InvitePlate';
import { useMeta } from './ui/useMeta';
```

Inside `App()`, right after `const [mc, setMc] = useState(() => detectModelContext());` add:

```tsx
  // A ship invite on the URL is read once and stripped, so a reload does not re-offer it.
  const [invite] = useState(() => shipFromSearch(window.location.search));
  const runs = useMeta((m) => m.runsCompleted);
  useEffect(() => {
    if (window.location.search) window.history.replaceState(null, '', window.location.pathname + window.location.hash);
  }, []);
  const wakeOnInvite = () => {
    if (!invite || !invite.ok) return;
    resetGame(invite.seed, { ngPlus: invite.ngPlus && runs >= 1 });
    setSaved(null);
    startAmbience();
    playBlip();
    setStarted(true);
  };
```

In the title-screen JSX, right after the `{saved?.checkpoint && !saved.won && (...)}` block, add:

```tsx
        {invite && <InvitePlate invite={invite} hasSave={hasSave} plusAllowed={runs >= 1} onWake={wakeOnInvite} />}
```

- [ ] **Step 8: Gate and commit**

Run: `npx vitest run && npm run build`
Expected: both exit 0; 287 tests.

```bash
git add src/game/shipcode.ts src/game/shipcode.test.ts src/ui/InvitePlate.tsx src/ui/strings.ts src/styles/theme.css src/App.tsx
git commit -m "feat: ship codes — CMR- hull numbers, ?ship= invites, the title plate

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01MUJfbE723MBfr34oDFgZJ9"
```

---

### Task 2: The AUX LINK — prefs, the event buffer, the registry's `onChange`, `mkTool`'s trace, the console

**Files:**
- Create: `src/game/prefs.ts`, `src/game/prefs.test.ts`, `src/ui/usePrefs.ts`, `src/game/link.ts`, `src/game/link.test.ts`, `src/ui/useLink.ts`, `src/ui/LinkConsole.tsx`
- Modify: `src/mcp/registry.ts`, `src/mcp/registry.test.ts`, `src/mcp/tools.ts`, `src/mcp/tools.test.ts`, `src/game/store.ts` (`resetGame` only), `src/ui/HUD.tsx`, `src/ui/strings.ts`, `src/styles/theme.css`, `src/styles/palette.test.ts`, `src/main.tsx`, `src/App.tsx`

**Interfaces:**
- Consumes: `suppressed(s, meta)`, `ToolMeta` (`src/game/killswitch.ts`); `BUSES` (`src/game/content.ts`); `t.reactor.bus` (existing bus labels).
- Produces: `Prefs { version: 1; muted; linkCollapsed }`, `PREFS_KEY`, `EMPTY_PREFS`, `validPrefs`, `loadPrefs`, `prefsStore`, `hydratePrefs`, `setPref(key, value)`, `usePrefs(selector)`; `LinkStatus`, `LinkEvent`, `LINK_CAPACITY`, `linkStore`, `pushLinkEvent`, `clearLink`, `summarizeInput`, `useLink()`; `LinkChange { online; offline }`, `createToolRegistry(mc, tools, store, onChange?)`; `ShipTool extends GameTool { meta; baseAvailable }`, exported `mkTool`, `ToolLamp { name; online; bus; readOnly; silenced }`, `toolAvailability(s): ToolLamp[]`; `LinkConsole({ linked })`.

- [ ] **Step 1: Failing tests — prefs and the buffer**

Create `src/game/prefs.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_PREFS, PREFS_KEY, hydratePrefs, loadPrefs, prefsStore, setPref, validPrefs } from './prefs';

const storage = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => void storage.set(k, v),
  removeItem: (k: string) => void storage.delete(k),
});

beforeEach(() => {
  storage.clear();
  prefsStore.setState(EMPTY_PREFS, true);
});

describe('prefs', () => {
  it('validates shape, version and types', () => {
    expect(validPrefs(EMPTY_PREFS)).toBe(true);
    expect(validPrefs({ version: 2, muted: false, linkCollapsed: false })).toBe(false);
    expect(validPrefs({ version: 1, muted: 'yes', linkCollapsed: false })).toBe(false);
    expect(validPrefs(null)).toBe(false);
  });

  it('loads the empty prefs for nothing, garbage, or an invalid record', () => {
    expect(loadPrefs()).toEqual(EMPTY_PREFS);
    storage.set(PREFS_KEY, '{nope');
    expect(loadPrefs()).toEqual(EMPTY_PREFS);
    storage.set(PREFS_KEY, JSON.stringify({ version: 1, muted: 1, linkCollapsed: false }));
    expect(loadPrefs()).toEqual(EMPTY_PREFS);
  });

  it('setPref updates the store and persists; hydratePrefs reads it back', () => {
    setPref('muted', true);
    expect(prefsStore.getState()).toEqual({ version: 1, muted: true, linkCollapsed: false });
    expect(JSON.parse(storage.get(PREFS_KEY)!)).toEqual({ version: 1, muted: true, linkCollapsed: false });
    prefsStore.setState(EMPTY_PREFS, true);
    hydratePrefs();
    expect(prefsStore.getState().muted).toBe(true);
  });
});
```

Create `src/game/link.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { LINK_CAPACITY, clearLink, linkStore, pushLinkEvent, summarizeInput } from './link';
import { resetGame } from './store';

beforeEach(() => clearLink());

describe('the link buffer', () => {
  it('keeps the newest LINK_CAPACITY events, oldest first', () => {
    for (let i = 0; i < LINK_CAPACITY + 1; i++) pushLinkEvent({ kind: 'call', at: i, tool: `t${i}`, input: '', status: 'ok' });
    const events = linkStore.getState().events;
    expect(events).toHaveLength(LINK_CAPACITY);
    expect(events[0]).toMatchObject({ tool: 't1' });
    expect(events[LINK_CAPACITY - 1]).toMatchObject({ tool: `t${LINK_CAPACITY}` });
  });

  it('clears, and a new run starts empty', () => {
    pushLinkEvent({ kind: 'link', at: 1, online: ['a'], offline: [] });
    clearLink();
    expect(linkStore.getState().events).toEqual([]);
    pushLinkEvent({ kind: 'link', at: 2, online: ['b'], offline: [] });
    resetGame(0);
    expect(linkStore.getState().events).toEqual([]);
  });
});

describe('summarizeInput', () => {
  it('renders key=value pairs; arrays with commas; nested objects as JSON; skips undefined', () => {
    expect(summarizeInput({ door: 'cryo_exit', code: '0407' })).toBe('door=cryo_exit code=0407');
    expect(summarizeInput({ symbols: ['KAV', 'ORO', 'SET'] })).toBe('symbols=KAV,ORO,SET');
    expect(summarizeInput({ dish: { az: 217, el: 34 } })).toBe('dish={"az":217,"el":34}');
    expect(summarizeInput({ amount: 20, skip: undefined })).toBe('amount=20');
  });

  it('is empty for no input or a non-object, and truncates long inputs with an ellipsis', () => {
    expect(summarizeInput({})).toBe('');
    expect(summarizeInput('abc' as unknown as Record<string, unknown>)).toBe('');
    const long = summarizeInput({ authorization: 'X'.repeat(80) });
    expect(long).toHaveLength(48);
    expect(long.endsWith('…')).toBe(true);
  });
});
```

Run: `npx vitest run src/game/prefs.test.ts src/game/link.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 2: Implement prefs and the buffer**

Create `src/game/prefs.ts`:

```ts
// Per-device preferences that are not game state: the mute and the folded
// console. Hydrated before the app mounts; a bad value is the empty prefs.
import { createStore } from 'zustand/vanilla';

export const PREFS_KEY = 'derelict-prefs';

export interface Prefs {
  version: 1;
  muted: boolean;
  linkCollapsed: boolean;
}

export const EMPTY_PREFS: Prefs = { version: 1, muted: false, linkCollapsed: false };

export function validPrefs(v: unknown): v is Prefs {
  if (!v || typeof v !== 'object') return false;
  const p = v as Record<string, unknown>;
  return p.version === 1 && typeof p.muted === 'boolean' && typeof p.linkCollapsed === 'boolean';
}

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return EMPTY_PREFS;
    const parsed: unknown = JSON.parse(raw);
    return validPrefs(parsed) ? parsed : EMPTY_PREFS;
  } catch {
    return EMPTY_PREFS;
  }
}

export const prefsStore = createStore<Prefs>(() => EMPTY_PREFS);

export function hydratePrefs(): void {
  prefsStore.setState(loadPrefs(), true);
}

export function setPref<K extends Exclude<keyof Prefs, 'version'>>(key: K, value: Prefs[K]): void {
  const next: Prefs = { ...prefsStore.getState(), [key]: value };
  prefsStore.setState(next, true);
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  } catch {
    // Private mode / quota: the choice lives for this session only.
  }
}
```

Create `src/ui/usePrefs.ts`:

```ts
import { useStore } from 'zustand';
import { prefsStore } from '../game/prefs';
import type { Prefs } from '../game/prefs';

export function usePrefs<T>(selector: (p: Prefs) => T): T {
  return useStore(prefsStore, selector);
}
```

Create `src/game/link.ts`:

```ts
// The AUX LINK buffer: what the agent tried, and what came online or went
// dark — the human's window onto the partner it cannot see. Ephemeral by
// design: a resumed run starts with the registry's first sync as its first
// line, which in fiction is the link coming back.
import { createStore } from 'zustand/vanilla';

export type LinkStatus = 'ok' | 'refused' | 'error';
export type LinkEvent =
  | { kind: 'call'; at: number; tool: string; input: string; status: LinkStatus }
  | { kind: 'link'; at: number; online: string[]; offline: string[] };

export const LINK_CAPACITY = 12;

export const linkStore = createStore<{ events: LinkEvent[] }>(() => ({ events: [] }));

export function pushLinkEvent(e: LinkEvent): void {
  linkStore.setState((s) => {
    const events = [...s.events, e];
    return { events: events.length > LINK_CAPACITY ? events.slice(events.length - LINK_CAPACITY) : events };
  });
}

export function clearLink(): void {
  linkStore.setState({ events: [] }, true);
}

function renderValue(v: unknown): string {
  if (Array.isArray(v)) return v.map(renderValue).join(',');
  if (v !== null && typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

// key=value pairs, one space apart, cut to `max` characters with an ellipsis.
// The input only — never what the ship answered.
export function summarizeInput(input: Record<string, unknown>, max = 48): string {
  if (!input || typeof input !== 'object') return '';
  const parts: string[] = [];
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined) continue;
    parts.push(`${k}=${renderValue(v)}`);
  }
  const text = parts.join(' ');
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
```

Create `src/ui/useLink.ts`:

```ts
import { useStore } from 'zustand';
import { linkStore } from '../game/link';
import type { LinkEvent } from '../game/link';

export function useLink(): LinkEvent[] {
  return useStore(linkStore, (s) => s.events);
}
```

In `src/game/store.ts`, add `import { clearLink } from './link';` and change `resetGame` to:

```ts
export function resetGame(seed?: number, opts: { ngPlus?: boolean } = {}): void {
  clearLink();
  gameStore.setState(initialState(seed, opts.ngPlus ?? false), true);
}
```

In `src/main.tsx`, add `import { hydratePrefs } from './game/prefs';` and call `hydratePrefs();` on the line after `hydrateMeta();`.

Run: `npx vitest run src/game/prefs.test.ts src/game/link.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 3: Failing test — the registry reports changes**

Append to the `describe('createToolRegistry', ...)` block in `src/mcp/registry.test.ts`:

```ts
  it('reports what came online and what was revoked, once per sync, only when something changed', () => {
    const { mc } = fakeMc();
    const changes: { online: string[]; offline: string[] }[] = [];
    createToolRegistry(mc, [tool('always', () => true), tool('gated', (s) => s.auxPower)], store, (c) => changes.push(c));
    expect(changes).toEqual([{ online: ['always'], offline: [] }]);
    store.setState({ toolCalls: 1 });
    expect(changes).toHaveLength(1);
    store.setState({ auxPower: true });
    expect(changes[1]).toEqual({ online: ['gated'], offline: [] });
    store.setState({ auxPower: false });
    expect(changes[2]).toEqual({ online: [], offline: ['gated'] });
  });
```

Run: `npx vitest run src/mcp/registry.test.ts`
Expected: FAIL — `createToolRegistry` takes 3 arguments.

- [ ] **Step 4: Implement `onChange`**

In `src/mcp/registry.ts`, add after the `ModelContextLike` interface:

```ts
export interface LinkChange {
  online: string[];
  offline: string[];
}
```

Change the signature and `sync()`:

```ts
export function createToolRegistry(
  mc: ModelContextLike,
  tools: GameTool[],
  store: StoreApi<GameState>,
  onChange?: (change: LinkChange) => void
): { activeToolNames(): string[]; dispose(): void } {
  const active = new Map<string, AbortController>();

  function sync(): void {
    const s = store.getState();
    const online: string[] = [];
    const offline: string[] = [];
    for (const t of tools) {
      const shouldBeOn = t.availableWhen(s);
      const isOn = active.has(t.name);
      if (shouldBeOn && !isOn) {
        const controller = new AbortController();
        active.set(t.name, controller);
        online.push(t.name);
        try {
          void Promise.resolve(mc.registerTool(t.definition, { signal: controller.signal })).catch((e) =>
            console.error(`registerTool(${t.name}) failed`, e)
          );
        } catch (e) {
          console.error(`registerTool(${t.name}) failed`, e);
        }
      } else if (!shouldBeOn && isOn) {
        const controller = active.get(t.name)!;
        active.delete(t.name);
        offline.push(t.name);
        // Deferred one macrotask: a tool whose own execute() flips its
        // availability (confirm_launch ends the countdown it is gated on)
        // must deliver its result to the host before the revocation lands.
        setTimeout(() => controller.abort(), 0);
      }
    }
    if (onChange && (online.length > 0 || offline.length > 0)) onChange({ online, offline });
  }
```

The rest of the function is unchanged.

Run: `npx vitest run src/mcp/registry.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Failing tests — `mkTool` leaves a trace; `toolAvailability` knows the bus**

In `src/mcp/tools.test.ts`, extend the import from `./tools` to `import { buildTools, mkTool, toolAvailability } from './tools';` and add `import { linkStore } from '../game/link';`.

Append a new top-level describe at the end of the file:

```ts
describe('the AUX LINK — every call leaves a trace the human can read', () => {
  it('records the tool, a summary of the input, and OK — never the payload', async () => {
    powerOn();
    await call('unlock_door', { door: 'cryo_exit', code: AUTH_CODE });
    const events = linkStore.getState().events;
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: 'call', tool: 'unlock_door', input: `door=cryo_exit code=${AUTH_CODE}`, status: 'ok' });
    expect(JSON.stringify(events[0])).not.toMatch(/message|unlocked/i);
  });

  it('marks a refusal, and keeps the ship\'s reply out of the event', async () => {
    powerOn();
    await call('unlock_door', { door: 'cryo_exit', code: '0000' });
    expect(linkStore.getState().events[0]).toMatchObject({ tool: 'unlock_door', status: 'refused', input: 'door=cryo_exit code=0000' });
    expect(JSON.stringify(linkStore.getState().events[0])).not.toMatch(/rejected/i);
  });

  it('an exploding handler is an ERROR on the link, and the ship still answers in-fiction', async () => {
    const boom = mkTool('boom', 'test', () => true, { type: 'object', properties: {}, required: [] }, () => { throw new Error('kaput'); });
    const out = JSON.parse((await boom.definition.execute({})).content[0].text);
    expect(out).toMatchObject({ ok: false });
    expect(linkStore.getState().events.at(-1)).toMatchObject({ kind: 'call', tool: 'boom', status: 'error', input: '' });
  });
});
```

Inside the existing chapter-3 describe (the one that defines `lowerDeck()` and `T0`), after the test `'an active wave drops mutating tools on unshielded buses and spares read and immune tools'`, add:

```ts
  it('toolAvailability names each tool\'s bus and flags what a wave silenced, not what is merely offline', async () => {
    await lowerDeck();
    gameStore.setState({ room: 'engineering' });
    enterRoom('reactor_room', T0);
    const calm = toolAvailability(gameStore.getState());
    expect(calm.find((t) => t.name === 'merge_fragment')).toMatchObject({ bus: 'core', readOnly: false, online: false, silenced: false });
    expect(calm.find((t) => t.name === 'read_prime_cache')).toMatchObject({ bus: 'core', readOnly: true });
    expect(calm.find((t) => t.name === 'route_power')).toMatchObject({ bus: 'nav', online: true, silenced: false });
    expect(calm.every((t) => !t.silenced)).toBe(true);
    gameStore.setState((s) => ({ chapter3: { ...s.chapter3, wave: 'active' } }));
    const during = toolAvailability(gameStore.getState());
    expect(during.find((t) => t.name === 'route_power')).toMatchObject({ online: false, silenced: true });
    expect(during.find((t) => t.name === 'quarantine_killswitch')).toMatchObject({ bus: 'core', online: false, silenced: true });
    expect(during.find((t) => t.name === 'get_ship_status')).toMatchObject({ online: true, silenced: false }); // immune
    expect(during.find((t) => t.name === 'merge_fragment')).toMatchObject({ online: false, silenced: false }); // offline regardless
    gameStore.setState((s) => ({ chapter3: { ...s.chapter3, wave: 'calm' } }));
    routePower('comms', 'isolation', SHIELD_COST);
    expect(cutIsolation('nav').ok).toBe(true);
    gameStore.setState((s) => ({ chapter3: { ...s.chapter3, wave: 'active' } }));
    expect(toolAvailability(gameStore.getState()).find((t) => t.name === 'route_power')).toMatchObject({ online: true, silenced: false });
  });
```

Run: `npx vitest run src/mcp/tools.test.ts`
Expected: FAIL — `mkTool` not exported; `bus`/`silenced` undefined.

- [ ] **Step 6: Implement the trace and `ShipTool`**

In `src/mcp/tools.ts`:

Add imports:

```ts
import type { ToolMeta } from '../game/killswitch';
import { pushLinkEvent, summarizeInput } from '../game/link';
```

Replace the `mkTool` function (from `function mkTool(` through its closing `}`) with:

```ts
export interface ShipTool extends GameTool {
  meta: ToolMeta;
  baseAvailable(s: GameState): boolean; // availability before the kill-switch has its say
}

const refused = (out: unknown): boolean => typeof out === 'object' && out !== null && (out as { ok?: unknown }).ok === false;

// Exported for tests (an exploding handler); the game builds tools through buildTools().
export function mkTool(
  name: string,
  description: string,
  availableWhen: (s: GameState) => boolean,
  inputSchema: object,
  run: (input: Record<string, unknown>) => unknown,
  readOnly = false,
  bus: BusId = 'nav'
): ShipTool {
  const meta: ToolMeta = { name, bus, readOnly };
  return {
    name,
    meta,
    baseAvailable: availableWhen,
    // The kill-switch composes here, not in the registry: a suppressed tool is
    // simply "not available", and the registry revokes it like any other.
    availableWhen: (s) => availableWhen(s) && !suppressed(s, meta),
    definition: {
      name,
      description,
      inputSchema,
      annotations: readOnly ? { readOnlyHint: true } : undefined,
      async execute(input: unknown): Promise<ToolResult> {
        bumpToolCalls();
        const args = (input ?? {}) as Record<string, unknown>;
        const summary = summarizeInput(args);
        try {
          const out = run(args);
          pushLinkEvent({ kind: 'call', at: Date.now(), tool: name, input: summary, status: refused(out) ? 'refused' : 'ok' });
          return result(out);
        } catch (e) {
          pushLinkEvent({ kind: 'call', at: Date.now(), tool: name, input: summary, status: 'error' });
          return result({ ok: false, message: `Subsystem error: ${String(e)}` });
        }
      },
    },
  };
}
```

Change `export function buildTools(): GameTool[] {` to `export function buildTools(): ShipTool[] {`.

Replace `toolAvailability` with:

```ts
export interface ToolLamp {
  name: string;
  online: boolean;
  bus: BusId;
  readOnly: boolean;
  silenced: boolean; // would be online but for the kill-switch's wave
}

export function toolAvailability(s: GameState): ToolLamp[] {
  return buildTools().map((t) => {
    const online = t.availableWhen(s);
    return { name: t.name, online, bus: t.meta.bus, readOnly: t.meta.readOnly, silenced: !online && t.baseAvailable(s) && suppressed(s, t.meta) };
  });
}
```

Run: `npx vitest run src/mcp/tools.test.ts`
Expected: PASS, snapshot unchanged (the snapshot test still reports 31 and does not rewrite).

- [ ] **Step 7: Strings — the `link` namespace; drop `hud.severed`**

In `src/ui/strings.ts`, in the **interface** `hud` block delete the line `severed: string;`. In the **`en`** `hud` block delete `severed: 'severed',`; in **`ptBR`** delete `severed: 'rompido',`.

After the `ship:` block you added in Task 1, in each of the three places, add `link`:

Interface:

```ts
  link: {
    title: string; region: string; linked: string; severed: string; online: (n: number, total: number) => string;
    shielded: string; lamp: (tool: string, state: 'lit' | 'dark' | 'silenced') => string;
    ok: string; refused: string; error: string; onlineWord: string; offlineWord: string; linkWord: string;
    collapse: string; expand: string; last: string; empty: string;
  };
```

`en`:

```ts
  link: {
    title: 'AUX LINK',
    region: 'AI link console: one lamp per ship system your AI can reach, by bus, and its last calls',
    linked: 'LINKED', severed: 'SEVERED', online: (n, total) => `ONLINE ${n}/${total}`,
    shielded: 'SHIELDED',
    lamp: (tool, state) => `${tool} — ${state === 'lit' ? 'online' : state === 'silenced' ? 'silenced by the kill-switch' : 'offline'}`,
    ok: 'OK', refused: 'REFUSED', error: 'ERROR', onlineWord: 'ONLINE', offlineWord: 'OFFLINE', linkWord: 'LINK',
    collapse: 'Fold the link console', expand: 'Unfold the link console', last: 'last:',
    empty: 'No calls yet. The ship is listening.',
  },
```

`ptBR`:

```ts
  link: {
    title: 'AUX LINK',
    region: 'Console do link com a IA: uma lâmpada por sistema da nave ao alcance da sua IA, por barramento, e as últimas chamadas',
    linked: 'LIGADO', severed: 'ROMPIDO', online: (n, total) => `ONLINE ${n}/${total}`,
    shielded: 'BLINDADO',
    lamp: (tool, state) => `${tool} — ${state === 'lit' ? 'online' : state === 'silenced' ? 'silenciada pelo kill-switch' : 'offline'}`,
    ok: 'OK', refused: 'RECUSADO', error: 'ERRO', onlineWord: 'ONLINE', offlineWord: 'OFFLINE', linkWord: 'LINK',
    collapse: 'Recolher o console do link', expand: 'Expandir o console do link', last: 'última:',
    empty: 'Nenhuma chamada ainda. A nave está escutando.',
  },
```

- [ ] **Step 8: The console**

Append to `src/styles/theme.css`:

```css
/* AUX LINK console — a bezel strip under the header: lamp banks by bus, then the ticker */
.linkconsole { border-bottom: 1px solid var(--line); background: var(--face); padding: 6px 16px; font-size: 11px; }
.linkconsole .bezel { border: 2px solid var(--steel); border-radius: 6px; background: var(--face-deep); box-shadow: inset 0 0 0 1px var(--line), inset 0 2px 6px rgba(0, 0, 0, 0.6); padding: 6px 10px; }
.linkconsole .row { display: flex; gap: 4px 12px; align-items: center; flex-wrap: wrap; padding: 2px 0; }
.linkconsole .engraved { color: var(--parchment); letter-spacing: 0.18em; font-size: 10px; min-width: 64px; }
.linkconsole .tool { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
.linkconsole .tag { border: 1px solid var(--brass-mid); color: var(--brass-hi); border-radius: 2px; padding: 0 4px; font-size: 9px; letter-spacing: 0.15em; }
.linkconsole .fold { margin-left: auto; padding: 0 8px; font-size: 11px; line-height: 18px; }
.linkconsole .ticker { border-top: 1px solid var(--line); margin-top: 4px; padding-top: 4px; display: grid; gap: 2px; }
.linkconsole .line { display: flex; gap: 8px; align-items: center; white-space: nowrap; overflow: hidden; }
.linkconsole .line .body { overflow: hidden; text-overflow: ellipsis; color: var(--text); }
.linkconsole .line .word { margin-left: auto; display: inline-flex; align-items: center; gap: 4px; letter-spacing: 0.1em; }
```

Create `src/ui/LinkConsole.tsx`:

```tsx
import { BUSES } from '../game/content';
import { setPref } from '../game/prefs';
import type { LinkEvent } from '../game/link';
import { toolAvailability } from '../mcp/tools';
import type { ToolLamp } from '../mcp/tools';
import { useGame } from './useGame';
import { useLink } from './useLink';
import { usePrefs } from './usePrefs';
import { useStrings } from './useLocale';

type LampState = 'lit' | 'dark' | 'silenced';
const lampOf = (l: ToolLamp): LampState => (l.online ? 'lit' : l.silenced ? 'silenced' : 'dark');
const LAMP_FILL: Record<LampState, string> = { lit: 'var(--green)', dark: 'var(--steel-lo)', silenced: 'var(--red)' };
const LAMP_CLASS: Record<LampState, string> = { lit: 'status-ok', dark: 'status-dim', silenced: 'status-bad' };

function Lamp({ fill, lit, blink = false }: { fill: string; lit: boolean; blink?: boolean }) {
  return (
    <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true" className={blink ? 'klaxon-lamp' : undefined} style={{ flexShrink: 0 }}>
      <circle cx="6" cy="6" r="4.5" fill={fill} stroke="var(--steel)" strokeWidth="1.2" />
      {lit && <circle cx="4.5" cy="4.5" r="1.4" fill="var(--text)" opacity="0.35" />}
    </svg>
  );
}

const clock = (at: number) => new Date(at).toTimeString().slice(0, 8);

function TickerLine({ e }: { e: LinkEvent }) {
  const t = useStrings();
  const word =
    e.kind === 'call'
      ? e.status === 'ok' ? t.link.ok : e.status === 'refused' ? t.link.refused : t.link.error
      : e.online.length > 0 && e.offline.length > 0 ? `${t.link.onlineWord}/${t.link.offlineWord}` : e.online.length > 0 ? t.link.onlineWord : t.link.offlineWord;
  const fill = e.kind === 'link' ? 'var(--dim)' : e.status === 'ok' ? 'var(--green)' : e.status === 'refused' ? 'var(--amber)' : 'var(--red)';
  const body =
    e.kind === 'call'
      ? `${e.tool}  ${e.input}`
      : `${t.link.linkWord}  ${[...e.online.map((n) => `+${n}`), ...e.offline.map((n) => `−${n}`)].join(' ')}`;
  return (
    <div className="line">
      <span className="status-dim">{clock(e.at)}</span>
      <span className="status-dim">›</span>
      <span className="body">{body}</span>
      <span className="word" style={{ color: fill }}><Lamp fill={fill} lit /> {word}</span>
    </div>
  );
}

export function LinkConsole({ linked }: { linked: boolean }) {
  const state = useGame((s) => s);
  const events = useLink();
  const collapsed = usePrefs((p) => p.linkCollapsed);
  const t = useStrings();
  const lamps = toolAvailability(state);
  const onlineCount = lamps.filter((l) => l.online).length;
  const recent = [...events].reverse().slice(0, 3);
  const last = recent[0];
  return (
    <section className="linkconsole" aria-label={t.link.region} title={t.hud.ailinkTitle}>
      <div className="bezel">
        <div className="row">
          <span className="engraved">{t.link.title}</span>
          <span className={`tool ${linked ? 'status-ok' : 'status-bad blink'}`}>
            <Lamp fill={linked ? 'var(--green)' : 'var(--red)'} lit /> {linked ? t.link.linked : t.link.severed}
          </span>
          <span className="status-dim">{t.link.online(onlineCount, lamps.length)}</span>
          {collapsed && last && (
            <span className="status-dim tool">
              {t.link.last} {last.kind === 'call' ? last.tool : t.link.linkWord}
            </span>
          )}
          <button className="fold" onClick={() => setPref('linkCollapsed', !collapsed)} aria-label={collapsed ? t.link.expand : t.link.collapse} aria-expanded={!collapsed}>
            {collapsed ? '▸' : '▾'}
          </button>
        </div>
        {!collapsed && (
          <>
            {BUSES.map((bus) => (
              <div className="row" key={bus}>
                <span className="engraved">{t.reactor.bus[bus]}</span>
                {state.chapter3.shielded.includes(bus) && <span className="tag">{t.link.shielded}</span>}
                {lamps.filter((l) => l.bus === bus).map((l) => {
                  const s = lampOf(l);
                  return (
                    <span key={l.name} className={`tool ${LAMP_CLASS[s]}`} aria-label={t.link.lamp(l.name, s)}>
                      <Lamp fill={LAMP_FILL[s]} lit={s !== 'dark'} blink={s === 'silenced'} /> {l.name}
                    </span>
                  );
                })}
              </div>
            ))}
            <div className="ticker" aria-live="polite">
              {recent.length === 0 ? (
                <div className="line status-dim">{t.link.empty}</div>
              ) : (
                recent.map((e, i) => <TickerLine key={`${e.at}-${i}`} e={e} />)
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
```

Replace `src/ui/HUD.tsx`'s `HUD` component (keep `WaveBanner` and the imports it needs; remove the now-unused `toolAvailability` import) with:

```tsx
export function HUD({ linked }: { linked: boolean }) {
  const state = useGame((s) => s);
  const t = useStrings();
  return (
    <>
      <header className="hud">
        <div>
          <strong>ISV CORMORANT</strong>{' '}
          <span className="status-dim">// {t.hud.rooms[state.room]}</span>{' '}
          <span className={state.auxPower ? 'status-ok' : 'status-bad blink'}>
            AUX {state.auxPower ? 'ON' : 'OFF'}
          </span>{' '}
          <span className={enginesOnline(state) ? 'status-ok' : 'status-dim'}>
            {t.hud.engines} {enginesOnline(state) ? 'ONLINE' : 'OFFLINE'}
          </span>
          {state.ngPlus && <>{' '}<span style={{ color: 'var(--amber)', border: '1px solid var(--amber)', borderRadius: 3, padding: '0 6px', fontSize: 11, letterSpacing: '0.1em' }}>{t.hud.ngPlus}</span></>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
          <LocaleToggle />
        </div>
      </header>
      <LinkConsole linked={linked} />
      <WaveBanner />
    </>
  );
}
```

Add `import { LinkConsole } from './LinkConsole';` to `HUD.tsx`. Delete the `.ailink` rules from `theme.css` (`.ailink { ... }` and `.ailink .tool { ... }`).

In `src/App.tsx`, add `import { pushLinkEvent } from './game/link';` and change the registry effect to:

```tsx
  useEffect(() => {
    if (!mc) return;
    const registry = createToolRegistry(mc, buildTools(), gameStore, (change) => pushLinkEvent({ kind: 'link', at: Date.now(), ...change }));
    return () => registry.dispose();
  }, [mc]);
```

In `src/styles/palette.test.ts`, replace the `'../ui/DeckMap.tsx'` glob line with:

```ts
  ...import.meta.glob('../ui/*.tsx', { query: '?raw', import: 'default', eager: true }),
```

- [ ] **Step 9: Gate and commit**

Run: `npx vitest run && npm run build`
Expected: both exit 0; 299 tests; the snapshot file unchanged (`git status` shows no `.snap` change).

```bash
git add src/game/prefs.ts src/game/prefs.test.ts src/ui/usePrefs.ts src/game/link.ts src/game/link.test.ts src/ui/useLink.ts src/ui/LinkConsole.tsx src/mcp/registry.ts src/mcp/registry.test.ts src/mcp/tools.ts src/mcp/tools.test.ts src/game/store.ts src/ui/HUD.tsx src/ui/strings.ts src/styles/theme.css src/styles/palette.test.ts src/main.tsx src/App.tsx
git commit -m "feat: the AUX LINK console — lamp banks by bus, the ticker, every call leaves a trace

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01MUJfbE723MBfr34oDFgZJ9"
```

---

### Task 3: The soundscape — master mute, the mixer, the SOUND toggle

**Files:**
- Create: `src/audio/mixer.ts`, `src/audio/mixer.test.ts`, `src/ui/SoundToggle.tsx`
- Modify: `src/audio/sound.ts`, `src/ui/HUD.tsx`, `src/ui/strings.ts`, `src/App.tsx`

**Interfaces:**
- Consumes: `prefsStore`/`setPref` (Task 2), `linkStore` (Task 2), `enginesOnline` (`src/game/derived.ts`), `ENGINES_REQUIRED` (`src/game/content.ts`).
- Produces: `getAudioContext()`, `getMaster()`, `setMuted(bool)`, `isMuted()`, `noiseBuffer(ctx, seconds)`, `playRelayClick()`, `playBulkhead()` (Task 4 uses it); `MixTargets`, `mixFor(s)`, `startMixer(store): () => void`; `SoundToggle`. `startAmbience` is removed.

- [ ] **Step 1: Failing tests — `mixFor`**

Create `src/audio/mixer.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { mixFor } from './mixer';
import { initialState } from '../game/store';
import type { GameState } from '../game/types';

const base = (patch: Partial<GameState> = {}): GameState => ({ ...initialState(0), ...patch });
const ch3 = (patch: Partial<GameState['chapter3']>) => ({ ...initialState(0).chapter3, ...patch });

describe('mixFor — the ship sounds like its state', () => {
  it('the hum follows aux power and the reactor load; the engines lift its pitch', () => {
    expect(mixFor(base()).hum).toEqual({ freq: 55, gain: 0.004 });
    expect(mixFor(base({ auxPower: true })).hum.gain).toBeCloseTo(0.012 + 0.0004 * 40, 6);
    const online = mixFor(base({
      auxPower: true, fuseInstalled: '10A', valveSettings: [6, 3, 7],
      powerAllocation: { life_support: 15, medbay: 0, comms: 0, doors: 5, engines: 20, isolation: 0 },
    }));
    expect(online.hum.freq).toBe(58);
    expect(online.engineDrive).toBe(1);
  });

  it('engine drive rises with power before the engines are online', () => {
    const half = mixFor(base({ powerAllocation: { life_support: 25, medbay: 5, comms: 0, doors: 0, engines: 10, isolation: 0 } }));
    expect(half.engineDrive).toBeCloseTo(0.5);
  });

  it('the wave closes the filter and shakes the bed; containment slows the reactor; a won game is still', () => {
    expect(mixFor(base({ killswitch: 'active', chapter3: ch3({ wave: 'calm' }) }))).toMatchObject({ lowpassHz: 12000, tremoloHz: 0, reactorPulseHz: 0.8 });
    expect(mixFor(base({ killswitch: 'active', chapter3: ch3({ wave: 'warning' }) }))).toMatchObject({ lowpassHz: 2400, tremoloHz: 0, reactorPulseHz: 1.6 });
    expect(mixFor(base({ killswitch: 'active', chapter3: ch3({ wave: 'active' }) }))).toMatchObject({ lowpassHz: 400, tremoloHz: 6, reactorPulseHz: 2.4 });
    expect(mixFor(base({ killswitch: 'contained' })).reactorPulseHz).toBe(0.6);
    expect(mixFor(base({ won: true, killswitch: 'active', chapter3: ch3({ wave: 'active' }) }))).toMatchObject({ bed: 0, lowpassHz: 12000, tremoloHz: 0, ritualTick: false });
    expect(mixFor(base({ chapter3: ch3({ kernelSeated: true }) })).vaultCharged).toBe(true);
  });

  it('ticks only while a ritual is armed', () => {
    expect(mixFor(base()).ritualTick).toBe(false);
    expect(mixFor(base({ ritual: { active: 'launch', phase: 'armed', endsAt: 1, held: false } })).ritualTick).toBe(true);
    expect(mixFor(base({ ritual: { active: 'launch', phase: 'done', endsAt: 1, held: false } })).ritualTick).toBe(false);
  });

  it('the comms array never sounds different for where the dish points or whether the beacon was heard', () => {
    const at = (az: number, el: number, beaconHeard: boolean) =>
      mixFor(base({ room: 'comms_array', chapter: 3, chapter3: ch3({ dish: { az, el }, beaconHeard }) }));
    const reference = at(0, 0, false);
    for (const [az, el] of [[217, 34], [90, 10], [359, 89], [180, 45]]) {
      expect(at(az, el, false)).toEqual(reference);
      expect(at(az, el, true)).toEqual(reference);
    }
  });
});
```

Run: `npx vitest run src/audio/mixer.test.ts`
Expected: FAIL — cannot resolve `./mixer`.

- [ ] **Step 2: `sound.ts` — master, mute, noise, the two new cues**

Replace the top of `src/audio/sound.ts` (everything before `export function playBlip`) with:

```ts
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

function ensureCtx(): AudioContext | null {
  try {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 1;
      master.connect(ctx.destination);
    }
    return ctx;
  } catch {
    return null;
  }
}

// The mixer hangs its graph off the same master, so one mute silences everything.
export function getAudioContext(): AudioContext | null {
  return ensureCtx();
}

export function getMaster(): GainNode | null {
  ensureCtx();
  return master;
}

export function setMuted(next: boolean): void {
  muted = next;
  if (!ctx || !master) return;
  master.gain.setTargetAtTime(next ? 0 : 1, ctx.currentTime, 0.02);
}

export function isMuted(): boolean {
  return muted;
}

export function noiseBuffer(c: AudioContext, seconds: number): AudioBuffer {
  const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * seconds)), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function tone(freq: number, durationMs: number, type: OscillatorType, gainValue: number): void {
  const c = ensureCtx();
  if (!c || !master) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(gainValue, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + durationMs / 1000);
  osc.connect(gain).connect(master);
  osc.start();
  osc.stop(c.currentTime + durationMs / 1000);
}
```

Delete `startAmbience` and append after `playBeaconPing`:

```ts
// A relay closing somewhere in the wall: the sound of the agent acting.
export function playRelayClick(): void {
  tone(1800, 25, 'square', 0.02);
}

// A bulkhead cycling: servo hiss, then the thunk of the leaves meeting.
export function playBulkhead(): void {
  const c = ensureCtx();
  if (!c || !master) return;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 0.4);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 900;
  const g = c.createGain();
  g.gain.setValueAtTime(0.05, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.4);
  src.connect(lp).connect(g).connect(master);
  src.start();
  src.stop(c.currentTime + 0.4);
  setTimeout(() => tone(70, 220, 'sine', 0.08), 180);
}
```

- [ ] **Step 3: The mixer**

Create `src/audio/mixer.ts`:

```ts
// The ship's soundscape. Diegetic only: every layer is a sound the ship makes,
// generated from oscillators and filtered noise — no assets. mixFor() is the
// logic (pure, tested); startMixer() is the wiring (thin, untested).
import type { StoreApi } from 'zustand/vanilla';
import type { GameState, RoomId } from '../game/types';
import { ENGINES_REQUIRED } from '../game/content';
import { enginesOnline } from '../game/derived';
import { linkStore } from '../game/link';
import { prefsStore } from '../game/prefs';
import { getAudioContext, getMaster, noiseBuffer, playRelayClick, setMuted } from './sound';

export interface MixTargets {
  room: RoomId;
  bed: number; // 0 or 1 — the room layer's gain (0 once won)
  hum: { freq: number; gain: number };
  engineDrive: number; // 0..1 — engineering turbine pitch/level
  lowpassHz: number; // ambience filter: 12000 open, 2400 warning, 400 active wave
  tremoloHz: number; // 0 off; 6 during an active wave
  reactorPulseHz: number; // 0.8 calm, 1.6 warning, 2.4 active, 0.6 contained
  vaultCharged: boolean; // the core vault's whine once the kernel is seated
  ritualTick: boolean; // ritual.phase === 'armed'
}

// Never reads chapter3.dish or chapter3.beaconHeard: on a dead-encoder ship
// the agent is the meter, and a carrier the human could hear would solve
// the puzzle by ear.
export function mixFor(s: GameState): MixTargets {
  const allocated = Object.values(s.powerAllocation).reduce((a, b) => a + b, 0);
  const engines = enginesOnline(s);
  const wave = s.killswitch === 'active' && !s.won ? s.chapter3.wave : 'calm';
  return {
    room: s.room,
    bed: s.won ? 0 : 1,
    hum: { freq: engines ? 58 : 55, gain: s.auxPower ? 0.012 + 0.0004 * allocated : 0.004 },
    engineDrive: Math.min(1, s.powerAllocation.engines / ENGINES_REQUIRED + (engines ? 0.3 : 0)),
    lowpassHz: wave === 'active' ? 400 : wave === 'warning' ? 2400 : 12000,
    tremoloHz: wave === 'active' ? 6 : 0,
    reactorPulseHz: s.killswitch === 'contained' ? 0.6 : wave === 'active' ? 2.4 : wave === 'warning' ? 1.6 : 0.8,
    vaultCharged: s.chapter3.kernelSeated,
    ritualTick: s.ritual.phase === 'armed' && !s.won,
  };
}

// ---- wiring ---------------------------------------------------------------

interface Layer {
  out: GainNode;
  update(t: MixTargets): void;
  stop(): void;
}

const CROSSFADE_S = 1.5;

function osc(c: AudioContext, type: OscillatorType, freq: number): OscillatorNode {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  o.start();
  return o;
}
function noise(c: AudioContext): AudioBufferSourceNode {
  const n = c.createBufferSource();
  n.buffer = noiseBuffer(c, 2);
  n.loop = true;
  n.start();
  return n;
}
function filter(c: AudioContext, type: BiquadFilterType, freq: number, q = 1): BiquadFilterNode {
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}
function gain(c: AudioContext, value: number): GainNode {
  const g = c.createGain();
  g.gain.value = value;
  return g;
}
// An LFO into an AudioParam: the param keeps its base value, the oscillator adds ±depth.
function lfo(c: AudioContext, rateHz: number, depth: number, target: AudioParam): OscillatorNode {
  const o = osc(c, 'sine', rateHz);
  const g = gain(c, depth);
  o.connect(g);
  g.connect(target);
  return o;
}
// A one-shot into a layer, with a decaying envelope.
function burst(c: AudioContext, into: AudioNode, source: AudioNode, level: number, ms: number): void {
  const g = c.createGain();
  g.gain.setValueAtTime(level, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + ms / 1000);
  source.connect(g).connect(into);
}
function ping(c: AudioContext, into: AudioNode, freq: number, ms: number, level: number, type: OscillatorType = 'sine'): void {
  const o = osc(c, type, freq);
  burst(c, into, o, level, ms);
  o.stop(c.currentTime + ms / 1000);
}
function creak(c: AudioContext, into: AudioNode, freq: number, q: number, ms: number, level: number): void {
  const n = c.createBufferSource();
  n.buffer = noiseBuffer(c, ms / 1000);
  const f = filter(c, 'bandpass', freq, q);
  n.connect(f);
  burst(c, into, f, level, ms);
  n.start();
  n.stop(c.currentTime + ms / 1000);
}
// Repeats fn at a random interval in [minMs, maxMs]; returns a stopper. The
// randomness is texture only — nothing here touches gameplay.
function every(minMs: number, maxMs: number, fn: () => void): () => void {
  let timer = 0;
  let live = true;
  const next = () => minMs + Math.random() * (maxMs - minMs);
  const tick = () => {
    if (!live) return;
    fn();
    timer = window.setTimeout(tick, next());
  };
  timer = window.setTimeout(tick, next());
  return () => {
    live = false;
    window.clearTimeout(timer);
  };
}

type LayerFactory = (c: AudioContext) => Layer;

const LAYERS: Record<RoomId, LayerFactory> = {
  cryo_bay: (c) => {
    // the compressor breathing: band-passed hiss with a slow swell, a tick now and then
    const out = gain(c, 1);
    const n = noise(c);
    const f = filter(c, 'bandpass', 2000, 0.7);
    const g = gain(c, 0.03);
    const breath = lfo(c, 0.15, 0.015, g.gain);
    n.connect(f).connect(g).connect(out);
    const stopTicks = every(4000, 9000, () => ping(c, out, 1200, 30, 0.015, 'square'));
    return { out, update() {}, stop() { stopTicks(); n.stop(); breath.stop(); } };
  },
  engineering: (c) => {
    // the turbine: two detuned saws through a lowpass that opens with engine drive
    const out = gain(c, 1);
    const a = osc(c, 'sawtooth', 110);
    const b = osc(c, 'sawtooth', 111.5);
    const f = filter(c, 'lowpass', 300, 2);
    const g = gain(c, 0.01);
    a.connect(f);
    b.connect(f);
    f.connect(g).connect(out);
    return {
      out,
      update(t) {
        f.frequency.setTargetAtTime(300 + 1200 * t.engineDrive, c.currentTime, 0.4);
        g.gain.setTargetAtTime(0.01 + 0.03 * t.engineDrive, c.currentTime, 0.4);
      },
      stop() { a.stop(); b.stop(); },
    };
  },
  bridge: (c) => {
    // near silence: a high hiss and a relay every few seconds
    const out = gain(c, 1);
    const n = noise(c);
    const f = filter(c, 'highpass', 6000);
    const g = gain(c, 0.006);
    n.connect(f).connect(g).connect(out);
    const stopClicks = every(5000, 8000, () => ping(c, out, 1800, 25, 0.02, 'square'));
    return { out, update() {}, stop() { stopClicks(); n.stop(); } };
  },
  medbay: (c) => {
    // the player's own monitor, and a fan
    const out = gain(c, 1);
    const n = noise(c);
    const f = filter(c, 'lowpass', 500);
    const g = gain(c, 0.015);
    n.connect(f).connect(g).connect(out);
    const stopBeeps = every(1200, 1200, () => ping(c, out, 880, 60, 0.02));
    return { out, update() {}, stop() { stopBeeps(); n.stop(); } };
  },
  crew_quarters: (c) => {
    // the quietest room: a vent, and the hull settling
    const out = gain(c, 1);
    const n = noise(c);
    const f = filter(c, 'lowpass', 300);
    const g = gain(c, 0.012);
    n.connect(f).connect(g).connect(out);
    const stopCreaks = every(9000, 18000, () => creak(c, out, 700, 12, 250, 0.04));
    return { out, update() {}, stop() { stopCreaks(); n.stop(); } };
  },
  hydroponics: (c) => {
    // a fan with a wobble, and drips into a wet room
    const out = gain(c, 1);
    const n = noise(c);
    const f = filter(c, 'lowpass', 800);
    const g = gain(c, 0.015);
    const whir = lfo(c, 0.3, 200, f.frequency);
    n.connect(f).connect(g).connect(out);
    const delay = c.createDelay(1);
    delay.delayTime.value = 0.18;
    const fb = gain(c, 0.35);
    delay.connect(fb).connect(delay);
    delay.connect(out);
    const stopDrips = every(700, 2200, () => ping(c, delay, 800 + Math.random() * 600, 40, 0.03));
    return { out, update() {}, stop() { stopDrips(); n.stop(); whir.stop(); } };
  },
  cargo_bay: (c) => {
    // a big cold room: rumble and metal
    const out = gain(c, 1);
    const o = osc(c, 'sawtooth', 45);
    const f = filter(c, 'lowpass', 120);
    const g = gain(c, 0.02);
    o.connect(f).connect(g).connect(out);
    const stopCreaks = every(6000, 14000, () => creak(c, out, 300, 10, 400, 0.05));
    return { out, update() {}, stop() { stopCreaks(); o.stop(); } };
  },
  reactor_room: (c) => {
    // the pulse: 40 Hz, throbbing faster as the waves come
    const out = gain(c, 1);
    const o = osc(c, 'sine', 40);
    const g = gain(c, 0.025);
    const pulse = lfo(c, 0.8, 0.02, g.gain);
    o.connect(g).connect(out);
    return {
      out,
      update(t) { pulse.frequency.setTargetAtTime(t.reactorPulseHz, c.currentTime, 0.2); },
      stop() { o.stop(); pulse.stop(); },
    };
  },
  core_vault: (c) => {
    // mains hum with harmonics; a whine climbs once the kernel is seated
    const out = gain(c, 1);
    const parts = [[60, 0.012], [120, 0.005], [180, 0.003]].map(([freq, level]) => {
      const o = osc(c, 'sine', freq);
      o.connect(gain(c, level)).connect(out);
      return o;
    });
    const whine = osc(c, 'sine', 900);
    const wg = gain(c, 0);
    whine.connect(wg).connect(out);
    return {
      out,
      update(t) {
        wg.gain.setTargetAtTime(t.vaultCharged ? 0.008 : 0, c.currentTime, 1.5);
        whine.frequency.setTargetAtTime(t.vaultCharged ? 1400 : 900, c.currentTime, 3);
      },
      stop() { parts.forEach((o) => o.stop()); whine.stop(); },
    };
  },
  comms_array: (c) => {
    // static only. Nothing here reads the dish or the beacon: on a dead-encoder ship the agent is the meter.
    const out = gain(c, 1);
    const n = noise(c);
    const f = filter(c, 'bandpass', 1500, 0.5);
    const g = gain(c, 0.02);
    const drift = lfo(c, 0.2, 0.006, g.gain);
    n.connect(f).connect(g).connect(out);
    return { out, update() {}, stop() { n.stop(); drift.stop(); } };
  },
};

let running: (() => void) | null = null;

// Builds the graph on the same master as the cues, follows the game store, and
// returns a disposer. Idempotent: a second call returns the live disposer.
export function startMixer(store: StoreApi<GameState>): () => void {
  if (running) return running;
  const c = getAudioContext();
  const master = getMaster();
  if (!c || !master) return () => {};

  // ambience bus: room layer → lowpass → tremolo → bed → master
  const bed = gain(c, 1);
  const trem = gain(c, 1);
  const tremLfo = osc(c, 'sine', 0);
  const tremDepth = gain(c, 0);
  tremLfo.connect(tremDepth);
  tremDepth.connect(trem.gain);
  const lp = filter(c, 'lowpass', 12000, 0.7);
  lp.connect(trem).connect(bed).connect(master);

  // the hum: the reactor through the deck plates
  const hum = osc(c, 'sine', 55);
  const humGain = gain(c, 0.004);
  hum.connect(humGain).connect(master);

  let current: { room: RoomId; layer: Layer } | null = null;
  let tickTimer = 0;

  function swapLayer(old: { room: RoomId; layer: Layer } | null, room: RoomId): { room: RoomId; layer: Layer } {
    const now = c!.currentTime;
    const layer = LAYERS[room](c!);
    layer.out.gain.setValueAtTime(0, now);
    layer.out.connect(lp);
    layer.out.gain.setTargetAtTime(1, now, CROSSFADE_S / 3);
    if (old) {
      old.layer.out.gain.setTargetAtTime(0, now, CROSSFADE_S / 3);
      window.setTimeout(() => {
        old.layer.stop();
        old.layer.out.disconnect();
      }, CROSSFADE_S * 1000 + 200);
    }
    return { room, layer };
  }

  function apply(t: MixTargets): void {
    const now = c!.currentTime;
    bed.gain.setTargetAtTime(t.bed, now, 0.8);
    lp.frequency.setTargetAtTime(t.lowpassHz, now, 0.6);
    tremLfo.frequency.setTargetAtTime(t.tremoloHz, now, 0.1);
    tremDepth.gain.setTargetAtTime(t.tremoloHz > 0 ? 0.5 : 0, now, 0.1);
    hum.frequency.setTargetAtTime(t.hum.freq, now, 0.5);
    humGain.gain.setTargetAtTime(t.hum.gain, now, 0.5);
    if (!current || current.room !== t.room) current = swapLayer(current, t.room);
    current.layer.update(t);
    if (t.ritualTick && tickTimer === 0) tickTimer = window.setInterval(playRelayClick, 1000);
    if (!t.ritualTick && tickTimer !== 0) {
      window.clearInterval(tickTimer);
      tickTimer = 0;
    }
  }

  apply(mixFor(store.getState()));
  const unsubGame = store.subscribe((s) => apply(mixFor(s)));
  const unsubLink = linkStore.subscribe((s, prev) => {
    const last = s.events[s.events.length - 1];
    if (last && last !== prev.events[prev.events.length - 1] && last.kind === 'call') playRelayClick();
  });
  setMuted(prefsStore.getState().muted);
  const unsubPrefs = prefsStore.subscribe((p) => setMuted(p.muted));

  running = () => {
    unsubGame();
    unsubLink();
    unsubPrefs();
    if (tickTimer !== 0) window.clearInterval(tickTimer);
    current?.layer.stop();
    hum.stop();
    tremLfo.stop();
    running = null;
  };
  return running;
}
```

Run: `npx vitest run src/audio/mixer.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 4: The SOUND toggle**

In `src/ui/strings.ts`, in the interface `hud` block add `sound: string; soundOn: string; soundOff: string;`. In `en.hud` add `sound: 'SOUND', soundOn: 'Turn the ship\'s sound on', soundOff: 'Mute the ship',`. In `ptBR.hud` add `sound: 'SOM', soundOn: 'Ligar o som da nave', soundOff: 'Silenciar a nave',`.

Create `src/ui/SoundToggle.tsx`:

```tsx
import { setPref } from '../game/prefs';
import { usePrefs } from './usePrefs';
import { useStrings } from './useLocale';

export function SoundToggle() {
  const muted = usePrefs((p) => p.muted);
  const t = useStrings();
  return (
    <button
      onClick={() => setPref('muted', !muted)}
      aria-label={muted ? t.hud.soundOn : t.hud.soundOff}
      aria-pressed={!muted}
      style={{ padding: '4px 10px', fontSize: 11, color: muted ? 'var(--dim)' : undefined, borderColor: muted ? 'var(--dim)' : undefined }}
    >
      {t.hud.sound} {muted ? '○' : '●'}
    </button>
  );
}
```

In `src/ui/HUD.tsx`, add `import { SoundToggle } from './SoundToggle';` and change the right-hand header div to:

```tsx
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
          <SoundToggle />
          <LocaleToggle />
        </div>
```

In `src/App.tsx`: remove `startAmbience` from the `./audio/sound` import, add `import { startMixer } from './audio/mixer';`, and replace **both** `startAmbience();` calls (the WAKE UP button and `wakeOnInvite`) with `startMixer(gameStore);`.

- [ ] **Step 5: Gate and commit**

Run: `npx vitest run && npm run build`
Expected: both exit 0; 304 tests.

```bash
git add src/audio/sound.ts src/audio/mixer.ts src/audio/mixer.test.ts src/ui/SoundToggle.tsx src/ui/HUD.tsx src/ui/strings.ts src/App.tsx
git commit -m "feat: the soundscape — a diegetic mixer per room, the reactive hum, one mute for everything

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01MUJfbE723MBfr34oDFgZJ9"
```

---

### Task 4: The cold open and the bulkheads

**Files:**
- Create: `src/ui/coldOpen.ts`, `src/ui/coldOpen.test.ts`, `src/ui/ColdOpen.tsx`, `src/ui/Bulkhead.tsx`
- Modify: `src/ui/strings.ts`, `src/styles/theme.css`, `src/App.tsx`

**Interfaces:**
- Consumes: `playBulkhead()` (Task 3), `prng` (`src/game/secrets.ts`), `SCENES` (`src/scenes/registry.tsx`), `useMeta`.
- Produces: `isFreshRun(s)`, `ColdOpenStepId`, `ColdOpenStep`, `COLD_OPEN_DONE_MS`, `coldOpenSchedule()`, `Crystal`, `frostCrystals(seed, count?)`, `crystalPoints(c)`, `THAW_FROM`, `THAW_TO`, `thawTemp(progress)`; `ColdOpen({ onDone })`; `Bulkhead({ room })`.

- [ ] **Step 1: Failing tests**

Create `src/ui/coldOpen.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { COLD_OPEN_DONE_MS, coldOpenSchedule, crystalPoints, frostCrystals, isFreshRun, thawTemp } from './coldOpen';
import { gameStore, initialState, removeGrate, resetGame } from '../game/store';
import { buildTools } from '../mcp/tools';

describe('isFreshRun', () => {
  it('is true on a fresh ship, classic or plus, and false once anything has happened', async () => {
    expect(isFreshRun(initialState(0))).toBe(true);
    expect(isFreshRun(initialState(177, true))).toBe(true);
    resetGame(0);
    removeGrate();
    expect(isFreshRun(gameStore.getState())).toBe(false);
    resetGame(0);
    await buildTools().find((t) => t.name === 'get_ship_status')!.definition.execute({});
    expect(isFreshRun(gameStore.getState())).toBe(false);
    expect(isFreshRun({ ...initialState(0), checkpoint: { chapter: 1, room: 'bridge' } })).toBe(false);
    expect(isFreshRun({ ...initialState(0), won: true })).toBe(false);
    expect(isFreshRun({ ...initialState(0), room: 'medbay' })).toBe(false);
  });
});

describe('the thaw', () => {
  it('runs four steps in order and ends after seven seconds', () => {
    const steps = coldOpenSchedule();
    expect(steps.map((s) => s.id)).toEqual(['vitals', 'frost', 'bulletin', 'open']);
    for (let i = 1; i < steps.length; i++) expect(steps[i].at).toBeGreaterThan(steps[i - 1].at);
    expect(steps[steps.length - 1].at).toBeLessThan(COLD_OPEN_DONE_MS);
    expect(COLD_OPEN_DONE_MS).toBe(7000);
  });

  it('freezes the same ship the same way, and a different ship differently', () => {
    expect(frostCrystals(7)).toEqual(frostCrystals(7));
    expect(frostCrystals(7)).not.toEqual(frostCrystals(8));
    expect(frostCrystals(7)).toHaveLength(36);
    expect(crystalPoints(frostCrystals(7)[0]).split(' ')).toHaveLength(12);
  });

  it('thaws from 31.2 to 36.4', () => {
    expect(thawTemp(0)).toBe(31.2);
    expect(thawTemp(0.5)).toBe(33.8);
    expect(thawTemp(1)).toBe(36.4);
    expect(thawTemp(2)).toBe(36.4);
  });
});
```

Run: `npx vitest run src/ui/coldOpen.test.ts`
Expected: FAIL — cannot resolve `./coldOpen`.

- [ ] **Step 2: The pure part**

Create `src/ui/coldOpen.ts`:

```ts
// The thaw: what plays after WAKE UP on a fresh ship. Pure schedule and
// geometry; ColdOpen.tsx is the overlay that follows it.
import type { GameState } from '../game/types';
import { prng } from '../game/secrets';

export function isFreshRun(s: GameState): boolean {
  return s.chapter === 1 && s.room === 'cryo_bay' && !s.grateRemoved && s.breakersFlipped.length === 0
    && s.toolCalls === 0 && s.checkpoint === null && !s.won;
}

export type ColdOpenStepId = 'vitals' | 'frost' | 'bulletin' | 'open';
export interface ColdOpenStep { id: ColdOpenStepId; at: number }
export const COLD_OPEN_DONE_MS = 7000;

export function coldOpenSchedule(): ColdOpenStep[] {
  return [{ id: 'vitals', at: 0 }, { id: 'frost', at: 1800 }, { id: 'bulletin', at: 3400 }, { id: 'open', at: 6200 }];
}

export interface Crystal { x: number; y: number; r: number; rot: number; points: number }

// Frost on the pod glass, in a 100×100 space: the same ship freezes the same way.
export function frostCrystals(seed: number, count = 36): Crystal[] {
  const rnd = prng((seed ^ 0x0f0e0d0c) >>> 0);
  const out: Crystal[] = [];
  for (let i = 0; i < count; i++) {
    out.push({ x: rnd() * 100, y: rnd() * 100, r: 3 + rnd() * 9, rot: rnd() * 360, points: 6 });
  }
  return out;
}

// One crystal as an SVG points string: a six-pointed star, alternating outer and inner radius.
export function crystalPoints(c: Crystal): string {
  const pts: string[] = [];
  for (let i = 0; i < c.points * 2; i++) {
    const a = ((c.rot + (i * 180) / c.points) * Math.PI) / 180;
    const rr = i % 2 === 0 ? c.r : c.r * 0.45;
    pts.push(`${(c.x + rr * Math.cos(a)).toFixed(2)},${(c.y + rr * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
}

export const THAW_FROM = 31.2;
export const THAW_TO = 36.4;

export function thawTemp(progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  return Math.round((THAW_FROM + (THAW_TO - THAW_FROM) * p) * 10) / 10;
}
```

Run: `npx vitest run src/ui/coldOpen.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 3: Strings — the `open` namespace**

After the `link:` block in each of the three places in `src/ui/strings.ts`:

Interface:

```ts
  open: {
    plate: string; plateAgain: string; run: (n: number) => string; vitals: string; temp: string;
    line1: string; line2: string; line3: string; line4: string; podOpen: string; podSealed: string;
    skip: string; continue: string; aria: string;
  };
```

`en`:

```ts
  open: {
    plate: 'CRYO POD 3 · THAW CYCLE', plateAgain: 'CRYO POD 3 · THAW CYCLE · AGAIN', run: (n) => `RUN ${n}`,
    vitals: 'Vitals trace, drawing itself', temp: 'CORE TEMP',
    line1: 'MAIN COMPUTER: OFFLINE', line2: 'AUX MODEL-CONTEXT LINK: ACTIVE', line3: 'CREW LIFE SIGNS: 1', line4: 'RECOMMENDATION: COOPERATE WITH IT.',
    podOpen: 'POD OPEN', podSealed: 'POD SEALED', skip: 'click, Esc or space to skip', continue: 'Continue',
    aria: 'Thaw cycle: the cryo pod opening',
  },
```

`ptBR`:

```ts
  open: {
    plate: 'CRIOPOD 3 · CICLO DE DESCONGELAMENTO', plateAgain: 'CRIOPOD 3 · CICLO DE DESCONGELAMENTO · DE NOVO', run: (n) => `PARTIDA ${n}`,
    vitals: 'Traço de sinais vitais se desenhando', temp: 'TEMP. CENTRAL',
    line1: 'COMPUTADOR PRINCIPAL: OFFLINE', line2: 'LINK AUXILIAR DE MODEL-CONTEXT: ATIVO', line3: 'SINAIS VITAIS DA TRIPULAÇÃO: 1', line4: 'RECOMENDAÇÃO: COOPERE COM ELE.',
    podOpen: 'POD ABERTO', podSealed: 'POD SELADO', skip: 'clique, Esc ou espaço para pular', continue: 'Continuar',
    aria: 'Ciclo de descongelamento: o criopod abrindo',
  },
```

- [ ] **Step 4: The overlay**

Append to `src/styles/theme.css`:

```css
/* Cold open — the thaw */
.coldopen { position: fixed; inset: 0; z-index: 30; background: var(--hull); display: grid; place-items: center; outline: none; }
.coldopen .pod-plate { position: relative; z-index: 2; width: min(560px, 92vw); border: 3px solid var(--steel); border-radius: 8px; background: var(--face); box-shadow: inset 0 0 0 1px var(--line), 0 20px 60px rgba(0, 0, 0, 0.6); padding: 16px 18px; display: grid; gap: 10px; }
.coldopen .row { display: flex; gap: 10px; align-items: center; justify-content: space-between; font-size: 12px; }
.coldopen .bulletin { min-height: 4.6em; font-size: 12px; letter-spacing: 0.08em; color: var(--text); }
.coldopen .frost { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 3; pointer-events: none; }
.ecg-draw { stroke-dasharray: 900; stroke-dashoffset: 900; animation: ecg 1.6s linear forwards; }
@keyframes ecg { to { stroke-dashoffset: 0; } }
.typewriter { overflow: hidden; white-space: nowrap; width: 0; animation: type 0.5s steps(30, end) forwards; }
@keyframes type { to { width: 100%; } }
.frost-clearing .frost-hole { animation: frost-clear 1.4s ease-out forwards; }
@keyframes frost-clear { to { r: 80px; } }
.frost-clearing { animation: frost-fade 1.6s ease-out forwards; }
@keyframes frost-fade { to { opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  .ecg-draw, .typewriter, .frost-clearing, .frost-clearing .frost-hole { animation: none; }
  .typewriter { width: 100%; }
  .ecg-draw { stroke-dashoffset: 0; }
}
```

Create `src/ui/ColdOpen.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import { useGame } from './useGame';
import { useMeta } from './useMeta';
import { useStrings } from './useLocale';
import { COLD_OPEN_DONE_MS, coldOpenSchedule, crystalPoints, frostCrystals, thawTemp } from './coldOpen';
import { playBulkhead } from '../audio/sound';

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// The thaw. Four steps on a schedule; skippable; under reduced motion it is
// the final frame and a CONTINUE button. Steps: 0 vitals, 1 frost clearing,
// 2 bulletin printing, 3 pod open.
export function ColdOpen({ onDone }: { onDone: () => void }) {
  const seed = useGame((s) => s.seed);
  const ngPlus = useGame((s) => s.ngPlus);
  const runs = useMeta((m) => m.runsCompleted);
  const t = useStrings();
  const [reduced] = useState(reducedMotion);
  const [step, setStep] = useState(reduced ? 3 : 0);
  const [progress, setProgress] = useState(reduced ? 1 : 0);
  const dialog = useRef<HTMLDivElement>(null);
  const done = useRef(false);
  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDone();
  };

  useEffect(() => {
    dialog.current?.focus();
  }, []);

  useEffect(() => {
    if (reduced) return;
    const timers = coldOpenSchedule().map((s, i) =>
      window.setTimeout(() => {
        setStep(i);
        if (s.id === 'open') playBulkhead();
      }, s.at)
    );
    timers.push(window.setTimeout(finish, COLD_OPEN_DONE_MS));
    const ticks = window.setInterval(() => setProgress((p) => Math.min(1, p + 0.05)), 80);
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      window.clearInterval(ticks);
    };
    // finish is stable for the life of the overlay
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ') {
        e.preventDefault();
        finish();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const crystals = frostCrystals(seed);
  const lines = [t.open.line1, t.open.line2, t.open.line3, t.open.line4];
  return (
    <div className="coldopen" role="dialog" aria-modal="true" aria-label={t.open.aria} tabIndex={-1} ref={dialog} onClick={reduced ? undefined : finish}>
      <div className="pod-plate">
        <div className="plate-engraved">
          {ngPlus ? t.open.plateAgain : t.open.plate}
          {ngPlus && ` · ${t.open.run(runs + 1)}`}
        </div>
        <svg viewBox="0 0 320 60" width="100%" role="img" aria-label={t.open.vitals}>
          <rect x="1" y="1" width="318" height="58" rx="4" fill="var(--face-deep)" stroke="var(--steel)" />
          <polyline
            className={reduced ? undefined : 'ecg-draw'}
            points="4,30 40,30 52,30 58,12 64,48 70,30 110,30 122,30 128,12 134,48 140,30 180,30 192,30 198,12 204,48 210,30 250,30 262,30 268,12 274,48 280,30 316,30"
            fill="none" stroke="var(--green)" strokeWidth="1.5"
          />
        </svg>
        <div className="row">
          <span className="status-dim">{t.open.temp}</span>
          <span style={{ color: 'var(--amber)' }}>{thawTemp(progress).toFixed(1)} °C</span>
        </div>
        <div className="bulletin" aria-live="polite">
          {step >= 2 && lines.map((line, i) => (
            <div key={i} className={reduced ? undefined : 'typewriter'} style={reduced ? undefined : { animationDelay: `${i * 0.6}s` }}>{line}</div>
          ))}
        </div>
        <div className="row">
          <span className={step >= 3 ? 'status-ok' : 'status-dim'}>{step >= 3 ? '●' : '○'} {step >= 3 ? t.open.podOpen : t.open.podSealed}</span>
          {reduced ? <button onClick={finish}>{t.open.continue}</button> : <span className="status-dim">{t.open.skip}</span>}
        </div>
      </div>
      {!reduced && (
        <svg className={`frost ${step >= 1 ? 'frost-clearing' : ''}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <mask id="co-hole">
              <rect width="100" height="100" fill="white" />
              <circle className="frost-hole" cx="50" cy="50" r="0" fill="black" />
            </mask>
          </defs>
          <g mask="url(#co-hole)" fill="var(--parchment)" opacity="0.28">
            {crystals.map((c, i) => <polygon key={i} points={crystalPoints(c)} />)}
          </g>
        </svg>
      )}
    </div>
  );
}
```

- [ ] **Step 5: The bulkhead**

Append to `src/styles/theme.css`:

```css
/* Bulkhead — two steel leaves between rooms */
.bulkhead { position: fixed; inset: 0; z-index: 25; pointer-events: none; visibility: hidden; }
.bulkhead.closing, .bulkhead.opening { visibility: visible; }
.bulkhead .leaf { position: absolute; top: 0; bottom: 0; width: 50%; background: linear-gradient(90deg, var(--steel-lo), var(--steel-mid) 55%, var(--steel-hi)); box-shadow: inset -4px 0 0 var(--steel); transition: transform 0.22s ease-out; }
.bulkhead .leaf.left { left: 0; transform: translateX(-101%); }
.bulkhead .leaf.right { left: 50%; transform: translateX(101%); background: linear-gradient(270deg, var(--steel-lo), var(--steel-mid) 55%, var(--steel-hi)); box-shadow: inset 4px 0 0 var(--steel); }
.bulkhead.closing .leaf { transition: transform 0.18s ease-in; transform: translateX(0); }
.bulkhead .doorplate { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); margin: 0; padding: 6px 14px; border: 1px solid var(--brass-lo); background: var(--face); opacity: 0; transition: opacity 0.12s; }
.bulkhead.closing .doorplate { opacity: 1; transition-delay: 0.1s; }
```

Create `src/ui/Bulkhead.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import type { RoomId } from '../game/types';
import { SCENES } from '../scenes/registry';
import { useStrings } from './useLocale';
import { playBulkhead } from '../audio/sound';

const CLOSE_MS = 180;
const OPEN_MS = 220;
const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Renders the scene of the room the crew is in, and cycles a bulkhead when
// that room changes: leaves close over the old scene, the scene swaps, the
// leaves open. Never on mount or resume; instant and silent under reduced motion.
export function Bulkhead({ room }: { room: RoomId }) {
  const [shown, setShown] = useState(room);
  const [phase, setPhase] = useState<'idle' | 'closing' | 'opening'>('idle');
  const timers = useRef<number[]>([]);
  const t = useStrings();

  useEffect(() => {
    if (room === shown) return;
    if (reducedMotion()) {
      setShown(room);
      return;
    }
    setPhase('closing');
    playBulkhead();
    timers.current.push(window.setTimeout(() => { setShown(room); setPhase('opening'); }, CLOSE_MS));
    timers.current.push(window.setTimeout(() => setPhase('idle'), CLOSE_MS + OPEN_MS));
    return () => {
      timers.current.forEach((id) => window.clearTimeout(id));
      timers.current = [];
    };
    // shown is the transition's own state; the effect keys on the destination only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  const Scene = SCENES[shown];
  return (
    <>
      <Scene />
      <div className={`bulkhead ${phase}`} aria-hidden="true">
        <div className="leaf left" />
        <div className="leaf right" />
        <div className="plate-engraved doorplate">{t.hud.rooms[room].toUpperCase()}</div>
      </div>
    </>
  );
}
```

- [ ] **Step 6: Wire `App.tsx`**

In `src/App.tsx`: remove the `SCENES` import; add

```tsx
import { Bulkhead } from './ui/Bulkhead';
import { ColdOpen } from './ui/ColdOpen';
import { isFreshRun } from './ui/coldOpen';
```

Inside `App()`, after the `const won = useGame((s) => s.won);` line add:

```tsx
  const seed = useGame((s) => s.seed);
  const fresh = useGame(isFreshRun);
  const [thawed, setThawed] = useState<Set<number>>(() => new Set());
```

Delete the line `const Scene = SCENES[room];`. Replace the started-branch return with:

```tsx
  const showColdOpen = !won && fresh && !thawed.has(seed);
  return (
    <>
      <HUD linked={mc !== null} />
      {!mc && <FallbackBanner />}
      {won ? (
        <Epilogue />
      ) : (
        <>
          <DeckMap />
          <Bulkhead room={room} />
        </>
      )}
      {showColdOpen && <ColdOpen onDone={() => setThawed((prev) => new Set(prev).add(seed))} />}
      <BuildTag />
    </>
  );
```

- [ ] **Step 7: Gate and commit**

Run: `npx vitest run && npm run build`
Expected: both exit 0; 308 tests.

```bash
git add src/ui/coldOpen.ts src/ui/coldOpen.test.ts src/ui/ColdOpen.tsx src/ui/Bulkhead.tsx src/ui/strings.ts src/styles/theme.css src/App.tsx
git commit -m "feat: the thaw and the bulkheads — a run begins in the pod, the ship is crossed door by door

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01MUJfbE723MBfr34oDFgZJ9"
```

---

### Task 5: Ending vignettes and the FLIGHT RECORD

**Files:**
- Create: `src/scenes/EndingVignette.tsx`, `src/ui/FlightRecord.tsx`
- Modify: `src/ui/DeckMap.tsx` (`HULL_PATH`), `src/scenes/Epilogue.tsx`, `src/ui/strings.ts`, `src/styles/theme.css`, `src/App.tsx`

**Interfaces:**
- Consumes: `encodeShipCode`, `shipLink` (Task 1); `.plate` CSS (Task 1); `ROOMS` (`src/game/rooms.ts`); `prng`; `useMeta`.
- Produces: `HULL_PATH` (string, the deck map's hull silhouette); `EndingVignette({ ending, seed, beaconHeard })`; `FlightRecord({ compact? })`.

- [ ] **Step 1: `HULL_PATH`**

In `src/ui/DeckMap.tsx`, add above the `FILL` constant:

```ts
export const HULL_PATH = 'M 14 30 L 40 14 L 370 14 L 392 45 L 392 105 L 370 128 L 40 128 L 14 110 Z';
```

and change the hull `<path d="M 14 30 … Z"` to `<path d={HULL_PATH}`.

Run: `npx vitest run src/ui/DeckMap.test.ts`
Expected: PASS.

- [ ] **Step 2: Strings — the `record` namespace**

After the `open:` block in each of the three places:

Interface:

```ts
  record: {
    title: string; hull: string; run: string; profile: string; classic: string; plus: string; calls: string; best: string; waves: string;
    proof: string; beacon: string; contained: string; endings: string; leave: string; restore: string; broadcast: string; stay: string; unknown: string;
    copyLink: string; copied: string; linkAria: (code: string) => string;
    ariaLeave: string; ariaRestore: string; ariaBroadcast: string; ariaStay: string;
  };
```

`en`:

```ts
  record: {
    title: 'FLIGHT RECORD · ISV CORMORANT', hull: 'HULL', run: 'RUN', profile: 'PROFILE', classic: 'CLASSIC', plus: 'PLUS',
    calls: 'CALLS', best: 'BEST', waves: 'WAVES', proof: 'PROOF', beacon: 'BEACON', contained: 'CONTAINED', endings: 'Endings seen',
    leave: 'LEAVE', restore: 'RESTORE', broadcast: 'BROADCAST', stay: 'STAY', unknown: '—',
    copyLink: 'COPY LINK', copied: 'COPIED', linkAria: (code) => `Copy a link to ship ${code}`,
    ariaLeave: 'The Cormorant receding; pod two drifting away',
    ariaRestore: 'The Cormorant lighting up deck by deck',
    ariaBroadcast: 'Rings spreading from the comms array; relays lighting to the edge',
    ariaStay: 'Pod one docking at the engineering clamps',
  },
```

`ptBR`:

```ts
  record: {
    title: 'REGISTRO DE VOO · ISV CORMORANT', hull: 'CASCO', run: 'PARTIDA', profile: 'PERFIL', classic: 'CLÁSSICO', plus: 'PLUS',
    calls: 'CHAMADAS', best: 'MELHOR', waves: 'ONDAS', proof: 'PROVA', beacon: 'FAROL', contained: 'CONTIDO', endings: 'Finais vistos',
    leave: 'PARTIR', restore: 'RESTAURAR', broadcast: 'TRANSMITIR', stay: 'FICAR', unknown: '—',
    copyLink: 'COPIAR LINK', copied: 'COPIADO', linkAria: (code) => `Copiar um link para a nave ${code}`,
    ariaLeave: 'A Cormorant se afastando; o pod dois à deriva',
    ariaRestore: 'A Cormorant acendendo convés por convés',
    ariaBroadcast: 'Anéis se espalhando do arranjo de comms; relés acendendo até a borda',
    ariaStay: 'O pod um acoplando nas garras da engenharia',
  },
```

- [ ] **Step 3: The vignette**

Append to `src/styles/theme.css`:

```css
/* Ending vignettes */
@keyframes ev-drift { to { transform: translateX(70px); } }
.ev-drift { animation: ev-drift 4s ease-out forwards; }
@keyframes ev-lit { from { opacity: 0.15; } to { opacity: 1; } }
.ev-room, .ev-relay, .ev-clamp { animation: ev-lit 0.5s ease-out both; }
@keyframes ev-ring { from { r: 4px; opacity: 0.9; } to { r: 130px; opacity: 0; } }
.ev-ring { animation: ev-ring 2.4s ease-out infinite; }
@keyframes ev-approach { from { transform: translateX(-230px); } to { transform: translateX(0); } }
.ev-approach { animation: ev-approach 2s ease-in-out forwards; }
@media (prefers-reduced-motion: reduce) { .ev-drift, .ev-room, .ev-relay, .ev-clamp, .ev-ring, .ev-approach { animation: none; } }
```

Create `src/scenes/EndingVignette.tsx`:

```tsx
import { ROOMS } from '../game/rooms';
import { prng } from '../game/secrets';
import type { EndingId } from '../game/types';
import { HULL_PATH } from '../ui/DeckMap';
import { useStrings } from '../ui/useLocale';

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// The same ship shows the same sky.
function stars(seed: number, n = 46): { x: number; y: number; r: number }[] {
  const rnd = prng((seed ^ 0x57a25) >>> 0);
  return Array.from({ length: n }, () => ({ x: rnd() * 480, y: rnd() * 200, r: 0.4 + rnd() * 1.1 }));
}

// A 480×200 picture of the ending. The hull is the deck map's silhouette,
// drawn at translate(40 30); animations end where the reduced-motion frame sits.
export function EndingVignette({ ending, seed, beaconHeard }: { ending: EndingId | null; seed: number; beaconHeard: boolean }) {
  const t = useStrings();
  const reduced = reducedMotion();
  const kind = ending === 'restore' ? 'restore' : ending === 'broadcast' ? 'broadcast' : ending === 'stay' ? 'stay' : 'leave';
  const aria = kind === 'restore' ? t.record.ariaRestore : kind === 'broadcast' ? t.record.ariaBroadcast : kind === 'stay' ? t.record.ariaStay : t.record.ariaLeave;
  return (
    <svg viewBox="0 0 480 200" width="100%" style={{ maxWidth: 640, display: 'block', margin: '0 auto' }} role="img" aria-label={aria}>
      <defs>
        <linearGradient id="ev-hull" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--steel-lo)" />
          <stop offset="100%" stopColor="var(--hull)" />
        </linearGradient>
      </defs>
      <rect width="480" height="200" fill="var(--face-deep)" />
      {stars(seed).map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="var(--parchment)" opacity="0.7" />)}
      {kind === 'leave' && beaconHeard && <circle cx="12" cy="18" r="2.5" fill="var(--green)" className="beacon-halo" />}
      <g transform="translate(40 30)">
        <path d={HULL_PATH} fill="url(#ev-hull)" stroke="var(--steel)" strokeWidth="2" />
        {kind === 'restore' && ROOMS.map((r, i) => (
          <rect key={r.id} x={r.x - 22} y={r.y - 10} width="44" height="20" rx="2" fill="var(--green)" stroke="var(--line)"
            className={reduced ? undefined : 'ev-room'} style={reduced ? { opacity: 1 } : { animationDelay: `${0.4 + i * 0.35}s` }} />
        ))}
        {kind === 'leave' && (
          <g className={reduced ? undefined : 'ev-drift'} style={reduced ? { transform: 'translateX(70px)' } : undefined}>
            <circle cx="360" cy="45" r="3" fill="var(--amber)" />
            <circle cx="355" cy="45" r="1.2" fill="var(--red)" className="blink" />
          </g>
        )}
        {kind === 'broadcast' && [0, 1, 2].map((i) => reduced
          ? <circle key={i} cx="345" cy="100" r={40 + 40 * i} fill="none" stroke="var(--amber)" strokeWidth="1" opacity={0.5 - 0.15 * i} />
          : <circle key={i} cx="345" cy="100" r="4" fill="none" stroke="var(--amber)" strokeWidth="1.5" className="ev-ring" style={{ animationDelay: `${i * 0.9}s` }} />
        )}
        {kind === 'broadcast' && [0, 1, 2, 3, 4].map((i) => (
          <circle key={`relay${i}`} cx={380 + 14 * i} cy={100 - 16 * i} r="3" fill="var(--amber)"
            className={reduced ? undefined : 'ev-relay'} style={reduced ? { opacity: 1 } : { animationDelay: `${1.2 + i * 0.5}s` }} />
        ))}
        {kind === 'stay' && (
          <>
            <line x1="-40" y1="130" x2="230" y2="130" stroke="var(--green)" strokeWidth="1" strokeDasharray="3 4" opacity="0.5" />
            <g className={reduced ? undefined : 'ev-approach'}>
              <circle cx="232" cy="130" r="4" fill="var(--green)" />
            </g>
            <g className={reduced ? undefined : 'ev-clamp'} style={reduced ? { opacity: 1 } : { animationDelay: '1.9s' }}>
              <rect x="224" y="118" width="16" height="4" rx="1" fill="var(--brass)" stroke="var(--brass-lo)" />
              <rect x="224" y="138" width="16" height="4" rx="1" fill="var(--brass)" stroke="var(--brass-lo)" />
            </g>
          </>
        )}
      </g>
    </svg>
  );
}
```

- [ ] **Step 4: The FLIGHT RECORD**

Append to `src/styles/theme.css`:

```css
/* Flight record */
.plate.record { display: block; max-width: 640px; }
.plate.record .rows { display: grid; gap: 4px; font-size: 12px; }
.plate.record .r { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.plate.record .k { color: var(--dim); letter-spacing: 0.15em; font-size: 10px; min-width: 72px; }
.plate.record .v { color: var(--text); }
.plate.record .lamps { gap: 14px; }
.plate.record .lamp { display: inline-flex; align-items: center; gap: 4px; letter-spacing: 0.1em; }
.plate.record input { font: inherit; font-size: 11px; background: var(--face-deep); color: var(--text); border: 1px solid var(--line); padding: 4px 6px; width: 100%; }
```

Create `src/ui/FlightRecord.tsx`:

```tsx
import { useState } from 'react';
import { useGame } from './useGame';
import { useMeta } from './useMeta';
import { useStrings } from './useLocale';
import { encodeShipCode, shipLink } from '../game/shipcode';
import type { EndingId } from '../game/types';

function RecordLamp({ lit, label }: { lit: boolean; label: string }) {
  return (
    <span className={`lamp ${lit ? 'status-ok' : 'status-dim'}`}>
      <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
        <circle cx="6" cy="6" r="4.5" fill={lit ? 'var(--green)' : 'var(--steel-lo)'} stroke="var(--steel)" strokeWidth="1.2" />
      </svg>
      {label}
    </span>
  );
}

// The ledger: this run, this device's memory, and the four ending lamps — the
// fourth engraved "—" until STAY has been seen. Compact on the title screen.
export function FlightRecord({ compact = false }: { compact?: boolean }) {
  const seed = useGame((s) => s.seed);
  const ngPlus = useGame((s) => s.ngPlus);
  const toolCalls = useGame((s) => s.toolCalls);
  const waves = useGame((s) => s.chapter3.wavesEndured);
  const ending = useGame((s) => s.ending);
  const proof = useGame((s) => s.chapter2.sampleAnalyzed);
  const beacon = useGame((s) => s.chapter3.beaconHeard);
  const contained = useGame((s) => s.killswitch === 'contained');
  const won = useGame((s) => s.won);
  const meta = useMeta((m) => m);
  const t = useStrings();
  const [copied, setCopied] = useState<'idle' | 'copied' | 'manual'>('idle');
  const code = encodeShipCode(seed, ngPlus);
  const link = shipLink(window.location.origin, seed, ngPlus);
  const seen = (e: EndingId) => meta.endingsSeen.includes(e) || (won && ending === e);
  const leaveSeen = seen('leave_unknowing') || seen('leave_knowing');
  const staySeen = seen('stay');
  // A finished run is already in the memory; an unfinished one is the next.
  const runNumber = won ? meta.runsCompleted : meta.runsCompleted + 1;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied('copied');
      window.setTimeout(() => setCopied('idle'), 1500);
    } catch {
      setCopied('manual');
    }
  };
  return (
    <div className="plate record" role="group" aria-label={t.record.title}>
      <div className="plate-engraved">{t.record.title}</div>
      <div className="rows">
        <div className="r">
          <span className="k">{t.record.hull}</span>
          <span className="v">{code}</span>
          <button onClick={copy} style={{ padding: '2px 8px', fontSize: 10 }} aria-label={t.record.linkAria(code)}>
            {copied === 'copied' ? t.record.copied : t.record.copyLink}
          </button>
        </div>
        {copied === 'manual' && <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} aria-label={t.record.linkAria(code)} />}
        <div className="r"><span className="k">{t.record.run}</span><span className="v">{runNumber}</span></div>
        {!compact && (
          <>
            <div className="r"><span className="k">{t.record.profile}</span><span className="v">{ngPlus ? t.record.plus : t.record.classic}</span></div>
            <div className="r">
              <span className="k">{t.record.calls}</span>
              <span className="v">{toolCalls}{meta.bestToolCalls !== null && ` · ${t.record.best} ${meta.bestToolCalls}`}</span>
            </div>
            <div className="r"><span className="k">{t.record.waves}</span><span className="v">{waves}</span></div>
            <div className="r lamps">
              <RecordLamp lit={proof} label={t.record.proof} />
              <RecordLamp lit={beacon} label={t.record.beacon} />
              <RecordLamp lit={contained} label={t.record.contained} />
            </div>
          </>
        )}
        <div className="r lamps" aria-label={t.record.endings}>
          <RecordLamp lit={leaveSeen} label={t.record.leave} />
          <RecordLamp lit={seen('restore')} label={t.record.restore} />
          <RecordLamp lit={seen('broadcast')} label={t.record.broadcast} />
          <RecordLamp lit={staySeen} label={staySeen ? t.record.stay : t.record.unknown} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Epilogue and title layout**

In `src/scenes/Epilogue.tsx`, add imports `import { EndingVignette } from './EndingVignette';` and `import { FlightRecord } from '../ui/FlightRecord';`, add `const seed = useGame((s) => s.seed);` beside the other selectors, and change the returned JSX to:

```tsx
  return (
    <div className="scene" style={{ marginTop: '6vh', textAlign: 'center' }}>
      <h1 style={{ letterSpacing: '0.4em', color: ending === 'broadcast' ? 'var(--amber)' : 'var(--green)' }}>{title}</h1>
      <EndingVignette ending={ending} seed={seed} beaconHeard={beacon} />
      <div className="panel" style={{ textAlign: 'left' }}>
        <p>{outro}</p>
        {leaving && proof && <p className="status-dim">{t.epilogue.withProof}</p>}
        {leaving && beacon && <p className="status-dim">{t.epilogue.withBeacon}</p>}
        {contained && ending !== 'stay' && <p className="status-dim">{t.epilogue.contained}</p>}
        {waves > 0 && <p className="status-dim">{t.epilogue.waves(waves)}</p>}
        <p className="status-dim">{stats}</p>
        {ngPlus && <p className="status-dim">{t.epilogue.runNumber(runs)}</p>}
      </div>
      <FlightRecord />
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => resetGame()}>{t.epilogue.wakeAgain}</button>
        {runs >= 1 && (
          <button onClick={() => resetGame(undefined, { ngPlus: true })} style={{ borderColor: 'var(--amber)' }}>{t.epilogue.wakeAgainPlus}</button>
        )}
      </div>
    </div>
  );
```

In `src/App.tsx`, add `import { FlightRecord } from './ui/FlightRecord';` and, in the title-screen JSX directly after the `{invite && <InvitePlate … />}` line, add:

```tsx
        {(hasSave || runs > 0) && <div><FlightRecord compact /></div>}
```

- [ ] **Step 6: Gate and commit**

Run: `npx vitest run && npm run build`
Expected: both exit 0; 308 tests; palette test green with the new `src/ui` files.

```bash
git add src/scenes/EndingVignette.tsx src/ui/FlightRecord.tsx src/ui/DeckMap.tsx src/scenes/Epilogue.tsx src/ui/strings.ts src/styles/theme.css src/App.tsx
git commit -m "feat: ending vignettes and the FLIGHT RECORD — an ending is a picture and a ledger

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01MUJfbE723MBfr34oDFgZJ9"
```

---

### Task 6: Docs, preview, playthrough, merge

- [ ] **Step 1: README**

In `README.md`:

- In "How to play", after the paragraph that starts "Chapter 2 opens from the bridge", add:

  > Every ship has a **hull number** — `CMR-` and the seed in base 36, `CMR-4X+` for New Game+ — on the title screen and the FLIGHT RECORD at the end. **COPY LINK** gives a `?ship=` URL; whoever opens it wakes on the same ship, and the record's four ending lamps show what this device's crew has seen. The **SOUND** toggle in the header mutes the ship.

- In "How WebMCP is used", replace "new tools visibly light up on the in-game **AI LINK** panel" with "new tools visibly light up on the in-game **AUX LINK** console — one lamp per tool, grouped by data bus, with a ticker of the agent's last calls (tool, input and OK/REFUSED, never the ship's reply) — and during a kill-switch wave the human watches the lamps on unshielded buses go red".
- Update the test count in "Local development" to the real total printed by `npx vitest run`.
- Append to the spec: `**Shipped <date>** — <tests> tests; the Immersion Pass is live (AUX LINK console, diegetic mixer, cold open + bulkheads, ending vignettes + FLIGHT RECORD, ship codes).`

Commit:

```bash
git add README.md docs/superpowers/specs/2026-09-01-derelict-immersion-pass-design.md
git commit -m "docs: README for the Immersion Pass; spec shipped note

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01MUJfbE723MBfr34oDFgZJ9"
```

- [ ] **Step 2: Preview and the walkthrough**

Push `directors-cut`, deploy a preview (`npx vercel --yes`), and hand Mario this script:

1. **Title:** open the preview with `?ship=CMR-4X` — the plate `HULL CMR-4X RECEIVED`, `Wake on CMR-4X`; open it plain — no plate; with a previous run on the device the compact FLIGHT RECORD shows the ending lamps and the dark fourth lamp.
2. **Thaw:** WAKE UP — the pod plate, the ECG drawing, the temperature climbing, the frost clearing, the bulletin printing, `POD OPEN`, the door sound, the cryo bay. Press Esc mid-way on a second try to confirm the skip. Reload in the pod: it plays again (fresh run).
3. **Console:** from the pod, ask the agent for the bulletin — the ticker prints `read_emergency_bulletin ● OK`, the relay click sounds. Give a wrong door code on purpose — `● REFUSED` in amber. Restore aux power — `LINK +access_crew_manifest +unlock_door … ● ONLINE`. Fold and unfold; reload — the fold is remembered.
4. **Sound:** walk cryo → engineering → bridge: the compressor gives way to the turbine, the turbine rises when the agent routes engine power, the bridge is near silent. Every crossing cycles the bulkhead. SOUND ○ silences everything, cues included; reload — still muted.
5. **Chapter 3:** in the reactor room, the pulse quickens at the warning, the ambience closes and shakes during the wave, and on the console the NAV/CORE/COMMS lamps go red and blink; cut NAV — the row gets its `SHIELDED` tag and its lamps stay green through the next wave. At the comms array, move the dish while listening: the static must not change.
6. **Epilogue:** finish on any ending — the vignette animates, the FLIGHT RECORD lists HULL / RUN / PROFILE / CALLS · BEST / WAVES / lamps; COPY LINK → `COPIED`, paste the link in a new tab → the invite plate. With `prefers-reduced-motion` on (macOS: Reduce motion), the thaw shows CONTINUE, rooms swap without doors, and the vignette sits at its final frame.

- [ ] **Step 3: Merge and deploy after "aprovado"**

```bash
git checkout main && git merge directors-cut --no-edit && npx vitest run && npm run build && git push origin main && npx vercel --prod --yes
git checkout directors-cut && git merge main && git push origin directors-cut
```

- [ ] **Step 4: Memory**

Update the project memory (`derelict-webmcp-challenge.md`): Plan G shipped — the Immersion Pass (AUX LINK console with `linkStore`/`prefsStore` beside the game store, `mixFor`/`startMixer`, cold open + `Bulkhead`, `EndingVignette` + `FlightRecord`, `CMR-` ship codes on `?ship=`); test count; nothing queued; the parked ideas from the Sep 1 analysis (Ninety-Four Seconds, the EVA, the journal, hull sensors, the fragment's terminal, a medbay puzzle, `adjust_atmosphere`).
