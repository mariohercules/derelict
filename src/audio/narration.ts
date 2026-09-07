import { createStore } from 'zustand/vanilla';

export const narrationStore = createStore(() => ({ active: false }));
const speakers = new Set<symbol>();

// A lease prevents an old player's cleanup from unducking a newer recording.
export function holdNarration(): () => void {
  const id = Symbol();
  speakers.add(id);
  narrationStore.setState({ active: true });
  return () => {
    if (!speakers.delete(id)) return;
    narrationStore.setState({ active: speakers.size > 0 });
  };
}
