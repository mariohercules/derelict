import { useStore } from 'zustand';
import { prefsStore } from '../game/prefs';
import type { Prefs } from '../game/prefs';

export function usePrefs<T>(selector: (p: Prefs) => T): T {
  return useStore(prefsStore, selector);
}
