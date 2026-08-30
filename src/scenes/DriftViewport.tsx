import { useEffect, useState } from 'react';
import { useGame } from '../ui/useGame';
import { useStrings } from '../ui/useLocale';
import { takeStarFix } from '../game/store';
import { variantSecretsFor } from '../game/variants';

// Same deterministic star field as the parallax viewport (kept in sync by eye,
// not imported: the two panels are alternatives, never rendered together).
const STARS = Array.from({ length: 42 }, (_, i) => ({
  x: ((i * 97.3 + 11) % 460) - 30,
  y: (i * 57.7 + 23) % 160,
  r: 0.6 + ((i * 37) % 10) / 9,
  o: 0.25 + ((i * 53) % 10) / 18,
}));

// The runner's path: a deterministic lissajous over the tick counter.
function runnerAt(tick: number): { x: number; y: number } {
  return { x: 200 + 92 * Math.sin(tick * 0.055), y: 74 + 42 * Math.sin(tick * 0.083 + 1.2) };
}

export function DriftViewport() {
  const taken = useGame((s) => s.starFixTaken);
  const seed = useGame((s) => s.seed);
  const t = useStrings();
  const [pitch, setPitch] = useState(50);
  const [yaw, setYaw] = useState(50);
  const [tick, setTick] = useState(0);
  const reducedMotion =
    typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (taken) return;
    // Motion IS the puzzle here, so reduced-motion slows the runner (~40%)
    // rather than freezing it — a frozen target would gut the fix.
    const step = reducedMotion ? 0.4 : 1;
    const timer = setInterval(() => setTick((n) => n + step), 100);
    return () => clearInterval(timer);
  }, [taken, reducedMotion]);

  const runner = runnerAt(tick);
  const rx = 60 + (yaw / 100) * 280;
  const ry = 18 + (pitch / 100) * 112;
  const dist = Math.hypot(runner.x - rx, runner.y - ry);
  const locked = dist < 12;

  useEffect(() => {
    if (locked && !taken) takeStarFix();
  }, [locked, taken]);

  const codes = variantSecretsFor(seed).driftFix;

  return (
    <div className="panel">
      <h2>{t.bridge.dvTitle}</h2>
      <p className="status-dim">{t.bridge.dvDesc}</p>
      <svg viewBox="0 0 400 160" width="100%" role="img" aria-label={t.bridge.dvAria}>
        <defs>
          <clipPath id="dv-clip"><rect width="400" height="160" rx="10" /></clipPath>
          <radialGradient id="dv-nebula" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#2a4a3f" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#2a4a3f" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="dv-vignette" cx="0.5" cy="0.5" r="0.72">
            <stop offset="55%" stopColor="#000000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.55" />
          </radialGradient>
        </defs>
        <g clipPath="url(#dv-clip)">
          <rect width="400" height="160" fill="#05080a" />
          <ellipse cx="315" cy="30" rx="150" ry="70" fill="url(#dv-nebula)" />
          {STARS.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#9fb3a8" opacity={s.o} />
          ))}
          {/* the runner */}
          <g style={{ transition: 'transform 0.1s linear' }} transform={`translate(${runner.x}, ${runner.y})`}>
            <circle className="beacon-halo" r="8" fill="var(--amber)" opacity="0.18" />
            <circle r="3" fill="var(--amber)" />
            <line x1="-7" y1="0" x2="7" y2="0" stroke="var(--amber)" strokeWidth="1" opacity="0.4" />
          </g>
          {/* codes engrave once the ring has bitten */}
          {taken && codes.map((c, i) => (
            <g key={c + i}>
              <rect x={140 + i * 46} y="128" width="36" height="16" rx="2" fill="var(--panel-solid)" stroke="var(--line)" />
              <text x={158 + i * 46} y="140" textAnchor="middle" fontSize="10" fill="var(--green)" letterSpacing="2">{c}</text>
            </g>
          ))}
          <rect width="400" height="160" fill="url(#dv-vignette)" />
          <g stroke="#9fb3a8" fill="none" strokeWidth="1">
            <path d="M 400 10 L 354 27 L 319 36" opacity="0.16" />
            <path d="M 388 0 L 354 27" opacity="0.12" />
          </g>
          {/* the two-axis reticle */}
          <g stroke={locked || taken ? 'var(--green)' : 'var(--dim)'} style={{ transition: 'stroke 0.3s' }}>
            {(locked || taken) && <circle cx={rx} cy={ry} r="20" fill="none" stroke="var(--green)" strokeWidth="4" opacity="0.2" />}
            <circle cx={rx} cy={ry} r="20" fill="none" strokeDasharray="5 4" strokeWidth="1.5" />
            <line x1={rx} y1={ry - 27} x2={rx} y2={ry - 21} strokeWidth="1.5" />
            <line x1={rx} y1={ry + 21} x2={rx} y2={ry + 27} strokeWidth="1.5" />
            <line x1={rx - 27} y1={ry} x2={rx - 21} y2={ry} strokeWidth="1.5" />
            <line x1={rx + 21} y1={ry} x2={rx + 27} y2={ry} strokeWidth="1.5" />
          </g>
        </g>
        <rect x="1" y="1" width="398" height="158" rx="10" fill="none" stroke="var(--line)" strokeWidth="2" />
      </svg>
      <input type="range" min={0} max={100} value={yaw} onChange={(e) => setYaw(Number(e.target.value))}
        style={{ width: '100%' }} aria-label={t.bridge.dvYawAria} />
      <input type="range" min={0} max={100} value={pitch} onChange={(e) => setPitch(Number(e.target.value))}
        style={{ width: '100%' }} aria-label={t.bridge.dvPitchAria} />
      {taken && <p className="status-ok">{t.bridge.dvLocked}</p>}
    </div>
  );
}
