import { describe, expect, it } from 'vitest';
import { COLD_OPEN_DONE_MS, coldOpenSchedule, crystalPoints, frostCrystals, isFreshRun, thawTemp } from './thaw';
import { gameStore, initialState, removeGrate, resetGame } from '../game/store';
import { buildTools } from '../mcp/tools';

describe('isFreshRun', () => {
  it('is true on a fresh ship, classic or plus, and false once anything has happened', async () => {
    expect(isFreshRun(initialState(0))).toBe(true);
    expect(isFreshRun(initialState(177, true))).toBe(true);
    resetGame(0);
    removeGrate();
    expect(isFreshRun(gameStore.getState())).toBe(false);
    resetGame(0);
    await buildTools().find((t) => t.name === 'get_ship_status')!.definition.execute({});
    expect(isFreshRun(gameStore.getState())).toBe(false);
    expect(isFreshRun({ ...initialState(0), checkpoint: { chapter: 1, room: 'bridge' } })).toBe(false);
    expect(isFreshRun({ ...initialState(0), won: true })).toBe(false);
    expect(isFreshRun({ ...initialState(0), room: 'medbay' })).toBe(false);
  });
});

describe('the thaw', () => {
  it('runs four steps in order and ends after seven seconds', () => {
    const steps = coldOpenSchedule();
    expect(steps.map((s) => s.id)).toEqual(['vitals', 'frost', 'bulletin', 'open']);
    for (let i = 1; i < steps.length; i++) expect(steps[i].at).toBeGreaterThan(steps[i - 1].at);
    expect(steps[steps.length - 1].at).toBeLessThan(COLD_OPEN_DONE_MS);
    expect(COLD_OPEN_DONE_MS).toBe(7000);
  });

  it('freezes the same ship the same way, and a different ship differently', () => {
    expect(frostCrystals(7)).toEqual(frostCrystals(7));
    expect(frostCrystals(7)).not.toEqual(frostCrystals(8));
    expect(frostCrystals(7)).toHaveLength(36);
    expect(crystalPoints(frostCrystals(7)[0]).split(' ')).toHaveLength(12);
  });

  it('thaws from 31.2 to 36.4', () => {
    expect(thawTemp(0)).toBe(31.2);
    expect(thawTemp(0.5)).toBe(33.8);
    expect(thawTemp(1)).toBe(36.4);
    expect(thawTemp(2)).toBe(36.4);
  });
});
