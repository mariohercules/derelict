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

export function createToolRegistry(
  mc: ModelContextLike,
  tools: GameTool[],
  store: StoreApi<GameState>
): { activeToolNames(): string[]; dispose(): void } {
  const active = new Map<string, AbortController>();

  function sync(): void {
    const s = store.getState();
    for (const t of tools) {
      const shouldBeOn = t.availableWhen(s);
      const isOn = active.has(t.name);
      if (shouldBeOn && !isOn) {
        const controller = new AbortController();
        active.set(t.name, controller);
        void Promise.resolve(mc.registerTool(t.definition, { signal: controller.signal })).catch((e) =>
          console.error(`registerTool(${t.name}) failed`, e)
        );
      } else if (!shouldBeOn && isOn) {
        active.get(t.name)!.abort();
        active.delete(t.name);
      }
    }
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
