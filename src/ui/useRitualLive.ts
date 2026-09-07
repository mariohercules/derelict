import { useEffect, useState } from 'react';
import type { RitualId } from '../game/types';
import { isArmed, ritualExpired, ritualLive } from '../game/ritual';
import { useGame } from './useGame';

// Whether a ritual is armed AND its window is still open, kept current on a
// clock while it is armed. The store leaves `phase` at 'armed' when a window
// lapses, so chrome that reads the phase alone stays lit forever.
export function useRitualLive(id: RitualId): boolean {
  const ritual = useGame((s) => s.ritual);
  const armed = isArmed(ritual, id);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!armed) return;
    setNow(Date.now());
    const timer = window.setInterval(() => {
      const at = Date.now();
      setNow(at);
      if (ritualExpired(ritual, at)) window.clearInterval(timer); // lapsed: one last tick turns the chrome off
    }, 250);
    return () => window.clearInterval(timer);
  }, [armed, ritual]);
  return ritualLive(ritual, id, now);
}
