import { useStore } from 'zustand';
import { gameStore } from '../game/store';
import type { GameState } from '../game/types';

export function useGame<T>(selector: (s: GameState) => T): T {
  return useStore(gameStore, selector);
}
