// The two-operator rule as a reusable ritual: the agent arms a sequence with a
// tool, the human holds a physical control, and the agent confirms while the
// hold is live and the window is open. One ritual can be armed at a time.
import type { ActionResult, RitualId, RitualState } from './types';
import { BROADCAST_WINDOW_MS, LAUNCH_WINDOW_MS, RESTORE_WINDOW_MS, STAY_WINDOW_MS } from './content';

export interface RitualDef {
  id: RitualId;
  tool: string; // the agent tool that confirms this ritual
  windowMs: number;
}

export const RITUALS: Record<RitualId, RitualDef> = {
  launch: { id: 'launch', tool: 'confirm_launch', windowMs: LAUNCH_WINDOW_MS },
  restore: { id: 'restore', tool: 'merge_fragment', windowMs: RESTORE_WINDOW_MS },
  broadcast: { id: 'broadcast', tool: 'broadcast_evidence', windowMs: BROADCAST_WINDOW_MS },
  stay: { id: 'stay', tool: 'dock_pod_one', windowMs: STAY_WINDOW_MS },
};

export const IDLE_RITUAL: RitualState = { active: null, phase: 'idle', endsAt: null, held: false };

export function isArmed(r: RitualState, id: RitualId): boolean {
  return r.active === id && r.phase === 'armed';
}

export function ritualExpired(r: RitualState, now: number): boolean {
  return r.phase === 'armed' && r.endsAt !== null && now > r.endsAt;
}

export function armRitual(r: RitualState, id: RitualId, now: number, windowMs: number = RITUALS[id].windowMs): { next: RitualState; result: ActionResult } {
  if (r.phase === 'done') {
    return { next: r, result: { ok: false, message: 'That sequence has already completed.' } };
  }
  if (r.phase === 'armed' && !ritualExpired(r, now)) {
    return { next: r, result: { ok: false, message: 'A two-operator sequence is already armed.' } };
  }
  const next: RitualState = { active: id, phase: 'armed', endsAt: now + windowMs, held: r.held };
  return { next, result: { ok: true, message: 'Sequence armed.' } };
}

export function confirmRitual(r: RitualState, id: RitualId, now: number): { next: RitualState; result: ActionResult } {
  if (!isArmed(r, id)) {
    return { next: r, result: { ok: false, message: 'No sequence is armed.' } };
  }
  if (ritualExpired(r, now)) {
    return {
      next: { ...IDLE_RITUAL, held: r.held },
      result: { ok: false, message: 'Window elapsed. Sequence reset. Take a breath and arm it again.' },
    };
  }
  if (!r.held) {
    return {
      next: r,
      result: { ok: false, message: 'Two-operator rule: confirm refused — the physical handle is not being held. Ask your human to grab it.' },
    };
  }
  return { next: { ...r, phase: 'done' }, result: { ok: true, message: 'Sequence complete.' } };
}
