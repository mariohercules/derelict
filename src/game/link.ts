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
