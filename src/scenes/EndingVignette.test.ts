import { describe, expect, it } from 'vitest';
import { RESTORE_ORDER } from './EndingVignette';
import { ROOMS } from '../game/rooms';

describe('RESTORE lights every room, the bridge last', () => {
  it('is a permutation of the deck', () => {
    expect([...RESTORE_ORDER].sort()).toEqual(ROOMS.map((r) => r.id).sort());
  });
  it('ends on the bridge', () => {
    expect(RESTORE_ORDER[RESTORE_ORDER.length - 1]).toBe('bridge');
  });
});
