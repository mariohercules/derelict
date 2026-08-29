import { useEffect, useState } from 'react';
import { useGame } from '../ui/useGame';
import { useStrings } from '../ui/useLocale';
import { takeStarFix, holdHandle, enterRoom } from '../game/store';
import { secretsFor } from '../game/secrets';

// Deterministic star field (no per-render randomness — the sky must hold still).
// x spans -30..430 so the parallax shift never exposes an empty edge.
const STARS = Array.from({ length: 42 }, (_, i) => ({
  x: ((i * 97.3 + 11) % 460) - 30,
  y: (i * 57.7 + 23) % 160,
  r: 0.6 + ((i * 37) % 10) / 9,
  o: 0.25 + ((i * 53) % 10) / 18,
}));

function Viewport() {
  const taken = useGame((s) => s.starFixTaken);
  const starFix = secretsFor(useGame((s) => s.seed)).starFix;
  const t = useStrings();
  const [alignment, setAlignment] = useState(0);
  const aligned = alignment >= 47 && alignment <= 53;

  useEffect(() => {
    if (aligned && !taken) takeStarFix();
  }, [aligned, taken]);

  return (
    <div className="panel">
      <h2>{t.bridge.viewportTitle}</h2>
      <p className="status-dim">{t.bridge.viewportDesc}</p>
      <svg viewBox="0 0 400 160" width="100%" role="img" aria-label={t.bridge.starAria}>
        <defs>
          <clipPath id="vp-clip">
            <rect width="400" height="160" rx="10" />
          </clipPath>
          <radialGradient id="vp-nebula" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#2a4a3f" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#2a4a3f" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="vp-vignette" cx="0.5" cy="0.5" r="0.72">
            <stop offset="55%" stopColor="#000000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.55" />
          </radialGradient>
        </defs>
        <g clipPath="url(#vp-clip)">
          <rect width="400" height="160" fill="#05080a" />
          <ellipse cx="85" cy="135" rx="150" ry="70" fill="url(#vp-nebula)" />
          {/* distant stars drift slower than the beacons — parallax sells the optics */}
          <g transform={`translate(${((50 - alignment) * 0.5).toFixed(1)}, 0)`}>
            {STARS.map((s, i) => (
              <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#9fb3a8" opacity={s.o} />
            ))}
          </g>
          {starFix.map((glyph, i) => {
            const x = 155 + i * 45 + (50 - alignment) * 2;
            return (
              <g key={glyph}>
                <circle className="beacon-halo" cx={x} cy={70} r="9" fill="var(--amber)" opacity="0.16"
                  style={{ animationDelay: `${i * 0.6}s` }} />
                <circle cx={x} cy={70} r="5.5" fill="var(--amber)" opacity="0.3" />
                <line x1={x - 9} y1={70} x2={x + 9} y2={70} stroke="var(--amber)" strokeWidth="1" opacity="0.35" />
                <line x1={x} y1={61} x2={x} y2={79} stroke="var(--amber)" strokeWidth="1" opacity="0.35" />
                <circle cx={x} cy={70} r="3.2" fill="var(--amber)" />
                <text x={x} y={97} textAnchor="middle" fill="var(--green)" fontSize="12" letterSpacing="2"
                  opacity={aligned ? 1 : 0} style={{ transition: 'opacity 0.6s' }}>
                  {glyph}
                </text>
              </g>
            );
          })}
          {/* vignette: looking through thick glass */}
          <rect width="400" height="160" fill="url(#vp-vignette)" />
          {/* the crack the bridge copy promises */}
          <g stroke="#9fb3a8" fill="none" strokeWidth="1">
            <path d="M 400 10 L 354 27 L 319 36" opacity="0.16" />
            <path d="M 388 0 L 354 27" opacity="0.12" />
            <path d="M 354 27 L 338 60" opacity="0.1" />
          </g>
          {/* optical reticle */}
          <g style={{ transition: 'stroke 0.4s' }} stroke={aligned ? 'var(--green)' : 'var(--dim)'}>
            {aligned && <circle cx="200" cy="70" r="55" fill="none" stroke="var(--green)" strokeWidth="5" opacity="0.18" />}
            <circle cx="200" cy="70" r="55" fill="none" strokeDasharray="6 4" strokeWidth="1.5" />
            <circle cx="200" cy="70" r="40" fill="none" strokeWidth="0.75" opacity="0.35" />
            <line x1="200" y1="8" x2="200" y2="15" strokeWidth="1.5" />
            <line x1="200" y1="125" x2="200" y2="132" strokeWidth="1.5" />
            <line x1="138" y1="70" x2="145" y2="70" strokeWidth="1.5" />
            <line x1="255" y1="70" x2="262" y2="70" strokeWidth="1.5" />
            <circle cx="200" cy="70" r="1.2" fill={aligned ? 'var(--green)' : 'var(--dim)'} stroke="none" />
          </g>
        </g>
        <rect x="1" y="1" width="398" height="158" rx="10" fill="none" stroke="#2a3a30" strokeWidth="2" />
      </svg>
      <input
        type="range" min={0} max={100} value={alignment}
        onChange={(e) => setAlignment(Number(e.target.value))}
        style={{ width: '100%' }}
        aria-label={t.bridge.reticleAria}
      />
      {aligned && <p className="status-ok">{t.bridge.beaconsLocked}</p>}
    </div>
  );
}

function LaunchConsole() {
  const ritual = useGame((s) => s.ritual);
  const armed = ritual.active === 'launch' && ritual.phase === 'armed';
  const trajectorySet = useGame((s) => s.trajectorySet);
  const t = useStrings();
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    if (!armed) return;
    setNowTick(Date.now()); // reset immediately: a stale mount-time tick would flash an inflated T-minus
    const timer = setInterval(() => setNowTick(Date.now()), 250);
    return () => clearInterval(timer);
  }, [armed]);

  const secondsLeft =
    armed && ritual.endsAt
      ? Math.max(0, Math.ceil((ritual.endsAt - nowTick) / 1000))
      : null;

  return (
    <div className="panel">
      <h2>{t.bridge.consoleTitle}</h2>
      {!trajectorySet && <p className="status-dim">{t.bridge.trajNotSet}</p>}
      {trajectorySet && ritual.phase === 'idle' && <p className="status-ok">{t.bridge.trajLocked}</p>}
      {armed && (
        <>
          <p className="status-bad blink" style={{ fontSize: 24 }}>T-{secondsLeft}s</p>
          <p>{t.bridge.twoOp}</p>
          {secondsLeft === 0 && <p className="status-dim">{t.bridge.windowElapsed}</p>}
        </>
      )}
      <button
        onPointerDown={(e) => {
          // Capture the pointer: the hold survives drift off the button
          // (its own label swap resizes it mid-press) and release still
          // fires here even if the pointer ends up elsewhere.
          e.currentTarget.setPointerCapture(e.pointerId);
          holdHandle(true);
        }}
        onPointerUp={() => holdHandle(false)}
        onPointerCancel={() => holdHandle(false)}
        onKeyDown={(e) => {
          if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
            e.preventDefault();
            holdHandle(true);
          }
        }}
        onKeyUp={(e) => {
          if (e.key === ' ' || e.key === 'Enter') holdHandle(false);
        }}
        onBlur={() => holdHandle(false)}
        disabled={!armed}
        style={{ fontSize: 18, padding: '16px 28px', borderWidth: 2, minWidth: '32ch' }}
      >
        {ritual.held ? t.bridge.holding : t.bridge.confirmHold}
      </button>
    </div>
  );
}

function EngineeringLadder() {
  const t = useStrings();
  return (
    <div className="panel">
      <h2>{t.bridge.ladderDown}</h2>
      <button onClick={() => enterRoom('engineering')}>{t.bridge.climbDown}</button>
    </div>
  );
}

export function Bridge() {
  const t = useStrings();
  return (
    <div className="scene">
      <div className="panel">
        <h2>{t.bridge.title}</h2>
        <p>{t.bridge.intro}</p>
      </div>
      <Viewport />
      <LaunchConsole />
      <EngineeringLadder />
    </div>
  );
}
