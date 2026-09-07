import { createStore, type StoreApi } from 'zustand/vanilla';
import type { GameState } from '../game/types';
import { prefsStore } from '../game/prefs';
import { narrationStore } from '../audio/narration';
import { direct, EMPTY_DIRECTOR, IDLE_DIRECTION, nextDirectionAt, type DirectorCue } from './director';

export const directionStore = createStore(() => IDLE_DIRECTION);

export function startDirector(game: StoreApi<GameState>, onCue: (cue: DirectorCue) => void = () => {}): () => void {
  let memory = { ...EMPTY_DIRECTOR };
  let previous = game.getState();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const update = () => {
    clearTimeout(timer);
    const state = game.getState();
    const now = Date.now();
    const result = direct(memory, state, previous, now, narrationStore.getState().active, prefsStore.getState().effectsReduced === true);
    memory = result.memory;
    previous = state;
    const current = directionStore.getState();
    if (Object.keys(current).some(key => current[key as keyof typeof current] !== result.direction[key as keyof typeof current])) {
      directionStore.setState(result.direction, true);
    }
    if (result.cue) onCue(result.cue);
    const next = nextDirectionAt(memory, state, now);
    if (next !== null) timer = setTimeout(update, next - now);
  };
  update();
  const stops = [game.subscribe(update), narrationStore.subscribe(update), prefsStore.subscribe(update)];
  return () => {
    stops.forEach(stop => stop());
    clearTimeout(timer);
    directionStore.setState(IDLE_DIRECTION, true);
  };
}
