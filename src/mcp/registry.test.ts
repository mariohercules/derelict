import { beforeEach, describe, expect, it } from 'vitest';
import { createStore } from 'zustand/vanilla';
import type { StoreApi } from 'zustand/vanilla';
import { createToolRegistry } from './registry';
import type { GameTool, ModelContextLike, ToolDefinition } from './registry';
import { initialState } from '../game/store';
import type { GameState } from '../game/types';

function fakeMc() {
  const registered = new Map<string, { def: ToolDefinition; aborted: boolean }>();
  const mc: ModelContextLike = {
    registerTool(def, opts) {
      const entry = { def, aborted: false };
      registered.set(def.name, entry);
      opts?.signal?.addEventListener('abort', () => {
        entry.aborted = true;
        registered.delete(def.name);
      });
      return Promise.resolve();
    },
  };
  return { mc, registered };
}

function tool(name: string, availableWhen: (s: GameState) => boolean): GameTool {
  return {
    name,
    availableWhen,
    definition: {
      name,
      description: 'test tool',
      inputSchema: { type: 'object', properties: {}, required: [] },
      async execute() {
        return { content: [{ type: 'text', text: 'ok' }] };
      },
    },
  };
}

describe('createToolRegistry', () => {
  let store: StoreApi<GameState>;

  beforeEach(() => {
    store = createStore<GameState>(() => initialState());
  });

  it('registers available tools immediately and skips unavailable ones', () => {
    const { mc, registered } = fakeMc();
    const reg = createToolRegistry(mc, [tool('always', () => true), tool('gated', (s) => s.auxPower)], store);
    expect([...registered.keys()]).toEqual(['always']);
    expect(reg.activeToolNames()).toEqual(['always']);
  });

  it('registers a tool when its condition becomes true, revokes when false', async () => {
    const { mc, registered } = fakeMc();
    createToolRegistry(mc, [tool('gated', (s) => s.auxPower)], store);
    store.setState({ auxPower: true });
    expect(registered.has('gated')).toBe(true);
    store.setState({ auxPower: false });
    // Revocation is deferred one macrotask so a tool that revokes itself
    // mid-execute (confirm_launch) still delivers its result to the host.
    expect(registered.has('gated')).toBe(true);
    await new Promise((r) => setTimeout(r, 0));
    expect(registered.has('gated')).toBe(false);
  });

  it('does not re-register an already-active tool on unrelated state changes', () => {
    const { mc } = fakeMc();
    let registrations = 0;
    const counting: ModelContextLike = {
      registerTool(def, opts) {
        registrations++;
        return mc.registerTool(def, opts);
      },
    };
    createToolRegistry(counting, [tool('always', () => true)], store);
    store.setState({ toolCalls: 5 });
    store.setState({ toolCalls: 6 });
    expect(registrations).toBe(1);
  });

  it('dispose revokes everything and stops observing', () => {
    const { mc, registered } = fakeMc();
    const reg = createToolRegistry(mc, [tool('always', () => true)], store);
    reg.dispose();
    expect(registered.size).toBe(0);
    store.setState({ auxPower: true });
    expect(registered.size).toBe(0);
  });

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
});
