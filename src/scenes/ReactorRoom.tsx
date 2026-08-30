import { useState } from 'react';
import { useGame } from '../ui/useGame';
import { useStrings } from '../ui/useLocale';
import { cutIsolation } from '../game/store';
import { nextShieldCost } from '../game/derived';
import { BUSES, REACTOR_OUTPUT, SHIELD_COST } from '../game/content';
import type { BusId } from '../game/types';

const SLOT_W = 84;
const X0 = 22;

function IsolationBank() {
  const shielded = useGame((s) => s.chapter3.shielded);
  const isolation = useGame((s) => s.powerAllocation.isolation);
  const need = useGame((s) => nextShieldCost(s));
  const t = useStrings();
  const [refused, setRefused] = useState<BusId | null>(null);
  return (
    <div className="panel">
      <h2>{t.reactor.bankTitle}</h2>
      <p className="status-dim">{t.reactor.bankDesc}</p>
      <svg viewBox="0 0 380 150" width="100%" style={{ maxWidth: 560, display: 'block' }} role="img" aria-label={t.reactor.bankAria}>
        <defs>
          <linearGradient id="rr-phenolic" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2b2320" />
            <stop offset="100%" stopColor="#15110f" />
          </linearGradient>
          <linearGradient id="rr-brass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e2c27a" />
            <stop offset="50%" stopColor="#b8893e" />
            <stop offset="100%" stopColor="#6e4f1e" />
          </linearGradient>
        </defs>
        {/* panel bezel + inset face */}
        <rect x="4" y="4" width="372" height="142" rx="6" fill="#0c110e" stroke="#3a4a40" strokeWidth="3" />
        <rect x="10" y="10" width="360" height="130" rx="4" fill="url(#rr-phenolic)" stroke="var(--line)" />
        {BUSES.map((bus, i) => {
          const x = X0 + i * SLOT_W;
          const cut = shielded.includes(bus);
          return (
            <g key={bus}>
              {/* lamp */}
              <circle cx={x + 32} cy="26" r="5" fill={cut ? 'var(--red)' : '#1d2620'} stroke="#3a4a40" strokeWidth="1.5" />
              {cut && <circle cx={x + 32} cy="26" r="9" fill="var(--red)" opacity="0.18" />}
              {/* hinge block + blade: the lever rotates down when cut */}
              <rect x={x + 8} y="44" width="12" height="52" rx="2" fill="url(#rr-brass)" stroke="#6e4f1e" />
              <g className="lever" style={{ transform: cut ? 'rotate(58deg)' : 'rotate(0deg)', transformOrigin: `${x + 14}px 90px` }}>
                <rect x={x + 12} y="46" width="46" height="8" rx="2" fill="url(#rr-brass)" stroke="#6e4f1e" />
                <rect x={x + 50} y="42" width="10" height="16" rx="2" fill="#0c110e" stroke="#3a4a40" />
              </g>
              <circle cx={x + 14} cy="90" r="4" fill="#0c110e" stroke="#6e4f1e" strokeWidth="1.5" />
              {/* contact jaw */}
              <rect x={x + 54} y="86" width="10" height="14" rx="1.5" fill="#1d2620" stroke="#3a4a40" />
              {/* engraved bus plate */}
              <rect x={x + 6} y="112" width="64" height="16" rx="2" fill="#131a16" stroke="var(--line)" />
              <text x={x + 38} y="123.5" textAnchor="middle" fill="var(--text)" fontSize="8" letterSpacing="2">{t.reactor.bus[bus]}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8, marginTop: 10, maxWidth: 560 }}>
        {BUSES.map((bus) => {
          const cut = shielded.includes(bus);
          return (
            <button key={bus} disabled={cut} aria-label={t.reactor.cutAria(t.reactor.bus[bus])}
              style={{ borderColor: cut ? 'var(--dim)' : 'var(--red)', color: cut ? 'var(--dim)' : 'var(--red)' }}
              onClick={() => setRefused(cutIsolation(bus).ok ? null : bus)}>
              {cut ? t.reactor.shielded : `${t.reactor.cut} ${t.reactor.bus[bus]}`}
            </button>
          );
        })}
      </div>
      {refused && !shielded.includes(refused) && isolation < need && (
        <p className="status-bad" style={{ marginTop: 10 }}>{t.reactor.needPower(isolation, need)}</p>
      )}
    </div>
  );
}

function IsolationFeed() {
  const isolation = useGame((s) => s.powerAllocation.isolation);
  const need = useGame((s) => nextShieldCost(s));
  const t = useStrings();
  const pct = (v: number) => `${Math.min(100, (v / REACTOR_OUTPUT) * 100)}%`;
  return (
    <div className="panel">
      <h2>{t.reactor.feedTitle}</h2>
      <p className="status-dim">{t.reactor.feedDesc}</p>
      <svg viewBox="0 0 380 44" width="100%" style={{ maxWidth: 560, display: 'block' }} role="img" aria-label={t.reactor.feedAria}>
        <rect x="4" y="4" width="372" height="36" rx="5" fill="#0c110e" stroke="#3a4a40" strokeWidth="3" />
        <rect x="12" y="12" width="356" height="20" rx="3" fill="#080b09" stroke="var(--line)" />
        <rect x="12" y="12" width={356 * Math.min(1, isolation / REACTOR_OUTPUT)} height="20" rx="3" fill="var(--amber)" opacity="0.75" style={{ transition: 'width 0.3s' }} />
        {/* demand hairline */}
        <line x1={12 + 356 * Math.min(1, need / REACTOR_OUTPUT)} y1="8" x2={12 + 356 * Math.min(1, need / REACTOR_OUTPUT)} y2="36" stroke="var(--red)" strokeWidth="1.5" />
        {Array.from({ length: REACTOR_OUTPUT / SHIELD_COST }, (_, i) => (i + 1) * SHIELD_COST).map((u) => (
          <line key={u} x1={12 + 356 * (u / REACTOR_OUTPUT)} y1="12" x2={12 + 356 * (u / REACTOR_OUTPUT)} y2="16" stroke="#4a5a50" strokeWidth="1" />
        ))}
      </svg>
      <p className={isolation >= need ? 'status-ok' : 'status-dim'} style={{ marginTop: 8 }}>{t.reactor.feedReading(isolation, need)}</p>
      <span className="status-dim" style={{ fontSize: 11 }}>{pct(isolation)} of {REACTOR_OUTPUT}u</span>
    </div>
  );
}

function KlaxonLamp() {
  const killswitch = useGame((s) => s.killswitch);
  const wave = useGame((s) => s.chapter3.wave);
  const t = useStrings();
  const state = killswitch === 'contained' ? 'contained' : killswitch === 'active' ? wave : 'stirring';
  const color = state === 'contained' ? 'var(--green)' : state === 'active' ? 'var(--red)' : state === 'warning' ? 'var(--amber)' : 'var(--dim)';
  const blinking = state === 'warning' || state === 'active';
  const text = { stirring: t.reactor.waveStirring, calm: t.reactor.waveCalm, warning: t.reactor.waveWarning, active: t.reactor.waveActive, contained: t.reactor.waveContained }[state];
  return (
    <div className="panel" style={{ borderColor: blinking ? color : 'var(--line)' }}>
      <h2>{t.reactor.waveTitle}</h2>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <svg viewBox="0 0 80 80" width="88" role="img" aria-label={t.reactor.waveAria}>
          <rect x="20" y="62" width="40" height="12" rx="2" fill="#131a16" stroke="#3a4a40" />
          <circle cx="40" cy="38" r="22" fill="#0c110e" stroke="#3a4a40" strokeWidth="3" />
          <circle className={blinking ? 'klaxon-lamp' : undefined} cx="40" cy="38" r="16" fill={color} opacity={state === 'calm' || state === 'stirring' ? 0.25 : 0.9} />
          {/* cage bars */}
          {[-14, -7, 0, 7, 14].map((dx) => <line key={dx} x1={40 + dx} y1="16" x2={40 + dx} y2="60" stroke="#3a4a40" strokeWidth="1.5" />)}
          <path d="M 18 38 A 22 22 0 0 1 62 38" fill="none" stroke="#3a4a40" strokeWidth="1.5" />
        </svg>
        <p className={state === 'active' ? 'status-bad' : state === 'warning' ? '' : state === 'contained' ? 'status-ok' : 'status-dim'} style={{ color: state === 'warning' ? 'var(--amber)' : undefined }}>{text}</p>
      </div>
    </div>
  );
}

function Quarantine() {
  const step = useGame((s) => s.chapter3.quarantineStep);
  const t = useStrings();
  return (
    <div className="panel">
      <h2>{t.reactor.quarantineTitle}</h2>
      <p className="status-dim">{t.reactor.quarantineDesc}</p>
      <svg viewBox="0 0 260 40" width="100%" style={{ maxWidth: 380, display: 'block' }} role="img" aria-label={`${t.reactor.quarantineAria}: ${t.reactor.segment(step, BUSES.length)}`}>
        <rect x="2" y="2" width="256" height="36" rx="5" fill="#0c110e" stroke="#3a4a40" strokeWidth="3" />
        {BUSES.map((_, i) => (
          <g key={i}>
            <rect x={12 + i * 60} y="10" width="52" height="20" rx="3" fill={i < step ? 'var(--green)' : '#080b09'} opacity={i < step ? 0.8 : 1} stroke="var(--line)" />
            <text x={38 + i * 60} y="24" textAnchor="middle" fontSize="9" fill={i < step ? '#0a0e0c' : 'var(--dim)'} letterSpacing="1">{i + 1}</text>
          </g>
        ))}
      </svg>
      <p className={step === BUSES.length ? 'status-ok' : 'status-dim'} style={{ marginTop: 8 }}>{t.reactor.segment(step, BUSES.length)}</p>
    </div>
  );
}

export function ReactorRoom() {
  const t = useStrings();
  return (
    <div className="scene">
      <div className="panel">
        <h2>{t.reactor.title}</h2>
        <p>{t.reactor.intro}</p>
      </div>
      <KlaxonLamp />
      <IsolationBank />
      <IsolationFeed />
      <Quarantine />
      <p className="status-dim">{t.reactor.next}</p>
    </div>
  );
}
