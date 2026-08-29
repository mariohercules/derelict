import { beforeEach, describe, expect, it } from 'vitest';
import { ROOMS, ROOM_IDS, roomStatus } from './rooms';
import { gameStore, resetGame } from './store';

beforeEach(() => resetGame(0));

describe('room graph', () => {
  it('has ten compartments, three of them in chapter 1', () => {
    expect(ROOM_IDS).toHaveLength(10);
    expect(ROOMS.filter((r) => r.chapter === 1).map((r) => r.id).sort()).toEqual(['bridge', 'cryo_bay', 'engineering']);
  });

  it('reports the current room, open, locked, and sealed statuses', () => {
    const s = gameStore.getState();
    expect(roomStatus(s, 'cryo_bay')).toBe('current');
    expect(roomStatus(s, 'engineering')).toBe('locked');
    expect(roomStatus(s, 'medbay')).toBe('sealed');
    gameStore.setState({ doors: { cryo_exit: true, engineering_exit: false } });
    expect(roomStatus(gameStore.getState(), 'engineering')).toBe('open');
    expect(roomStatus(gameStore.getState(), 'bridge')).toBe('locked');
  });
});
