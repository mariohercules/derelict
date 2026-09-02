import { describe, expect, it } from 'vitest';
import { mixFor } from './mixer';
import { initialState } from '../game/store';
import type { GameState } from '../game/types';

const base = (patch: Partial<GameState> = {}): GameState => ({ ...initialState(0), ...patch });
const ch3 = (patch: Partial<GameState['chapter3']>) => ({ ...initialState(0).chapter3, ...patch });

describe('mixFor — the ship sounds like its state', () => {
  it('the hum follows aux power and the reactor load; the engines lift its pitch', () => {
    expect(mixFor(base()).hum).toEqual({ freq: 55, gain: 0.004 });
    expect(mixFor(base({ auxPower: true })).hum.gain).toBeCloseTo(0.012 + 0.0004 * 40, 6);
    const online = mixFor(base({
      auxPower: true, fuseInstalled: '10A', valveSettings: [6, 3, 7],
      powerAllocation: { life_support: 15, medbay: 0, comms: 0, doors: 5, engines: 20, isolation: 0 },
    }));
    expect(online.hum.freq).toBe(58);
    expect(online.engineDrive).toBe(1);
  });

  it('engine drive rises with power before the engines are online', () => {
    const half = mixFor(base({ powerAllocation: { life_support: 25, medbay: 5, comms: 0, doors: 0, engines: 10, isolation: 0 } }));
    expect(half.engineDrive).toBeCloseTo(0.5);
  });

  it('the wave closes the filter and shakes the bed; containment slows the reactor; a won game is still', () => {
    expect(mixFor(base({ killswitch: 'active', chapter3: ch3({ wave: 'calm' }) }))).toMatchObject({ lowpassHz: 12000, tremoloHz: 0, reactorPulseHz: 0.8 });
    expect(mixFor(base({ killswitch: 'active', chapter3: ch3({ wave: 'warning' }) }))).toMatchObject({ lowpassHz: 2400, tremoloHz: 0, reactorPulseHz: 1.6 });
    expect(mixFor(base({ killswitch: 'active', chapter3: ch3({ wave: 'active' }) }))).toMatchObject({ lowpassHz: 400, tremoloHz: 6, reactorPulseHz: 2.4 });
    expect(mixFor(base({ killswitch: 'contained' })).reactorPulseHz).toBe(0.6);
    expect(mixFor(base({ won: true, killswitch: 'active', chapter3: ch3({ wave: 'active' }) }))).toMatchObject({ bed: 0, lowpassHz: 12000, tremoloHz: 0, ritualTick: false });
    expect(mixFor(base({ chapter3: ch3({ kernelSeated: true }) })).vaultCharged).toBe(true);
  });

  it('ticks only while a ritual is armed', () => {
    expect(mixFor(base()).ritualTick).toBe(false);
    // the clock is inside the window (the deadline itself still counts)
    expect(mixFor(base({ ritual: { active: 'launch', phase: 'armed', endsAt: 1, held: false } }), 1).ritualTick).toBe(true);
    expect(mixFor(base({ ritual: { active: 'launch', phase: 'done', endsAt: 1, held: false } })).ritualTick).toBe(false);
    const armed = { active: 'launch' as const, phase: 'armed' as const, endsAt: 100_000, held: false };
    expect(mixFor(base({ ritual: armed }), 99_000).ritualTick).toBe(true);   // window open
    expect(mixFor(base({ ritual: armed }), 100_001).ritualTick).toBe(false); // window lapsed, phase still 'armed'
    expect(mixFor(base({ ritual: armed, won: true }), 99_000).ritualTick).toBe(false); // a finished game never ticks
    expect(mixFor(base({ ritual: { ...armed, endsAt: null } }), 99_000).ritualTick).toBe(true); // no deadline recorded → armed is armed
  });

  it('the comms array never sounds different for where the dish points or whether the beacon was heard', () => {
    const at = (az: number, el: number, beaconHeard: boolean) =>
      mixFor(base({ room: 'comms_array', chapter: 3, chapter3: ch3({ dish: { az, el }, beaconHeard }) }));
    const reference = at(0, 0, false);
    for (const [az, el] of [[217, 34], [90, 10], [359, 89], [180, 45]]) {
      expect(at(az, el, false)).toEqual(reference);
      expect(at(az, el, true)).toEqual(reference);
    }
  });
});
