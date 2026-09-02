import { useEffect, useRef, useState } from 'react';
import type { RoomId } from '../game/types';
import { SCENES } from '../scenes/registry';
import { useStrings } from './useLocale';
import { reducedMotion } from './motion';
import { playBulkhead } from '../audio/sound';

const CLOSE_MS = 180;
const OPEN_MS = 220;

// Renders the scene of the room the crew is in, and cycles a bulkhead when
// that room changes: leaves close over the old scene, the scene swaps, the
// leaves open. Never on mount or resume; instant and silent under reduced motion.
export function Bulkhead({ room }: { room: RoomId }) {
  const [shown, setShown] = useState(room);
  const [phase, setPhase] = useState<'idle' | 'closing' | 'opening'>('idle');
  const timers = useRef<number[]>([]);
  const t = useStrings();

  useEffect(() => {
    if (room === shown) return;
    if (reducedMotion()) {
      setShown(room);
      return;
    }
    setPhase('closing');
    playBulkhead();
    timers.current.push(window.setTimeout(() => { setShown(room); setPhase('opening'); }, CLOSE_MS));
    timers.current.push(window.setTimeout(() => setPhase('idle'), CLOSE_MS + OPEN_MS));
    return () => {
      timers.current.forEach((id) => window.clearTimeout(id));
      timers.current = [];
    };
    // shown is the transition's own state; the effect keys on the destination only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  const Scene = SCENES[shown];
  return (
    <>
      <Scene />
      <div className={`bulkhead ${phase}`} aria-hidden="true">
        <div className="leaf left" />
        <div className="leaf right" />
        <div className="plate-engraved doorplate">{t.hud.rooms[room].toUpperCase()}</div>
      </div>
    </>
  );
}
