import type { StoreApi } from 'zustand/vanilla';
import type { GameState } from '../game/types';

export interface ToolResult {
  content: { type: 'text'; text: string }[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: object;
  annotations?: { readOnlyHint?: boolean };
  execute(input: unknown): Promise<ToolResult>;
}

export interface GameTool {
  name: string;
  availableWhen(s: GameState): boolean;
  definition: ToolDefinition;
}

export interface ModelContextLike {
  registerTool(def: ToolDefinition, opts?: { signal?: AbortSignal }): unknown;
}

export interface LinkChange {
  online: string[];
  offline: string[];
}

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

  sync();
  const unsubscribe = store.subscribe(sync);

  return {
    activeToolNames: () => [...active.keys()],
    dispose() {
      unsubscribe();
      for (const controller of active.values()) controller.abort();
      active.clear();
    },
  };
}
