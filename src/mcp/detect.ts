import type { ModelContextLike } from './registry';

export function detectModelContext(): ModelContextLike | null {
  const mc = (document as unknown as { modelContext?: ModelContextLike }).modelContext;
  return mc && typeof mc.registerTool === 'function' ? mc : null;
}
