import { useEffect, useState } from 'react';
import { useGame } from '../ui/useGame';
import { useMeta } from '../ui/useMeta';
import { useStrings } from '../ui/useLocale';
import { installFuse, setValve, enterRoom, holdHandle } from '../game/store';
import { doorsPowered, enginesOnline, valvesCorrect, stayAvailable } from '../game/derived';
import { LIFE_SUPPORT_MIN, REACTOR_OUTPUT } from '../game/content';
import { secretsFor } from '../game/secrets';
import { variantFor } from '../game/variants';
import { GearAndCoils } from './GearAndCoils';
import type { FuseRating, SubsystemId } from '../game/types';

// Gauge geometry: 0–120 PSI sweeps -120°..+120°, measured clockwise from 12 o'clock.
// The pressure value itself is never rendered as text — reading the needle is the puzzle.
const CX = 60;
const CY = 64;

function polar(r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [+(CX + r * Math.sin(rad)).toFixed(2), +(CY - r * Math.cos(rad)).toFixed(2)];
}

function arcPath(r: number, fromDeg: number, toDeg: number): string {
  const [x1, y1] = polar(r, fromDeg);
  const [x2, y2] = polar(r, toDeg);
  const large = toDeg - fromDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

const valueDeg = (v: number) => -120 + (v / 120) * 240;

function Gauge({ label, pressure, ariaLabel }: { label: string; pressure: number; ariaLabel: string }) {
  const d = valueDeg(pressure);
  const rad = (d * Math.PI) / 180;
  const ux = Math.sin(rad);
  const uy = -Math.cos(rad);
  const px = Math.cos(rad);
  const py = Math.sin(rad);
  const needle = [
    [CX + 35 * ux, CY + 35 * uy], // tip
    [CX + 2.2 * px, CY + 2.2 * py],
    [CX - 9 * ux, CY - 9 * uy], // counterweight tail
    [CX - 2.2 * px, CY - 2.2 * py],
  ]
    .map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`)
    .join(' ');

  return (
    <svg viewBox="0 0 120 120" width="128" role="img" aria-label={ariaLabel}>
      {/* bezel + face */}
      <circle cx={CX} cy={CY} r="56" fill="var(--face)" stroke="var(--steel)" strokeWidth="3" />
      <circle cx={CX} cy={CY} r="52" fill="none" stroke="var(--line)" strokeWidth="1.5" />
      {/* scale */}
      <path d={arcPath(44, -120, 120)} fill="none" stroke="#33443a" strokeWidth="2" />
      <path d={arcPath(44, valueDeg(100), 120)} fill="none" stroke="var(--amber)" strokeWidth="3" opacity="0.5" />
      {[10, 20, 40, 50, 70, 80, 100, 110].map((v) => {
        const [x1, y1] = polar(44, valueDeg(v));
        const [x2, y2] = polar(40.5, valueDeg(v));
        return <line key={v} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--steel-mid)" strokeWidth="1" />;
      })}
      {[0, 30, 60, 90, 120].map((v) => {
        const [x1, y1] = polar(44, valueDeg(v));
        const [x2, y2] = polar(37, valueDeg(v));
        const [tx, ty] = polar(28, valueDeg(v));
        return (
          <g key={v}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--steel-hi)" strokeWidth="2" />
            <text x={tx} y={ty + 2.5} fill="var(--dim)" fontSize="7.5" textAnchor="middle">
              {v}
            </text>
          </g>
        );
      })}
      {/* needle + hub */}
      <polygon points={needle} fill="var(--amber)" />
      <circle cx={CX} cy={CY} r="5" fill="var(--steel-lo)" stroke="var(--steel)" strokeWidth="1.5" />
      <circle cx={CX} cy={CY} r="1.8" fill="var(--amber)" />
      {/* engraved label plate */}
      <rect x="39" y="86" width="42" height="13" rx="2" fill="var(--panel-solid)" stroke="var(--line)" />
      <text x={CX} y="95.5" fill="var(--text)" fontSize="7" letterSpacing="1" textAnchor="middle">
        {label}
      </text>
    </svg>
  );
}

const FUSES: { rating: FuseRating; bands: string[] }[] = [
  { rating: '5A', bands: ['#c0392b'] },
  { rating: '10A', bands: ['#ffb454', '#ffb454'] },
  { rating: '15A', bands: ['#27ae60', '#27ae60', '#27ae60'] },
];

function FuseCartridge({ bands }: { bands: string[] }) {
  const bandW = 7;
  const gap = 5;
  const total = bands.length * bandW + (bands.length - 1) * gap;
  const start = 12 + (60 - total) / 2;
  return (
    <svg viewBox="0 0 84 30" width="84" aria-hidden="true">
      {/* ceramic body */}
      <rect x="10" y="8" width="64" height="14" rx="3" fill="#241f18" stroke="#4a4438" />
      <rect x="12" y="9.5" width="60" height="3" rx="1.5" fill="#3a332a" opacity="0.8" />
      {/* color bands */}
      {bands.map((c, i) => (
        <rect key={i} x={start + i * (bandW + gap)} y="8" width={bandW} height="14" fill={c} />
      ))}
      {/* metal end caps */}
      <rect x="2" y="5" width="10" height="20" rx="2" fill="#7d837a" stroke="#4a4f46" />
      <rect x="3" y="6.5" width="8" height="3" rx="1.5" fill="#a9aea4" opacity="0.7" />
      <rect x="72" y="5" width="10" height="20" rx="2" fill="#7d837a" stroke="#4a4f46" />
      <rect x="73" y="6.5" width="8" height="3" rx="1.5" fill="#a9aea4" opacity="0.7" />
    </svg>
  );
}

function FuseBox() {
  const installed = useGame((s) => s.fuseInstalled);
  const t = useStrings();
  return (
    <div className="panel">
      <h2>{t.eng.fuseTitle}</h2>
      <p className="status-dim">{t.eng.fuseDesc}</p>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {FUSES.map((f) => {
          const seated = installed === f.rating;
          return (
            <button
              key={f.rating}
              onClick={() => installFuse(f.rating)}
              disabled={seated}
              aria-label={t.eng.fuseAria(f.bands.length)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                ...(seated
                  ? { borderColor: 'var(--amber)', boxShadow: '0 0 12px rgba(255, 180, 84, 0.25)' }
                  : {}),
              }}
            >
              <FuseCartridge bands={f.bands} />
              {seated ? <span className="status-ok">{t.eng.seated}</span> : t.eng.seatIt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CoolantManifold() {
  const valves = useGame((s) => s.valveSettings);
  const ok = useGame(valvesCorrect);
  const pressures = secretsFor(useGame((s) => s.seed)).gaugePressures;
  const t = useStrings();
  return (
    <div className="panel">
      <h2>{t.eng.coolant}</h2>
      <p className="status-dim">{t.eng.coolantDesc}</p>
      <div style={{ display: 'flex', gap: 24 }}>
        {pressures.map((p, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <Gauge label={t.eng.line(i + 1)} pressure={p} ariaLabel={t.eng.gaugeAria(t.eng.line(i + 1))} />
            <input
              type="range" min={0} max={9} value={valves[i]}
              onChange={(e) => setValve(i as 0 | 1 | 2, Number(e.target.value))}
              aria-label={t.eng.valveAria(i + 1)}
              style={{ width: 116 }}
            />
            <div>
              {t.eng.valve} <strong style={{ color: 'var(--amber)' }}>{valves[i]}</strong>
            </div>
          </div>
        ))}
      </div>
      {ok && <p className="status-ok">{t.eng.flowSteadies}</p>}
    </div>
  );
}

function PowerBoard() {
  const alloc = useGame((s) => s.powerAllocation);
  const t = useStrings();
  const order: SubsystemId[] = ['life_support', 'doors', 'medbay', 'engines', 'comms', 'isolation'];
  return (
    <div className="panel">
      <h2>{t.eng.powerBoard}</h2>
      <p className="status-dim">{t.eng.readOnly}</p>
      {order.map((id) => (
        <div key={id} style={{ display: 'flex', gap: 10, alignItems: 'center', margin: '7px 0' }}>
          <span style={{ width: 128, flexShrink: 0, fontSize: 13, lineHeight: 1.15 }}>
            {t.eng.subsystems[id]}
          </span>
          {/* capacity track: full width = the reactor's 40u, one cell per unit */}
          <div
            style={{
              position: 'relative',
              flex: 1,
              maxWidth: 340,
              height: 14,
              background: 'var(--face)',
              border: '1px solid var(--line)',
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 1,
                bottom: 1,
                left: 1,
                width: `${(alloc[id] / REACTOR_OUTPUT) * 100}%`,
                background: 'linear-gradient(180deg, #ffc878, var(--amber) 55%, #d99a3f)',
                borderRadius: 2,
                transition: 'width 0.35s ease',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage:
                  'repeating-linear-gradient(to right, transparent 0, transparent calc(2.5% - 1px), rgba(10, 14, 12, 0.9) calc(2.5% - 1px), rgba(10, 14, 12, 0.9) 2.5%)',
              }}
            />
            {id === 'life_support' && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${(LIFE_SUPPORT_MIN / REACTOR_OUTPUT) * 100}%`,
                  width: 2,
                  background: 'var(--red)',
                  opacity: 0.85,
                }}
              />
            )}
          </div>
          <span className="status-dim" style={{ width: 34, flexShrink: 0 }}>
            {alloc[id]}u
          </span>
        </div>
      ))}
    </div>
  );
}

function Jaw({ side, open }: { side: 'left' | 'right'; open: boolean }) {
  // A hinged jaw around the docking ring. Hinge pins at (110, 82) and (210, 82);
  // the jaw swings outward while the clamps are held open.
  const hx = side === 'left' ? 110 : 210;
  const dir = side === 'left' ? -1 : 1;
  const d = side === 'left'
    ? 'M 110 74 L 132 62 Q 160 54 176 70 L 170 78 Q 158 66 136 72 L 118 90 Z'
    : 'M 210 74 L 188 62 Q 160 54 144 70 L 150 78 Q 162 66 184 72 L 202 90 Z';
  return (
    <g className="lever" style={{ transform: open ? `rotate(${dir * 32}deg)` : 'rotate(0deg)', transformOrigin: `${hx}px 82px` }}>
      <path d={d} fill="url(#dk-steel)" stroke="var(--steel)" strokeWidth="1.5" />
      <circle cx={hx} cy="82" r="5" fill="url(#dk-brass)" stroke="var(--brass-lo)" strokeWidth="1.5" />
    </g>
  );
}

function DockingClamps() {
  const ngPlus = useGame((s) => s.ngPlus);
  const killswitch = useGame((s) => s.killswitch);
  const chapter3 = useGame((s) => s.chapter3);
  const ritual = useGame((s) => s.ritual);
  const ending = useGame((s) => s.ending);
  const memory = useMeta((m) => m);
  const t = useStrings();
  const available = stayAvailable({ ngPlus, killswitch, chapter3 }, memory);
  const armed = ritual.active === 'stay' && ritual.phase === 'armed';
  const docked = ending === 'stay';
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    if (!armed) return;
    setNowTick(Date.now());
    const timer = setInterval(() => setNowTick(Date.now()), 250);
    return () => clearInterval(timer);
  }, [armed]);
  const secondsLeft = armed && ritual.endsAt ? Math.max(0, Math.ceil((ritual.endsAt - nowTick) / 1000)) : null;
  const elapsed = armed && secondsLeft === 0;
  if (!available) return null;
  const open = armed && ritual.held && !elapsed;
  const lamp = docked ? 'var(--green)' : armed && !elapsed ? 'var(--amber)' : 'var(--dim)';
  return (
    <div className="panel" style={{ borderColor: armed ? 'var(--amber)' : 'var(--line)' }}>
      <h2>{t.eng.dockTitle}</h2>
      <p className="status-dim">{t.eng.dockDesc}</p>
      <svg viewBox="0 0 320 160" width="100%" style={{ maxWidth: 480, display: 'block' }} role="img" aria-label={t.eng.dockAria}>
        <defs>
          <linearGradient id="dk-steel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--steel-hi)" />
            <stop offset="100%" stopColor="var(--steel-lo)" />
          </linearGradient>
          <linearGradient id="dk-brass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--brass-hi)" />
            <stop offset="100%" stopColor="var(--brass-lo)" />
          </linearGradient>
          <clipPath id="dk-face"><rect x="10" y="10" width="300" height="140" rx="4" /></clipPath>
        </defs>
        <rect x="4" y="4" width="312" height="152" rx="6" fill="var(--face)" stroke="var(--steel)" strokeWidth="3" />
        <rect x="10" y="10" width="300" height="140" rx="4" fill="var(--face-deep)" stroke="var(--line)" />
        <g clipPath="url(#dk-face)">
          {/* pod one: approaches down into the ring while the hail is live; sits docked at the end */}
          <g style={{ transition: 'transform 0.8s ease', transform: docked || (armed && !elapsed) ? 'translate(0px, 0px)' : 'translate(0px, -90px)' }}>
            <rect x="146" y="58" width="28" height="44" rx="12" fill="url(#dk-steel)" stroke="var(--steel)" strokeWidth="1.5" />
            <rect x="152" y="66" width="16" height="8" rx="2" fill="var(--amber)" opacity="0.7" />
            <text x="160" y="94" textAnchor="middle" fontSize="6" fill="var(--parchment)" letterSpacing="1">POD 1</text>
          </g>
        </g>
        {/* docking ring */}
        <circle cx="160" cy="82" r="36" fill="none" stroke="var(--steel)" strokeWidth="4" />
        <circle cx="160" cy="82" r="30" fill="none" stroke="var(--line)" strokeWidth="1" strokeDasharray="3 3" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
          const r = (deg * Math.PI) / 180;
          return <line key={deg} x1={160 + 36 * Math.cos(r)} y1={82 + 36 * Math.sin(r)} x2={160 + 40 * Math.cos(r)} y2={82 + 40 * Math.sin(r)} stroke="var(--steel-hi)" strokeWidth="1.5" />;
        })}
        <Jaw side="left" open={open} />
        <Jaw side="right" open={open} />
        {/* docking lamp */}
        <circle cx="290" cy="26" r="8" fill="var(--face)" stroke="var(--steel)" strokeWidth="2" />
        <circle cx="290" cy="26" r="5" fill={lamp} opacity={lamp === 'var(--dim)' ? 0.35 : 0.95} />
        {/* engraved plate */}
        <rect x="18" y="128" width="48" height="14" rx="2" fill="var(--panel-solid)" stroke="var(--line)" />
        <text x="42" y="138" textAnchor="middle" fontSize="7.5" fill="var(--text)" letterSpacing="2">DOCK-1</text>
      </svg>
      {docked ? null : armed ? (
        <>
          <p className="status-ok">{t.eng.dockArmed}</p>
          {elapsed ? (
            <p className="status-dim">{t.eng.dockWindowElapsed}</p>
          ) : (
            <>
              <p className="status-bad blink" style={{ fontSize: 24 }}>T-{secondsLeft}s</p>
              <p>{t.eng.dockTwoOp}</p>
            </>
          )}
        </>
      ) : (
        <p className="status-dim">{t.eng.dockWaiting}</p>
      )}
      <button
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); holdHandle(true); }}
        onPointerUp={() => holdHandle(false)}
        onPointerCancel={() => holdHandle(false)}
        onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); holdHandle(true); } }}
        onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') holdHandle(false); }}
        onBlur={() => holdHandle(false)}
        disabled={!armed || elapsed || docked}
        style={{ fontSize: 18, padding: '16px 28px', borderWidth: 2, minWidth: '32ch', marginTop: 10 }}
      >
        {open ? t.eng.clampsHolding : t.eng.clampsHold}
      </button>
    </div>
  );
}

function BridgeDoor() {
  const unlocked = useGame((s) => s.doors.engineering_exit);
  const powered = useGame(doorsPowered);
  const engines = useGame(enginesOnline);
  const t = useStrings();
  return (
    <div className="panel">
      <h2>{t.eng.ladderUp}</h2>
      {engines && <p className="status-ok">{t.eng.enginesHum}</p>}
      {unlocked ? (
        <>
          <p className="status-ok blink">{t.eng.hatchOpen}</p>
          <button onClick={() => enterRoom('bridge')}>{t.eng.climbUp}</button>
        </>
      ) : (
        <p className={powered ? 'status-bad' : 'status-dim'}>
          {powered ? t.eng.servosPowered : t.eng.servosUnpowered}
        </p>
      )}
    </div>
  );
}

export function Engineering() {
  const t = useStrings();
  const seed = useGame((s) => s.seed);
  const coilDrive = variantFor(seed, 'engineering') === 1;
  return (
    <div className="scene">
      <div className="panel">
        <h2>{t.eng.title}</h2>
        <p>{t.eng.intro}</p>
      </div>
      <PowerBoard />
      {coilDrive ? <GearAndCoils /> : <><FuseBox /><CoolantManifold /></>}
      <DockingClamps />
      <BridgeDoor />
    </div>
  );
}
