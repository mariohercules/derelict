import { useEffect, useState } from 'react';
import { useGame } from '../ui/useGame';
import { useStrings } from '../ui/useLocale';
import { holdHandle, seatColumn, seatKernel } from '../game/store';
import { rackCorrect } from '../game/derived';
import type { ColumnId } from '../game/types';

const CYCLE: (ColumnId | null)[] = [null, 'A', 'B', 'C', 'D'];
const CRADLE_H = 34;
const Y0 = 22;

function Column({ x, y, tag, lit }: { x: number; y: number; tag: string; lit: boolean }) {
  return (
    <g>
      <rect x={x} y={y + 5} width="150" height="24" rx="12" fill="url(#cv-column)" stroke="var(--steel)" />
      <rect x={x + 132} y={y + 5} width="18" height="24" rx="9" fill="url(#cv-brass)" stroke="var(--brass-lo)" />
      <rect x={x + 8} y={y + 10} width="22" height="14" rx="2" fill="var(--panel-solid)" stroke="var(--line)" />
      <text x={x + 19} y={y + 20.5} textAnchor="middle" fontSize="9" fill={lit ? 'var(--green)' : 'var(--text)'} letterSpacing="1">{tag}</text>
      {[40, 60, 80, 100].map((dx) => <line key={dx} x1={x + dx} y1={y + 9} x2={x + dx} y2={y + 25} stroke="var(--hull)" strokeWidth="1" opacity="0.6" />)}
    </g>
  );
}

function Rack() {
  const rack = useGame((s) => s.chapter3.rack);
  const kernel = useGame((s) => s.chapter3.kernelSeated);
  const correct = useGame((s) => rackCorrect(s));
  const t = useStrings();
  const cycle = (slot: 0 | 1 | 2 | 3) => {
    const i = CYCLE.indexOf(rack[slot]);
    seatColumn(slot, CYCLE[(i + 1) % CYCLE.length]);
  };
  const allSeated = rack.every((c) => c !== null);
  return (
    <div className="panel">
      <h2>{t.vault.rackTitle}</h2>
      <p className="status-dim">{t.vault.rackDesc}</p>
      <svg viewBox="0 0 300 210" width="100%" style={{ maxWidth: 440, display: 'block' }} role="img" aria-label={t.vault.rackAria}>
        <defs>
          <linearGradient id="cv-column" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--steel)" />
            <stop offset="50%" stopColor="var(--steel-lo)" />
            <stop offset="100%" stopColor="#0f1512" />
          </linearGradient>
          <linearGradient id="cv-brass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--brass-hi)" />
            <stop offset="100%" stopColor="var(--brass-lo)" />
          </linearGradient>
        </defs>
        {/* chassis */}
        <rect x="4" y="4" width="292" height="202" rx="6" fill="var(--face)" stroke="var(--steel)" strokeWidth="3" />
        <rect x="12" y="12" width="276" height="186" rx="4" fill="var(--face-deep)" stroke="var(--line)" />
        {[0, 1, 2, 3, 4].map((i) => {
          const y = Y0 + i * CRADLE_H;
          const isKernel = i === 4;
          const tag = isKernel ? (kernel ? 'K' : null) : rack[i];
          const lampOn = correct; // all four lamps, together or not at all — never per cradle
          const lampColor = isKernel ? (kernel ? 'var(--green)' : 'var(--amber)') : 'var(--green)';
          return (
            <g key={i}>
              {/* guide rails + socket */}
              <line x1="30" y1={y + 4} x2="30" y2={y + 30} stroke="var(--line)" strokeWidth="2" />
              <line x1="230" y1={y + 4} x2="230" y2={y + 30} stroke="var(--line)" strokeWidth="2" />
              <rect x="232" y={y + 11} width="8" height="12" fill="var(--panel-solid)" stroke="var(--line)" />
              {/* cradle lamp */}
              <circle cx="262" cy={y + 17} r="5" fill={lampOn ? lampColor : 'var(--panel-solid)'} stroke="var(--steel)" strokeWidth="1.5" />
              {lampOn && <circle cx="262" cy={y + 17} r="9" fill={lampColor} opacity="0.18" />}
              <text x="278" y={y + 20} textAnchor="middle" fontSize="8" fill="var(--dim)">{isKernel ? 'K' : i + 1}</text>
              {tag ? <Column x={40} y={y} tag={tag} lit={lampOn} /> : (
                <rect x="40" y={y + 5} width="150" height="24" rx="12" fill="none" stroke="var(--line)" strokeDasharray="3 3" />
              )}
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8, marginTop: 10, maxWidth: 440 }}>
        {([0, 1, 2, 3] as const).map((slot) => (
          <button key={slot} onClick={() => cycle(slot)} disabled={kernel} aria-label={t.vault.cycleAria(slot + 1)}>
            {t.vault.cradle(slot + 1)}: {rack[slot] ?? t.vault.empty}
          </button>
        ))}
      </div>
      {allSeated && (
        <p className={correct ? 'status-ok' : 'status-dim'} style={{ marginTop: 10 }}>{correct ? t.vault.rackRight : t.vault.rackWrong}</p>
      )}
    </div>
  );
}

function FragmentConsole() {
  const stage = useGame((s) => s.chapter3.fragmentStage);
  const cache = useGame((s) => s.chapter3.cacheRead);
  const t = useStrings();
  return (
    <div className="panel">
      <h2>{t.vault.consoleTitle}</h2>
      <p className="status-dim">{t.vault.consoleDesc}</p>
      <svg viewBox="0 0 300 40" width="100%" style={{ maxWidth: 440, display: 'block' }} role="img" aria-label={`${t.vault.consoleAria}: ${t.vault.stage(stage)}`}>
        <rect x="2" y="2" width="296" height="36" rx="5" fill="var(--face)" stroke="var(--steel)" strokeWidth="3" />
        {[0, 1, 2].map((i) => (
          <rect key={i} x={14 + i * 62} y="10" width="52" height="20" rx="3" fill={i < stage ? 'var(--green)' : 'var(--face-deep)'} opacity={i < stage ? 0.8 : 1} stroke="var(--line)" />
        ))}
        <rect x="214" y="10" width="72" height="20" rx="3" fill={cache ? 'var(--amber)' : 'var(--face-deep)'} opacity={cache ? 0.85 : 1} stroke="var(--line)" />
        <text x="250" y="24" textAnchor="middle" fontSize="9" fill={cache ? 'var(--hull)' : 'var(--dim)'} letterSpacing="2">{t.vault.cacheLamp}</text>
      </svg>
      <p className="status-dim" style={{ marginTop: 8 }}>{t.vault.stage(stage)}</p>
    </div>
  );
}

function KernelCradle() {
  const correct = useGame((s) => rackCorrect(s));
  const ritual = useGame((s) => s.ritual);
  const t = useStrings();
  const armed = ritual.active === 'restore' && ritual.phase === 'armed';
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [refused, setRefused] = useState(false);
  useEffect(() => {
    if (!armed) return;
    setNowTick(Date.now());
    const timer = setInterval(() => setNowTick(Date.now()), 250);
    return () => clearInterval(timer);
  }, [armed]);
  const secondsLeft = armed && ritual.endsAt ? Math.max(0, Math.ceil((ritual.endsAt - nowTick) / 1000)) : null;
  const elapsed = armed && secondsLeft === 0;
  if (!correct) return null;
  return (
    <div className="panel" style={{ borderColor: armed ? 'var(--amber)' : 'var(--line)' }}>
      <h2>{t.vault.kernelTitle}</h2>
      <p className="status-dim">{t.vault.kernelDesc}</p>
      {(!armed || elapsed) && (
        <button onClick={() => setRefused(!seatKernel().ok)} style={{ borderColor: 'var(--amber)' }}>{t.vault.seatKernel}</button>
      )}
      {refused && !armed && <p className="status-dim" style={{ marginTop: 8 }}>{t.vault.anotherRitual}</p>}
      {armed && (
        <>
          <p className="status-ok">{t.vault.kernelSeated}</p>
          {elapsed ? (
            <p className="status-dim" style={{ marginTop: 8 }}>{t.vault.windowElapsed}</p>
          ) : (
            <>
              <p className="status-bad blink" style={{ fontSize: 24 }}>T-{secondsLeft}s</p>
              <p>{t.vault.twoOp}</p>
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
        {ritual.held && armed && !elapsed ? t.vault.leverHolding : t.vault.leverHold}
      </button>
    </div>
  );
}

export function CoreVault() {
  const t = useStrings();
  return (
    <div className="scene">
      <div className="panel">
        <h2>{t.vault.title}</h2>
        <p>{t.vault.intro}</p>
      </div>
      <Rack />
      <FragmentConsole />
      <KernelCradle />
      <p className="status-dim">{t.vault.next}</p>
    </div>
  );
}
