import { useState } from 'react';
import { useGame } from '../ui/useGame';
import { useStrings } from '../ui/useLocale';
import { gameStore, liftCrate, lowerCrate, moveCrane } from '../game/store';
import { slotLabel } from '../game/secrets';

const CELL = 74;
const X0 = 46;
const Y0 = 34;
// The upper crate of a two-high slot sits up and back — a light isometric lift.
const TIER_DX = -5;
const TIER_DY = -10;

type Note = 'wrong' | 'pallet' | 'holding' | 'full' | 'parked' | null;

export function StackedDeck() {
  const craneAt = useGame((s) => s.chapter2.craneAt);
  const lifted = useGame((s) => s.chapter2.crateLifted);
  const held = useGame((s) => s.chapter2v.held);
  const tiers = useGame((s) => s.chapter2v.tiers);
  const t = useStrings();
  const [note, setNote] = useState<Note>(null);
  const cx = X0 + craneAt.col * CELL + CELL / 2;
  const cy = Y0 + craneAt.row * CELL + CELL / 2;

  const lift = () => {
    const wasHeld = held;
    const r = liftCrate();
    const s = gameStore.getState();
    if (s.chapter2.crateLifted) setNote(null);
    else if (r.ok && s.chapter2v.held) setNote('pallet');
    else if (!r.ok && wasHeld) setNote('holding');
    else setNote('wrong');
  };
  const lower = () => setNote(lowerCrate().ok ? 'parked' : 'full');
  const move = (dir: 'up' | 'down' | 'left' | 'right') => { moveCrane(dir); if (note !== 'pallet') setNote(null); };

  return (
    <div className="panel">
      <h2>{t.cargo.craneTitle}</h2>
      <p className="status-dim">{t.cargo.stackedDesc}</p>
      <svg viewBox="0 0 320 270" width="100%" style={{ maxWidth: 440, display: 'block' }} role="img"
        aria-label={`${t.cargo.stackedGridAria} — ${t.cargo.slotAria(slotLabel(craneAt))}, ${t.cargo.tierAria(tiers[craneAt.row * 3 + craneAt.col])}`}>
        <defs>
          <linearGradient id="sd-steel" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2c3630" />
            <stop offset="100%" stopColor="#151c18" />
          </linearGradient>
          <linearGradient id="sd-steel-up" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3a463f" />
            <stop offset="100%" stopColor="#1e2721" />
          </linearGradient>
          <pattern id="sd-hazard" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="4" height="8" fill="var(--brass)" />
            <rect x="4" width="4" height="8" fill="#1a1410" />
          </pattern>
        </defs>
        {/* deck plate */}
        <rect x="4" y="4" width="312" height="262" rx="6" fill="var(--face)" stroke="var(--line)" strokeWidth="2" />
        {/* rails */}
        <rect x={X0 - 14} y={Y0 - 12} width="6" height={CELL * 3 + 24} fill="var(--steel)" />
        <rect x={X0 + CELL * 3 + 8} y={Y0 - 12} width="6" height={CELL * 3 + 24} fill="var(--steel)" />
        {/* hook lamp on the crane housing */}
        <g>
          <rect x="246" y="8" width="64" height="16" rx="3" fill="var(--face-deep)" stroke="var(--steel)" strokeWidth="1.5" />
          <circle cx="256" cy="16" r="3.5" fill={held ? 'var(--amber)' : 'var(--face)'} stroke="var(--steel-hi)" strokeWidth="0.75" />
          <text x="284" y="19" textAnchor="middle" fontSize="7" letterSpacing="1.5" fill="var(--parchment)" opacity="0.8">{t.cargo.hookLamp}</text>
        </g>
        {/* crates: bottom tier, then the upper crate of a stacked slot */}
        {[0, 1, 2].map((row) => [0, 1, 2].map((col) => {
          const x = X0 + col * CELL;
          const y = Y0 + row * CELL;
          const idx = row * 3 + col;
          // visually distinct only once the crane has lifted the container here —
          // the scene never reads the secret slot, only the crane's own position
          const isQ = lifted && craneAt.row === row && craneAt.col === col;
          // deterministic per-crate wear, keyed only on grid position — never on the secret
          const scuffOpacity = 0.12 + 0.05 * ((idx * 5) % 4);
          const insetOpacity = 0.4 + 0.06 * ((idx * 3) % 5);
          const scuffOffset = (idx % 3) * 4;
          const stacked = tiers[idx] === 2;
          return (
            <g key={`${row}${col}`} role="group" aria-label={`${t.cargo.slotAria(slotLabel({ row, col }))}, ${t.cargo.tierAria(tiers[idx])}`}>
              <rect x={x + 4} y={y + 4} width={CELL - 8} height={CELL - 8} rx="4"
                fill={isQ ? 'var(--hull)' : 'url(#sd-steel)'} stroke={isQ ? 'var(--line)' : 'var(--steel-mid)'} strokeWidth="1.5"
                strokeDasharray={isQ ? '3 3' : undefined} />
              {!isQ && (
                <>
                  <rect x={x + 10} y={y + 10} width={CELL - 20} height="6" fill="var(--hull)" opacity={insetOpacity} />
                  <line x1={x + 12 + scuffOffset} y1={y + CELL - 14} x2={x + 30 + scuffOffset} y2={y + CELL - 20}
                    stroke="var(--steel-hi)" strokeWidth="1" opacity={scuffOpacity} />
                  <line x1={x + CELL - 30} y1={y + 20 - scuffOffset} x2={x + CELL - 14} y2={y + 26 - scuffOffset}
                    stroke="var(--hull)" strokeWidth="1.5" opacity={scuffOpacity} />
                  {!stacked && (
                    <text x={x + CELL / 2} y={y + CELL / 2 + 4} textAnchor="middle" fontSize="11" fill="var(--steel-hi)" letterSpacing="2">{slotLabel({ row, col })}</text>
                  )}
                </>
              )}
              {isQ && <rect x={x + 8} y={y + CELL - 16} width={CELL - 16} height="6" fill="url(#sd-hazard)" />}
              {stacked && (
                <g style={{ transition: 'opacity 0.3s' }}>
                  {/* side face of the upper crate, then its top */}
                  <path d={`M ${x + 4} ${y + CELL - 4} L ${x + 4 + TIER_DX} ${y + CELL - 4 + TIER_DY} L ${x + CELL - 4 + TIER_DX} ${y + CELL - 4 + TIER_DY} L ${x + CELL - 4} ${y + CELL - 4} Z`}
                    fill="var(--steel-lo)" stroke="var(--steel-mid)" strokeWidth="1" />
                  <rect x={x + 4 + TIER_DX} y={y + 4 + TIER_DY} width={CELL - 8} height={CELL - 8} rx="4"
                    fill="url(#sd-steel-up)" stroke="var(--steel-hi)" strokeWidth="1.5" />
                  <rect x={x + 10 + TIER_DX} y={y + 10 + TIER_DY} width={CELL - 20} height="6" fill="var(--hull)" opacity={insetOpacity} />
                  <text x={x + CELL / 2 + TIER_DX} y={y + CELL / 2 + 4 + TIER_DY} textAnchor="middle" fontSize="11" fill="var(--steel-hi)" letterSpacing="2">{slotLabel({ row, col })}</text>
                  <text x={x + CELL / 2 + TIER_DX} y={y + CELL - 10 + TIER_DY} textAnchor="middle" fontSize="6" fill="var(--parchment)" opacity="0.6" letterSpacing="1">×2</text>
                </g>
              )}
            </g>
          );
        }))}
        {/* gantry: beam across the crane's row, trolley + hook at its column, the carried crate when held */}
        <g style={{ transition: 'transform 0.35s ease', transform: `translate(0px, ${cy - (Y0 + CELL / 2)}px)` }}>
          <rect x={X0 - 14} y={Y0 + CELL / 2 - 4} width={CELL * 3 + 28} height="8" fill="var(--steel-hi)" opacity="0.9" />
        </g>
        <g style={{ transition: 'transform 0.35s ease', transform: `translate(${cx - (X0 + CELL / 2)}px, ${cy - (Y0 + CELL / 2)}px)` }}>
          <rect x={X0 + CELL / 2 - 12} y={Y0 + CELL / 2 - 10} width="24" height="20" rx="3" fill="var(--amber)" />
          <line x1={X0 + CELL / 2} y1={Y0 + CELL / 2 + 10} x2={X0 + CELL / 2} y2={Y0 + CELL / 2 + 26} stroke="var(--brass)" strokeWidth="2" />
          <path d={`M ${X0 + CELL / 2 - 6} ${Y0 + CELL / 2 + 26} q 6 10 12 0`} fill="none" stroke="var(--brass)" strokeWidth="2.5" />
          {held && (
            <rect x={X0 + CELL / 2 - 16} y={Y0 + CELL / 2 + 30} width="32" height="18" rx="3" fill="url(#sd-steel-up)" stroke="var(--steel-hi)" strokeWidth="1.5" />
          )}
        </g>
      </svg>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: 6, justifyContent: 'start', marginTop: 10 }}>
        <span />
        <button onClick={() => move('up')} disabled={lifted} aria-label={t.cargo.up}>{t.cargo.up}</button>
        <span />
        <button onClick={() => move('left')} disabled={lifted} aria-label={t.cargo.left}>{t.cargo.left}</button>
        <button onClick={lift} disabled={lifted || held} style={{ borderColor: 'var(--amber)' }} aria-label={t.cargo.lift}>{t.cargo.lift}</button>
        <button onClick={() => move('right')} disabled={lifted} aria-label={t.cargo.right}>{t.cargo.right}</button>
        <span />
        <button onClick={() => move('down')} disabled={lifted} aria-label={t.cargo.down}>{t.cargo.down}</button>
        <span />
        <span />
        <button onClick={lower} disabled={lifted || !held} style={{ borderColor: 'var(--brass)' }} aria-label={t.cargo.lower}>{t.cargo.lower}</button>
        <span />
      </div>
      {lifted ? (
        <p className="status-ok" style={{ marginTop: 10 }}>{t.cargo.lifted}</p>
      ) : note === 'pallet' ? (
        <p className="status-dim" style={{ marginTop: 10 }}>{t.cargo.palletUp}</p>
      ) : note === 'holding' ? (
        <p className="status-dim" style={{ marginTop: 10 }}>{t.cargo.holdingOne}</p>
      ) : note === 'full' ? (
        <p className="status-dim" style={{ marginTop: 10 }}>{t.cargo.slotFull}</p>
      ) : note === 'parked' ? (
        <p className="status-dim" style={{ marginTop: 10 }}>{t.cargo.parked}</p>
      ) : note === 'wrong' ? (
        <p className="status-dim" style={{ marginTop: 10 }}>{t.cargo.wrongCrate}</p>
      ) : null}
    </div>
  );
}
