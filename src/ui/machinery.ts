import type { BusId, GameState } from '../game/types';
import { enginesOnline } from '../game/derived';

export function threatPhase(s: GameState) {
  if (s.killswitch === 'contained') return 'contained';
  if (s.won) return 'calm';
  return s.killswitch === 'active' ? s.chapter3.wave : 'stirring';
}

// These lamps describe writable commands. Sensors and immune tools remain
// reachable during a wave; the reactor itself never loses physical power.
export function busSignal(s: GameState, bus: BusId) {
  if (s.chapter3.shielded.includes(bus)) return 'shielded';
  return threatPhase(s) === 'active' ? 'suppressed' : 'exposed';
}

// The physical accents of the two machinery decks. Wave onset, recovery and
// containment are the presentation director's, across every room.
export type MachineryCue = 'fuse' | 'gear' | 'valve' | 'dial' | 'route' | 'engine' | 'isolate' | 'quarantine';

// A single material accent per transition. No partial-correctness feedback:
// every cartridge, gear and dial position sounds alike, until enginesOnline
// announces the same completed state already visible in the ship's HUD.
export function machineryCue(s: GameState, before: GameState): MachineryCue | null {
  if (s.seed !== before.seed || s.room !== before.room || s.won || !s.auxPower || !before.auxPower) return null;
  if (s.room !== 'engineering' && s.room !== 'reactor_room') return null;
  if (s.chapter3.shielded.length > before.chapter3.shielded.length) return 'isolate';
  if (s.chapter3.quarantineStep > before.chapter3.quarantineStep) return 'quarantine';
  if (s.room === 'engineering') {
    if (enginesOnline(s) && !enginesOnline(before)) return 'engine';
    if (s.fuseInstalled !== before.fuseInstalled) return 'fuse';
    if (s.chapter1v.gear !== before.chapter1v.gear) return 'gear';
    if (s.valveSettings.some((v, i) => v !== before.valveSettings[i])) return 'valve';
    if (s.chapter1v.phases.some((v, i) => v !== before.chapter1v.phases[i])) return 'dial';
  }
  if (Object.keys(s.powerAllocation).some((key) => {
    const id = key as keyof GameState['powerAllocation'];
    return s.powerAllocation[id] !== before.powerAllocation[id];
  })) return 'route';
  return null;
}
