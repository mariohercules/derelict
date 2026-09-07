import { prefsStore } from '../game/prefs';

// The player's preference can reduce movement further than the OS default.
export function reducedMotion(): boolean {
  return prefsStore.getState().effectsReduced === true
    || (typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}
