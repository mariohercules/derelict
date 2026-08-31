import { describe, expect, it } from 'vitest';
import { beaconSignalFor } from './derived';
import { secretsFor } from './secrets';

describe('beaconSignalFor — the agent as the meter', () => {
  const target = secretsFor(0).beaconBearing; // classic ship: AZ 217 / EL 34

  it('reads full strength on the bearing and nothing 180 degrees away', () => {
    expect(beaconSignalFor(0, { az: target.az, el: target.el }).strength).toBe(100);
    expect(beaconSignalFor(0, { az: target.az - 180, el: target.el }).strength).toBe(0);
  });

  it('is strictly stronger when strictly closer along one axis', () => {
    const far = beaconSignalFor(0, { az: target.az, el: target.el + 30 }).strength;
    const near = beaconSignalFor(0, { az: target.az, el: target.el + 10 }).strength;
    const lock = beaconSignalFor(0, { az: target.az, el: target.el + 3 }).strength;
    expect(near).toBeGreaterThan(far);
    expect(lock).toBeGreaterThan(near);
    expect(lock).toBeGreaterThanOrEqual(98);
  });

  it('names the axis whose error dominates by more than the lock tolerance', () => {
    expect(beaconSignalFor(0, { az: target.az + 20, el: target.el }).axis).toBe('az');
    expect(beaconSignalFor(0, { az: target.az, el: target.el + 20 }).axis).toBe('el');
    expect(beaconSignalFor(0, { az: target.az + 5, el: target.el + 5 }).axis).toBe('both');
    expect(beaconSignalFor(0, { az: target.az + 12, el: target.el + 10 }).axis).toBe('both');
  });

  it('is pure and deterministic for a seeded ship', () => {
    const t = secretsFor(4).beaconBearing;
    expect(beaconSignalFor(4, { az: t.az, el: t.el })).toEqual({ strength: 100, axis: 'both' });
    expect(beaconSignalFor(4, { az: 0, el: 0 })).toEqual(beaconSignalFor(4, { az: 0, el: 0 }));
  });
});
