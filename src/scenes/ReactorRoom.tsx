import { useState } from 'react';
import { useGame } from '../ui/useGame';
import { useStrings } from '../ui/useLocale';
import { cutIsolation } from '../game/store';
import { nextShieldCost } from '../game/derived';
import { BUSES, REACTOR_OUTPUT, SHIELD_COST } from '../game/content';
import type { BusId } from '../game/types';
import { busSignal, threatPhase } from '../ui/machinery';
import reactorRoom from '../assets/reactor-room.webp';
import reactorRoomSmall from '../assets/reactor-room-small.webp';
import { playRelayTrip } from '../audio/sound';

function IsolationBank() {
  const state = useGame((s) => s);
  const { shielded } = state.chapter3;
  const isolation = state.powerAllocation.isolation;
  const need = nextShieldCost(state);
  const t = useStrings();
  const [refused, setRefused] = useState<BusId | null>(null);
  return (
    <div className="panel machine-panel isolation-bank">
      <div className="machine-serial"><span>ISOLATION / B-07</span><span>01—04</span></div>
      <h2>{t.reactor.bankTitle}</h2>
      <p className="status-dim">{t.reactor.bankDesc}</p>
      <div className="isolation-switches" role="group" aria-label={t.reactor.bankAria}>
        {BUSES.map((bus, i) => {
          const signal = busSignal(state, bus);
          const cut = shielded.includes(bus);
          return <div key={bus} className={`isolation-module bus-${signal}`}>
            <div className="isolation-label"><span>{t.reactor.bus[bus]}</span><i className="bus-command-lamp" aria-hidden="true" /></div>
            <button className="knife-switch" disabled={cut} aria-pressed={cut} aria-label={t.reactor.cutAria(t.reactor.bus[bus])}
              aria-describedby={`isolation-${bus}`} onClick={() => {
                const result = cutIsolation(bus);
                setRefused(result.ok ? null : bus);
                if (!result.ok) playRelayTrip();
              }}>
              <svg viewBox="0 0 100 140" aria-hidden="true">
                <rect x="5" y="4" width="90" height="132" rx="5" fill="var(--face-deep)" stroke="var(--steel)" />
                <path d="M26 18V110M74 18V110" stroke="var(--brass-lo)" strokeWidth="7" />
                <rect x="14" y="33" width="26" height="18" rx="2" fill="var(--brass-mid)" />
                <rect x="60" y="33" width="26" height="18" rx="2" fill="var(--brass-mid)" />
                <g className="isolation-blade" style={{ transform: cut ? 'rotate(54deg)' : 'rotate(0deg)', transformOrigin: '27px 98px' }}>
                  <path d="M27 102V40H76" stroke="var(--brass-hi)" strokeWidth="9" fill="none" />
                  <rect x="39" y="29" width="30" height="20" rx="4" fill="var(--steel-lo)" stroke="var(--steel-hi)" strokeWidth="2" />
                  <path d="M45 34H64M45 39H64M45 44H64" stroke="var(--steel)" />
                </g>
                <circle cx="27" cy="98" r="7" fill="var(--steel-mid)" stroke="var(--brass-hi)" strokeWidth="2" />
                <text x="75" y="123" textAnchor="middle" fontSize="9" fill="var(--steel-hi)">0{i+1}</text>
              </svg>
              <span aria-hidden={cut}>{cut ? '✓' : t.reactor.cut}</span>
            </button>
            <p id={`isolation-${bus}`} className="isolation-status">{cut ? t.reactor.shielded : signal === 'suppressed' ? t.reactor.suppressed : t.reactor.exposed}</p>
          </div>;
        })}
      </div>
      <p className="instrument-instructions">{t.reactor.commandsHint}</p>
      <div role="status">{refused && !shielded.includes(refused) && isolation < need && <p className="status-bad">{t.reactor.needPower(isolation, need)}</p>}</div>
    </div>
  );
}

function IsolationFeed() {
  const isolation = useGame((s) => s.powerAllocation.isolation);
  const need = useGame((s) => nextShieldCost(s));
  const t = useStrings();
  const allShielded = useGame((s) => s.chapter3.shielded.length === BUSES.length);
  return (
    <div className="panel machine-panel isolation-feed">
      <h2>{t.reactor.feedTitle}</h2>
      <p className="status-dim">{t.reactor.feedDesc}</p>
      <svg viewBox="0 0 380 44" width="100%" style={{ maxWidth: 560, display: 'block' }} role="img" aria-label={t.reactor.feedAria}>
        <rect x="4" y="4" width="372" height="36" rx="5" fill="var(--face)" stroke="var(--steel)" strokeWidth="3" />
        <rect x="12" y="12" width="356" height="20" rx="3" fill="var(--face-deep)" stroke="var(--line)" />
        <rect x="12" y="12" width={356 * Math.min(1, isolation / REACTOR_OUTPUT)} height="20" rx="3" fill="var(--amber)" opacity="0.75" style={{ transition: 'width 0.3s' }} />
        {/* demand hairline */}
        {!allShielded && <line x1={12 + 356 * Math.min(1, need / REACTOR_OUTPUT)} y1="8" x2={12 + 356 * Math.min(1, need / REACTOR_OUTPUT)} y2="36" stroke="var(--red)" strokeWidth="1.5" />}
        {Array.from({ length: REACTOR_OUTPUT / SHIELD_COST }, (_, i) => (i + 1) * SHIELD_COST).map((u) => (
          <line key={u} x1={12 + 356 * (u / REACTOR_OUTPUT)} y1="12" x2={12 + 356 * (u / REACTOR_OUTPUT)} y2="16" stroke="var(--steel-mid)" strokeWidth="1" />
        ))}
      </svg>
      <p className={allShielded || isolation >= need ? 'status-ok' : 'status-dim'} role="status">{allShielded ? t.reactor.allShielded : t.reactor.feedReading(isolation, need)}</p>
      <span className="status-dim" style={{ fontSize: 11 }}>{t.reactor.capacity(isolation, REACTOR_OUTPUT)}</span>
    </div>
  );
}

function KlaxonLamp() {
  const state = useGame(threatPhase);
  const t = useStrings();
  const color = state === 'contained' ? 'var(--green)' : state === 'active' ? 'var(--red)' : state === 'warning' ? 'var(--amber)' : 'var(--dim)';
  const blinking = state === 'warning' || state === 'active';
  const text = { stirring: t.reactor.waveStirring, calm: t.reactor.waveCalm, warning: t.reactor.waveWarning, active: t.reactor.waveActive, contained: t.reactor.waveContained }[state];
  return (
    <div className="panel machine-panel reactor-klaxon" style={{ borderColor: blinking ? color : 'var(--line)' }}>
      <h2>{t.reactor.waveTitle}</h2>
      <div className="klaxon-reading">
        <svg viewBox="0 0 80 80" width="88" role="img" aria-label={t.reactor.waveAria}>
          <rect x="20" y="62" width="40" height="12" rx="2" fill="var(--panel-solid)" stroke="var(--steel)" />
          <circle cx="40" cy="38" r="22" fill="var(--face)" stroke="var(--steel)" strokeWidth="3" />
          <circle className={blinking ? 'klaxon-lamp' : undefined} cx="40" cy="38" r="16" fill={color} opacity={state === 'calm' || state === 'stirring' ? 0.25 : 0.9} />
          {/* cage bars */}
          {[-14, -7, 0, 7, 14].map((dx) => <line key={dx} x1={40 + dx} y1="16" x2={40 + dx} y2="60" stroke="var(--steel)" strokeWidth="1.5" />)}
          <path d="M 18 38 A 22 22 0 0 1 62 38" fill="none" stroke="var(--steel)" strokeWidth="1.5" />
        </svg>
        <p role="status" className={state === 'active' ? 'status-bad' : state === 'warning' ? '' : state === 'contained' ? 'status-ok' : 'status-dim'} style={{ color: state === 'warning' ? 'var(--amber)' : undefined }}>{text}</p>
      </div>
    </div>
  );
}

function Quarantine() {
  const step = useGame((s) => s.chapter3.quarantineStep);
  const t = useStrings();
  return (
    <div className="panel machine-panel quarantine-console">
      <h2>{t.reactor.quarantineTitle}</h2>
      <p className="status-dim">{t.reactor.quarantineDesc}</p>
      <svg viewBox="0 0 260 40" width="100%" style={{ maxWidth: 380, display: 'block' }} role="img" aria-label={`${t.reactor.quarantineAria}: ${t.reactor.segment(step, BUSES.length)}`}>
        <rect x="2" y="2" width="256" height="36" rx="5" fill="var(--face)" stroke="var(--steel)" strokeWidth="3" />
        {BUSES.map((_, i) => (
          <g key={i}>
            <rect x={12 + i * 60} y="10" width="52" height="20" rx="3" fill={i < step ? 'var(--green)' : 'var(--face-deep)'} opacity={i < step ? 0.8 : 1} stroke="var(--line)" />
            <text x={38 + i * 60} y="24" textAnchor="middle" fontSize="9" fill={i < step ? 'var(--hull)' : 'var(--dim)'} letterSpacing="1">{i + 1}</text>
          </g>
        ))}
      </svg>
      <p role="status" className={step === BUSES.length ? 'status-ok' : 'status-dim'} style={{ marginTop: 8 }}>{t.reactor.segment(step, BUSES.length)}</p>
    </div>
  );
}

export function ReactorRoom() {
  const t = useStrings();
  const wave = useGame(threatPhase);
  const inspect = (id: string) => {
    const target = document.getElementById(id);
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: 'start' });
  };
  return (
    <div className={`scene machine-scene reactor-scene wave-${wave}`}>
      <header className="machine-heading"><div><span className="scene-eyebrow">{t.reactor.sector}</span><h1>{t.reactor.title}</h1></div>
        <span className="machine-state">{t.reactor.vesselLabel}</span>
      </header>
      <div className="reactor-panorama">
        <picture aria-hidden="true">
          <source media="(max-width: 900px)" srcSet={`${reactorRoomSmall} 960w, ${reactorRoom} 1672w`} sizes="100vw" />
          <img src={reactorRoom} width="1672" height="941" alt="" decoding="async" />
        </picture>
        <div className="reactor-heat" aria-hidden="true" />
        <span className="reactor-serial" aria-hidden="true">CMR / R-01</span>
        <p className="reactor-caption">{t.reactor.intro}</p>
      </div>
      <nav className="reactor-stations" aria-label={t.reactor.title}>
        {[
          ['reactor-bank', t.reactor.bankTitle],
          ['reactor-feed', t.reactor.feedTitle],
          ['reactor-quarantine', t.reactor.quarantineTitle],
        ].map(([id, label], i) => <button key={id} onClick={() => inspect(id)}><span aria-hidden="true">0{i + 1}</span><strong>{label}</strong><span aria-hidden="true">↘</span></button>)}
      </nav>
      <div className="reactor-instruments">
        <section id="reactor-bank" tabIndex={-1} aria-label={t.reactor.bankTitle}><IsolationBank /></section>
        <div className="reactor-readings">
          <KlaxonLamp />
          <section id="reactor-feed" tabIndex={-1} aria-label={t.reactor.feedTitle}><IsolationFeed /></section>
          <section id="reactor-quarantine" tabIndex={-1} aria-label={t.reactor.quarantineTitle}><Quarantine /></section>
        </div>
      </div>
      <p className="machine-next">{t.reactor.next}</p>
    </div>
  );
}
