import { useStore } from 'zustand';
import { linkStore } from '../game/link';
import type { LinkEvent } from '../game/link';

export function useLink(): LinkEvent[] {
  return useStore(linkStore, (s) => s.events);
}
