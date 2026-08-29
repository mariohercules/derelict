import { beforeEach, describe, expect, it } from 'vitest';
import { EDGES, ROOMS, ROOM_IDS, edgeBetween, roomStatus } from './rooms';
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

describe('adjacency', () => {
  it('rooms connect only along corridors', () => {
    expect(edgeBetween('cryo_bay', 'engineering')?.door).toBe('cryo_exit');
    expect(edgeBetween('engineering', 'bridge')?.door).toBe('engineering_exit');
    expect(edgeBetween('cryo_bay', 'bridge')).toBeUndefined();
    expect(EDGES.length).toBe(10);
  });

  it('an open door to a non-adjacent room does not make it reachable', () => {
    gameStore.setState({ doors: { cryo_exit: true, engineering_exit: true } });
    // from cryo bay, the bridge is two corridors away
    expect(roomStatus(gameStore.getState(), 'bridge')).toBe('locked');
    gameStore.setState({ room: 'engineering' });
    expect(roomStatus(gameStore.getState(), 'bridge')).toBe('open');
  });

  it('chapter-2 corridors open without doors once the chapter is reached', () => {
    gameStore.setState({ chapter: 2 });
    expect(roomStatus(gameStore.getState(), 'medbay')).toBe('open');
    expect(roomStatus(gameStore.getState(), 'crew_quarters')).toBe('locked'); // not adjacent to cryo bay
  });
});
