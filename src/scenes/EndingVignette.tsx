import { ROOM_BY_ID } from '../game/rooms';
import { prng } from '../game/secrets';
import type { EndingId, RoomId } from '../game/types';
import { HULL_PATH } from '../ui/DeckMap';
import { reducedMotion } from '../ui/motion';
import { useStrings } from '../ui/useLocale';

// RESTORE: the lights come back from the core vault outward, deck by deck, the bridge last.
const RESTORE_ORDER: RoomId[] = ['core_vault', 'reactor_room', 'engineering', 'cargo_bay', 'comms_array', 'cryo_bay', 'medbay', 'crew_quarters', 'hydroponics', 'bridge'];

// The same ship shows the same sky.
function stars(seed: number, n = 46): { x: number; y: number; r: number }[] {
  const rnd = prng((seed ^ 0x57a25) >>> 0);
  return Array.from({ length: n }, () => ({ x: rnd() * 480, y: rnd() * 200, r: 0.4 + rnd() * 1.1 }));
}

// A 480×200 picture of the ending. The hull is the deck map's silhouette,
// drawn at translate(40 30); animations end where the reduced-motion frame sits.
export function EndingVignette({ ending, seed, beaconHeard }: { ending: EndingId | null; seed: number; beaconHeard: boolean }) {
  const t = useStrings();
  const reduced = reducedMotion();
  const kind = ending === 'restore' ? 'restore' : ending === 'broadcast' ? 'broadcast' : ending === 'stay' ? 'stay' : 'leave';
  const aria = kind === 'restore' ? t.record.ariaRestore : kind === 'broadcast' ? t.record.ariaBroadcast : kind === 'stay' ? t.record.ariaStay : t.record.ariaLeave;
  return (
    <svg viewBox="0 0 480 200" width="100%" style={{ maxWidth: 640, display: 'block', margin: '0 auto' }} role="img" aria-label={aria}>
      <defs>
        <linearGradient id="ev-hull" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--steel-lo)" />
          <stop offset="100%" stopColor="var(--hull)" />
        </linearGradient>
      </defs>
      <rect width="480" height="200" fill="var(--face-deep)" />
      {stars(seed).map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="var(--parchment)" opacity="0.7" />)}
      {kind === 'leave' && beaconHeard && <circle cx="12" cy="18" r="2.5" fill="var(--green)" className="beacon-halo" />}
      <g transform="translate(40 30)">
        <path d={HULL_PATH} fill="url(#ev-hull)" stroke="var(--steel)" strokeWidth="2" />
        {kind === 'restore' && RESTORE_ORDER.map((id, i) => {
          const r = ROOM_BY_ID[id];
          return (
            <rect key={id} x={r.x - 22} y={r.y - 10} width="44" height="20" rx="2" fill="var(--green)" stroke="var(--line)"
              className={reduced ? undefined : 'ev-room'} style={reduced ? { opacity: 1 } : { animationDelay: `${0.4 + i * 0.35}s` }} />
          );
        })}
        {kind === 'leave' && (
          <g className={reduced ? undefined : 'ev-drift'} style={reduced ? { transform: 'translateX(70px)' } : undefined}>
            <circle cx="360" cy="45" r="3" fill="var(--amber)" />
            <circle cx="355" cy="45" r="1.2" fill="var(--red)" className="blink" />
          </g>
        )}
        {kind === 'broadcast' && [0, 1, 2].map((i) => reduced
          ? <circle key={i} cx="345" cy="100" r={40 + 40 * i} fill="none" stroke="var(--amber)" strokeWidth="1" opacity={0.5 - 0.15 * i} />
          : <circle key={i} cx="345" cy="100" r="4" fill="none" stroke="var(--amber)" strokeWidth="1.5" className="ev-ring" style={{ animationDelay: `${i * 0.9}s` }} />
        )}
        {kind === 'broadcast' && [0, 1, 2, 3, 4].map((i) => (
          <circle key={`relay${i}`} cx={380 + 14 * i} cy={100 - 16 * i} r="3" fill="var(--amber)"
            className={reduced ? undefined : 'ev-relay'} style={reduced ? { opacity: 1 } : { animationDelay: `${1.2 + i * 0.5}s` }} />
        ))}
        {kind === 'stay' && (
          <>
            <line x1="-40" y1="130" x2="230" y2="130" stroke="var(--green)" strokeWidth="1" strokeDasharray="3 4" opacity="0.5" />
            <g className={reduced ? undefined : 'ev-approach'}>
              <circle cx="232" cy="130" r="4" fill="var(--green)" />
            </g>
            <g className={reduced ? undefined : 'ev-clamp'} style={reduced ? { opacity: 1 } : { animationDelay: '1.9s' }}>
              <rect x="224" y="118" width="16" height="4" rx="1" fill="var(--brass)" stroke="var(--brass-lo)" />
              <rect x="224" y="138" width="16" height="4" rx="1" fill="var(--brass)" stroke="var(--brass-lo)" />
            </g>
          </>
        )}
      </g>
    </svg>
  );
}
