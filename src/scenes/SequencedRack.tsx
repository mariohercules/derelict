import { useEffect, useRef, useState } from 'react';
import { useGame } from '../ui/useGame';
import { useStrings } from '../ui/useLocale';
import { ejectColumns, gameStore, loadColumn } from '../game/store';
import { rackCorrect } from '../game/derived';
import type { ColumnId } from '../game/types';

const COLUMNS: ColumnId[] = ['A', 'B', 'C', 'D'];
// Tray on the left (columns lying down), rack on the right (columns standing, filled left to right).
const TRAY_X = 16;
const TRAY_Y0 = 30;
const TRAY_DY = 26;
const RACK_X0 = 150;
const RACK_DX = 36;
const RACK_Y = 34;
const RACK_H = 96;

function LyingColumn({ x, y, tag }: { x: number; y: number; tag: ColumnId }) {
  return (
    <g>
      <rect x={x} y={y} width="96" height="18" rx="9" fill="url(#sr-column)" stroke="var(--steel)" />
      <rect x={x + 82} y={y} width="14" height="18" rx="7" fill="url(#sr-brass)" stroke="var(--brass-lo)" />
      <rect x={x + 6} y={y + 3} width="18" height="12" rx="2" fill="var(--panel-solid)" stroke="var(--line)" />
      <text x={x + 15} y={y + 12} textAnchor="middle" fontSize="8" fill="var(--text)" letterSpacing="1">{tag}</text>
      {[34, 50, 66].map((dx) => <line key={dx} x1={x + dx} y1={y + 3} x2={x + dx} y2={y + 15} stroke="var(--hull)" strokeWidth="1" opacity="0.6" />)}
    </g>
  );
}

function StandingColumn({ x, y, tag, lit }: { x: number; y: number; tag: ColumnId; lit: boolean }) {
  return (
    <g style={{ transition: 'opacity 0.3s' }}>
      <rect x={x} y={y} width="22" height={RACK_H} rx="11" fill="url(#sr-column-v)" stroke="var(--steel)" />
      <rect x={x} y={y} width="22" height="14" rx="7" fill="url(#sr-brass)" stroke="var(--brass-lo)" />
      <rect x={x + 4} y={y + RACK_H - 24} width="14" height="16" rx="2" fill="var(--panel-solid)" stroke="var(--line)" />
      <text x={x + 11} y={y + RACK_H - 12} textAnchor="middle" fontSize="8" fill={lit ? 'var(--green)' : 'var(--text)'} letterSpacing="1">{tag}</text>
      {[30, 46, 62].map((dy) => <line key={dy} x1={x + 3} y1={y + dy} x2={x + 19} y2={y + dy} stroke="var(--hull)" strokeWidth="1" opacity="0.6" />)}
    </g>
  );
}

export function SequencedRack() {
  const seated = useGame((s) => s.chapter3v.seated);
  const kernel = useGame((s) => s.chapter3.kernelSeated);
  const correct = useGame((s) => rackCorrect(s));
  const t = useStrings();
  const [tripped, setTripped] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);

  const load = (c: ColumnId) => {
    const before = gameStore.getState().chapter3v.seated.length;
    const r = loadColumn(c);
    const after = gameStore.getState().chapter3v.seated.length;
    if (!r.ok && before === 3 && after === 0) {
      setTripped(true);
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setTripped(false), 900);
    }
  };

  const inTray = COLUMNS.filter((c) => !seated.includes(c));
  const spin = seated.length / 4; // 0..1 — a quarter per loaded column
  // spin-up gauge: a 120° arc from 210° to 330°, needle at the fraction
  const gx = 262, gy = 178, gr = 24;
  const needleDeg = 210 + 120 * spin;
  const nx = gx + gr * Math.cos((needleDeg * Math.PI) / 180);
  const ny = gy + gr * Math.sin((needleDeg * Math.PI) / 180);
  const status = kernel || correct ? t.vault.seqLive : tripped ? t.vault.seqTripped : t.vault.seqWaiting(seated.length);

  return (
    <div className="panel">
      <h2>{t.vault.rackTitle}</h2>
      <p className="status-dim">{t.vault.seqDesc}</p>
      <svg viewBox="0 0 320 210" width="100%" style={{ maxWidth: 480, display: 'block' }} role="img" aria-label={t.vault.seqAria(seated.length)}>
        <defs>
          <linearGradient id="sr-column" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--steel)" />
            <stop offset="50%" stopColor="var(--steel-lo)" />
            <stop offset="100%" stopColor="#0f1512" />
          </linearGradient>
          <linearGradient id="sr-column-v" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--steel)" />
            <stop offset="50%" stopColor="var(--steel-lo)" />
            <stop offset="100%" stopColor="#0f1512" />
          </linearGradient>
          <linearGradient id="sr-brass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--brass-hi)" />
            <stop offset="100%" stopColor="var(--brass-lo)" />
          </linearGradient>
        </defs>
        {/* chassis */}
        <rect x="4" y="4" width="312" height="202" rx="6" fill="var(--face)" stroke="var(--steel)" strokeWidth="3" />
        <rect x="12" y="12" width="296" height="186" rx="4" fill="var(--face-deep)" stroke="var(--line)" />
        {/* tray */}
        <rect x={TRAY_X - 6} y={TRAY_Y0 - 10} width="116" height="126" rx="4" fill="var(--panel-solid)" stroke="var(--line)" />
        <text x={TRAY_X + 52} y={TRAY_Y0 - 14} textAnchor="middle" fontSize="7" fill="var(--dim)" letterSpacing="2">{t.vault.trayLabel}</text>
        {COLUMNS.map((c, i) => {
          const y = TRAY_Y0 + i * TRAY_DY;
          return inTray.includes(c)
            ? <LyingColumn key={c} x={TRAY_X + 4} y={y} tag={c} />
            : <rect key={c} x={TRAY_X + 4} y={y} width="96" height="18" rx="9" fill="none" stroke="var(--line)" strokeDasharray="3 3" />;
        })}
        {/* rack: four cradles, filled left to right in loading order */}
        <rect x={RACK_X0 - 10} y={RACK_Y - 12} width={RACK_DX * 4 + 10} height={RACK_H + 26} rx="4" fill="var(--panel-solid)" stroke="var(--line)" />
        {[0, 1, 2, 3].map((i) => {
          const x = RACK_X0 + i * RACK_DX;
          const tag = seated[i];
          return (
            <g key={i}>
              <line x1={x - 4} y1={RACK_Y} x2={x - 4} y2={RACK_Y + RACK_H} stroke="var(--line)" strokeWidth="2" />
              <line x1={x + 26} y1={RACK_Y} x2={x + 26} y2={RACK_Y + RACK_H} stroke="var(--line)" strokeWidth="2" />
              <rect x={x + 5} y={RACK_Y + RACK_H + 2} width="12" height="6" fill="var(--panel-solid)" stroke="var(--line)" />
              {/* cradle lamp: all four together, or not at all */}
              <circle cx={x + 11} cy={RACK_Y - 4} r="4" fill={correct ? 'var(--green)' : 'var(--panel-solid)'} stroke="var(--steel)" strokeWidth="1.5" />
              {correct && <circle cx={x + 11} cy={RACK_Y - 4} r="7" fill="var(--green)" opacity="0.18" />}
              {tag
                ? <StandingColumn x={x} y={RACK_Y} tag={tag} lit={correct} />
                : <rect x={x} y={RACK_Y} width="22" height={RACK_H} rx="11" fill="none" stroke="var(--line)" strokeDasharray="3 3" />}
              <text x={x + 11} y={RACK_Y + RACK_H + 20} textAnchor="middle" fontSize="7" fill="var(--dim)">{i + 1}</text>
            </g>
          );
        })}
        {/* spin-up gauge */}
        <circle cx={gx} cy={gy} r={gr + 6} fill="var(--face)" stroke="var(--steel)" strokeWidth="2" />
        {[0, 1, 2, 3, 4].map((k) => {
          const deg = 210 + 30 * k;
          const x1 = gx + (gr - 2) * Math.cos((deg * Math.PI) / 180), y1 = gy + (gr - 2) * Math.sin((deg * Math.PI) / 180);
          const x2 = gx + (gr - 7) * Math.cos((deg * Math.PI) / 180), y2 = gy + (gr - 7) * Math.sin((deg * Math.PI) / 180);
          return <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--steel-hi)" strokeWidth="1.5" />;
        })}
        <line x1={gx} y1={gy} x2={nx} y2={ny} stroke="var(--amber)" strokeWidth="2" style={{ transition: 'all 0.4s' }} />
        <circle cx={gx} cy={gy} r="3" fill="var(--steel-lo)" stroke="var(--steel)" />
        <text x={gx} y={gy + gr + 12} textAnchor="middle" fontSize="6" fill="var(--dim)" letterSpacing="1.5">{t.vault.spinGauge}</text>
        {/* trip lamp */}
        <circle cx="290" cy="26" r="6" fill={tripped ? 'var(--red)' : 'var(--panel-solid)'} stroke="var(--steel)" strokeWidth="1.5" style={{ transition: 'fill 0.2s' }} />
        <text x="290" y="42" textAnchor="middle" fontSize="6" fill="var(--dim)" letterSpacing="1.5">{t.vault.tripLamp}</text>
      </svg>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 8, marginTop: 10, maxWidth: 480 }}>
        {COLUMNS.map((c) => (
          <button key={c} onClick={() => load(c)} disabled={kernel || seated.includes(c)} aria-label={t.vault.loadAria(c)}>{t.vault.load(c)}</button>
        ))}
        <button onClick={() => ejectColumns()} disabled={kernel || seated.length === 0} aria-label={t.vault.eject} style={{ borderColor: 'var(--brass)' }}>{t.vault.eject}</button>
      </div>
      <p className={correct ? 'status-ok' : tripped ? 'status-bad' : 'status-dim'} style={{ marginTop: 10 }}>{status}</p>
    </div>
  );
}
