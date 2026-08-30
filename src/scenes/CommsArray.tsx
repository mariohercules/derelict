import { useEffect, useState } from 'react';
import { useGame } from '../ui/useGame';
import { useStrings } from '../ui/useLocale';
import { holdHandle, openBand, setDish } from '../game/store';
import { dishAligned } from '../game/derived';

const CX = 90;
const CY = 90;

function polar(r: number, deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [+(CX + r * Math.cos(rad)).toFixed(2), +(CY + r * Math.sin(rad)).toFixed(2)];
}

function Dish() {
  const dish = useGame((s) => s.chapter3.dish);
  const aligned = useGame((s) => dishAligned(s));
  const heard = useGame((s) => s.chapter3.beaconHeard);
  const ritual = useGame((s) => s.ritual);
  const t = useStrings();
  const transmitting = ritual.active === 'broadcast' && ritual.phase === 'armed';
  const [tick, setTick] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!transmitting) return;
    setNow(Date.now());
    const timer = setInterval(() => {
      setTick((n) => n + 1);
      setNow(Date.now());
    }, 120);
    return () => clearInterval(timer);
  }, [transmitting]);
  const elapsed = transmitting && ritual.endsAt !== null && now >= ritual.endsAt;
  const reducedMotion =
    typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  // Deterministic drift while the band is open, unexpired, and the lock is not
  // held: the pointer wanders; the store's `held` flag, not this wobble, is the
  // truth. The hold still matters under reduced motion — only the wobble stills.
  const drift = transmitting && !elapsed && !ritual.held && !reducedMotion ? Math.sin(tick / 3) * 6 : 0;
  const [ax, ay] = polar(58, dish.az + drift);
  const elRad = (dish.el * Math.PI) / 180;
  const ex = 230 + 60 * Math.cos(elRad);
  const ey = 150 - 60 * Math.sin(elRad);
  const lampColor = aligned ? 'var(--green)' : 'var(--amber)';
  return (
    <div className="panel" style={{ borderColor: aligned ? 'var(--green)' : 'var(--line)' }}>
      <h2>{t.comms.dishTitle}</h2>
      <p className="status-dim">{t.comms.dishDesc}</p>
      <svg viewBox="0 0 320 180" width="100%" style={{ maxWidth: 520, display: 'block' }} role="img"
        aria-label={`${t.comms.dishAria} — ${t.comms.az} ${dish.az}, ${t.comms.el} ${dish.el}`}>
        <defs>
          <radialGradient id="ca-face" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="var(--panel-solid)" />
            <stop offset="100%" stopColor="var(--face-deep)" />
          </radialGradient>
        </defs>
        {/* azimuth rose */}
        <circle cx={CX} cy={CY} r="78" fill="var(--face)" stroke="var(--steel)" strokeWidth="3" />
        <circle cx={CX} cy={CY} r="72" fill="url(#ca-face)" stroke="var(--line)" />
        {Array.from({ length: 36 }, (_, i) => i * 10).map((deg) => {
          const major = deg % 90 === 0;
          const [x1, y1] = polar(70, deg);
          const [x2, y2] = polar(major ? 60 : 65, deg);
          return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke={major ? 'var(--steel-hi)' : 'var(--steel-mid)'} strokeWidth={major ? 2 : 1} />;
        })}
        {[['N', 0], ['E', 90], ['S', 180], ['W', 270]].map(([c, d]) => {
          const [x, y] = polar(50, Number(d));
          return <text key={c} x={x} y={y + 3} textAnchor="middle" fontSize="8" fill="var(--dim)">{c}</text>;
        })}
        <line x1={CX} y1={CY} x2={ax} y2={ay} stroke="var(--amber)" strokeWidth="2.5" />
        <circle cx={CX} cy={CY} r="5" fill="var(--steel-lo)" stroke="var(--steel)" strokeWidth="1.5" />
        <rect x={CX - 21} y="164" width="42" height="13" rx="2" fill="var(--panel-solid)" stroke="var(--line)" />
        <text x={CX} y="173.5" textAnchor="middle" fontSize="7" fill="var(--text)" letterSpacing="1">{t.comms.az} {String(dish.az).padStart(3, '0')}</text>
        {/* elevation quadrant */}
        <path d="M 230 150 L 290 150 A 60 60 0 0 0 230 90 Z" fill="var(--face)" stroke="var(--steel)" strokeWidth="3" />
        <path d="M 230 150 L 284 150 A 54 54 0 0 0 230 96 Z" fill="url(#ca-face)" stroke="var(--line)" />
        {[0, 15, 30, 45, 60, 75, 90].map((deg) => {
          const r1 = 54, r2 = deg % 45 === 0 ? 44 : 48;
          const rad = (deg * Math.PI) / 180;
          return <line key={deg} x1={230 + r1 * Math.cos(rad)} y1={150 - r1 * Math.sin(rad)} x2={230 + r2 * Math.cos(rad)} y2={150 - r2 * Math.sin(rad)} stroke="var(--steel-mid)" strokeWidth={deg % 45 === 0 ? 2 : 1} />;
        })}
        <line x1="230" y1="150" x2={ex} y2={ey} stroke="var(--amber)" strokeWidth="2.5" />
        <circle cx="230" cy="150" r="4" fill="var(--steel-lo)" stroke="var(--steel)" strokeWidth="1.5" />
        <rect x="236" y="164" width="42" height="13" rx="2" fill="var(--panel-solid)" stroke="var(--line)" />
        <text x="257" y="173.5" textAnchor="middle" fontSize="7" fill="var(--text)" letterSpacing="1">{t.comms.el} {String(dish.el).padStart(2, '0')}</text>
        {/* lock lamp */}
        <circle cx="280" cy="30" r="9" fill="var(--face)" stroke="var(--steel)" strokeWidth="2" />
        <circle className={aligned && !heard ? 'beacon-halo' : undefined} cx="280" cy="30" r="6" fill={lampColor} opacity={aligned ? 0.95 : 0.35} />
      </svg>
      <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
        <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ width: 64 }}>{t.comms.az} {dish.az}°</span>
          <input type="range" min={0} max={359} value={dish.az} onChange={(e) => setDish('az', Number(e.target.value))} style={{ flex: 1 }} aria-label={t.comms.azAria} />
        </label>
        <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ width: 64 }}>{t.comms.el} {dish.el}°</span>
          <input type="range" min={0} max={90} value={dish.el} onChange={(e) => setDish('el', Number(e.target.value))} style={{ flex: 1 }} aria-label={t.comms.elAria} />
        </label>
      </div>
      <p className={aligned ? 'status-ok' : 'status-dim'} style={{ marginTop: 8 }}>{aligned ? t.comms.locked : t.comms.carrier}</p>
    </div>
  );
}

function Beacon() {
  const aligned = useGame((s) => dishAligned(s));
  const heard = useGame((s) => s.chapter3.beaconHeard);
  const t = useStrings();
  if (!aligned && !heard) return null;
  return (
    <div className="panel">
      <h2>{t.comms.beaconTitle}</h2>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <svg viewBox="0 0 40 40" width="44" role="img" aria-label={t.comms.beaconAria}>
          <circle cx="20" cy="20" r="16" fill="var(--face)" stroke="var(--steel)" strokeWidth="2.5" />
          <circle className="beacon-halo" cx="20" cy="20" r="9" fill="var(--green)" opacity="0.25" />
          <circle cx="20" cy="20" r="5" fill="var(--green)" />
        </svg>
        <p className={heard ? 'status-ok' : 'status-dim'}>{heard ? t.comms.beaconHeard : t.comms.beaconDesc}</p>
      </div>
    </div>
  );
}

function OpenBand() {
  const aligned = useGame((s) => dishAligned(s));
  const cache = useGame((s) => s.chapter3.cacheRead);
  const ritual = useGame((s) => s.ritual);
  const t = useStrings();
  const armed = ritual.active === 'broadcast' && ritual.phase === 'armed';
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [refusal, setRefusal] = useState<string | null>(null);
  useEffect(() => {
    if (!armed) return;
    setNowTick(Date.now());
    const timer = setInterval(() => setNowTick(Date.now()), 250);
    return () => clearInterval(timer);
  }, [armed]);
  const secondsLeft = armed && ritual.endsAt ? Math.max(0, Math.ceil((ritual.endsAt - nowTick) / 1000)) : null;
  const elapsed = armed && secondsLeft === 0;
  const tryOpen = () => {
    if (!cache) return setRefusal(t.comms.bandNoEvidence);
    if (!aligned) return setRefusal(t.comms.bandNotAligned);
    setRefusal(openBand().ok ? null : t.comms.anotherRitual);
  };
  return (
    <div className="panel" style={{ borderColor: armed ? 'var(--amber)' : 'var(--line)' }}>
      <h2>{t.comms.bandTitle}</h2>
      <p className="status-dim">{t.comms.bandDesc}</p>
      {(!armed || elapsed) && ritual.phase !== 'done' && <button onClick={tryOpen} style={{ borderColor: 'var(--amber)' }}>{t.comms.openBand}</button>}
      {refusal && !armed && <p className="status-dim" style={{ marginTop: 8 }}>{refusal}</p>}
      {armed && (
        <>
          <p className="status-ok">{t.comms.bandOpen}</p>
          {elapsed ? (
            <p className="status-dim" style={{ marginTop: 8 }}>{t.comms.windowElapsed}</p>
          ) : (
            <>
              <p className="status-bad blink" style={{ fontSize: 24 }}>T-{secondsLeft}s</p>
              <p>{t.comms.twoOp}</p>
            </>
          )}
        </>
      )}
      <button
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); holdHandle(true); }}
        onPointerUp={() => holdHandle(false)}
        onPointerCancel={() => holdHandle(false)}
        onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); holdHandle(true); } }}
        onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') holdHandle(false); }}
        onBlur={() => holdHandle(false)}
        disabled={!armed || elapsed}
        style={{ fontSize: 18, padding: '16px 28px', borderWidth: 2, minWidth: '32ch', marginTop: 10 }}
      >
        {ritual.held && armed && !elapsed ? t.comms.lockHolding : t.comms.lockHold}
      </button>
    </div>
  );
}

export function CommsArray() {
  const t = useStrings();
  return (
    <div className="scene">
      <div className="panel">
        <h2>{t.comms.title}</h2>
        <p>{t.comms.intro}</p>
      </div>
      <Dish />
      <Beacon />
      <OpenBand />
      <p className="status-dim">{t.comms.next}</p>
    </div>
  );
}
