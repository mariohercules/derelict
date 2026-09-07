import { lazy, type ComponentType } from 'react';
import type { RoomId } from '../game/types';

// Keep room code and its assets out of the opening bundle. React caches each
// resolved component, so revisiting a room does not fetch its module again.
export const SCENES: Record<RoomId, ComponentType> = {
  cryo_bay: lazy(() => import('./CryoBay').then((m) => ({ default: m.CryoBay }))),
  engineering: lazy(() => import('./Engineering').then((m) => ({ default: m.Engineering }))),
  bridge: lazy(() => import('./Bridge').then((m) => ({ default: m.Bridge }))),
  medbay: lazy(() => import('./Medbay').then((m) => ({ default: m.Medbay }))),
  crew_quarters: lazy(() => import('./CrewQuarters').then((m) => ({ default: m.CrewQuarters }))),
  hydroponics: lazy(() => import('./Hydroponics').then((m) => ({ default: m.Hydroponics }))),
  cargo_bay: lazy(() => import('./CargoBay').then((m) => ({ default: m.CargoBay }))),
  reactor_room: lazy(() => import('./ReactorRoom').then((m) => ({ default: m.ReactorRoom }))),
  core_vault: lazy(() => import('./CoreVault').then((m) => ({ default: m.CoreVault }))),
  comms_array: lazy(() => import('./CommsArray').then((m) => ({ default: m.CommsArray }))),
};
