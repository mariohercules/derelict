import { useState } from 'react';
import { useGame } from '../ui/useGame';
import { useStrings } from '../ui/useLocale';
import { liftCrate, moveCrane } from '../game/store';
import { secretsFor, slotLabel } from '../game/secrets';

const CELL = 74;
const X0 = 46;
const Y0 = 34;

function CraneDeck() {
  const craneAt = useGame((s) => s.chapter2.craneAt);
  const lifted = useGame((s) => s.chapter2.crateLifted);
  const t = useStrings();
  const [last, setLast] = useState<string | null>(null);
  const cx = X0 + craneAt.col * CELL + CELL / 2;
  const cy = Y0 + craneAt.row * CELL + CELL / 2;
  return (
    <div className="panel">
      <h2>{t.cargo.craneTitle}</h2>
      <p className="status-dim">{t.cargo.craneDesc}</p>
      <svg viewBox="0 0 320 270" width="100%" style={{ maxWidth: 440, display: 'block' }} role="img"
        aria-label={`${t.cargo.gridAria} — ${t.cargo.slotAria(slotLabel(craneAt))}`}>
        <defs>
          <linearGradient id="cb-steel" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2c3630" />
            <stop offset="100%" stopColor="#151c18" />
          </linearGradient>
          <pattern id="cb-hazard" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="4" height="8" fill="var(--brass)" />
            <rect x="4" width="4" height="8" fill="#1a1410" />
          </pattern>
        </defs>
        {/* deck plate */}
        <rect x="4" y="4" width="312" height="262" rx="6" fill="var(--face)" stroke="var(--line)" strokeWidth="2" />
        {/* rails */}
        <rect x={X0 - 14} y={Y0 - 12} width="6" height={CELL * 3 + 24} fill="var(--steel)" />
        <rect x={X0 + CELL * 3 + 8} y={Y0 - 12} width="6" height={CELL * 3 + 24} fill="var(--steel)" />
        {/* crates */}
        {[0, 1, 2].map((row) => [0, 1, 2].map((col) => {
          const x = X0 + col * CELL;
          const y = Y0 + row * CELL;
          // the crate is only ever visually distinct once the crane has lifted it —
          // the scene never reads the secret slot, only the crane's own current position
          const isQ = lifted && craneAt.row === row && craneAt.col === col;
          // deterministic per-crate wear, keyed only on grid position — never on the secret
          const idx = row * 3 + col;
          const scuffOpacity = 0.12 + 0.05 * ((idx * 5) % 4);
          const insetOpacity = 0.4 + 0.06 * ((idx * 3) % 5);
          const scuffOffset = (idx % 3) * 4;
          return (
            <g key={`${row}${col}`} role="group" aria-label={t.cargo.slotAria(slotLabel({ row, col }))}>
              <rect x={x + 4} y={y + 4} width={CELL - 8} height={CELL - 8} rx="4"
                fill={isQ ? 'var(--hull)' : 'url(#cb-steel)'} stroke={isQ ? 'var(--line)' : 'var(--steel-mid)'} strokeWidth="1.5"
                strokeDasharray={isQ ? '3 3' : undefined} />
              {!isQ && (
                <>
                  <rect x={x + 10} y={y + 10} width={CELL - 20} height="6" fill="var(--hull)" opacity={insetOpacity} />
                  <line x1={x + 12 + scuffOffset} y1={y + CELL - 14} x2={x + 30 + scuffOffset} y2={y + CELL - 20}
                    stroke="var(--steel-hi)" strokeWidth="1" opacity={scuffOpacity} />
                  <line x1={x + CELL - 30} y1={y + 20 - scuffOffset} x2={x + CELL - 14} y2={y + 26 - scuffOffset}
                    stroke="var(--hull)" strokeWidth="1.5" opacity={scuffOpacity} />
                  <text x={x + CELL / 2} y={y + CELL / 2 + 4} textAnchor="middle" fontSize="11" fill="var(--steel-hi)" letterSpacing="2">{slotLabel({ row, col })}</text>
                </>
              )}
              {isQ && <rect x={x + 8} y={y + CELL - 16} width={CELL - 16} height="6" fill="url(#cb-hazard)" />}
            </g>
          );
        }))}
        {/* gantry: beam across the crane's row, trolley + hook at its column */}
        <g style={{ transition: 'transform 0.35s ease', transform: `translate(0px, ${cy - (Y0 + CELL / 2)}px)` }}>
          <rect x={X0 - 14} y={Y0 + CELL / 2 - 4} width={CELL * 3 + 28} height="8" fill="var(--steel-hi)" opacity="0.9" />
        </g>
        <g style={{ transition: 'transform 0.35s ease', transform: `translate(${cx - (X0 + CELL / 2)}px, ${cy - (Y0 + CELL / 2)}px)` }}>
          <rect x={X0 + CELL / 2 - 12} y={Y0 + CELL / 2 - 10} width="24" height="20" rx="3" fill="var(--amber)" />
          <line x1={X0 + CELL / 2} y1={Y0 + CELL / 2 + 10} x2={X0 + CELL / 2} y2={Y0 + CELL / 2 + 26} stroke="var(--brass)" strokeWidth="2" />
          <path d={`M ${X0 + CELL / 2 - 6} ${Y0 + CELL / 2 + 26} q 6 10 12 0`} fill="none" stroke="var(--brass)" strokeWidth="2.5" />
        </g>
      </svg>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: 6, justifyContent: 'start', marginTop: 10 }}>
        <span />
        <button onClick={() => moveCrane('up')} disabled={lifted} aria-label={t.cargo.up}>{t.cargo.up}</button>
        <span />
        <button onClick={() => moveCrane('left')} disabled={lifted} aria-label={t.cargo.left}>{t.cargo.left}</button>
        <button onClick={() => setLast(liftCrate().ok ? 'ok' : 'wrong')} disabled={lifted} style={{ borderColor: 'var(--amber)' }} aria-label={t.cargo.lift}>{t.cargo.lift}</button>
        <button onClick={() => moveCrane('right')} disabled={lifted} aria-label={t.cargo.right}>{t.cargo.right}</button>
        <span />
        <button onClick={() => moveCrane('down')} disabled={lifted} aria-label={t.cargo.down}>{t.cargo.down}</button>
        <span />
      </div>
      {lifted ? (
        <p className="status-ok" style={{ marginTop: 10 }}>{t.cargo.lifted}</p>
      ) : last === 'wrong' ? (
        <p className="status-dim" style={{ marginTop: 10 }}>{t.cargo.wrongCrate}</p>
      ) : null}
    </div>
  );
}

function HullFragment() {
  const lifted = useGame((s) => s.chapter2.crateLifted);
  const analyzed = useGame((s) => s.chapter2.sampleAnalyzed);
  const seed = useGame((s) => s.seed);
  const t = useStrings();
  if (!lifted) return null;
  const digits = secretsFor(seed).registryFragment;
  return (
    <div className="panel">
      <h2>{t.cargo.fragmentTitle}</h2>
      <p className="status-dim">{t.cargo.fragmentDesc}</p>
      <svg viewBox="0 0 320 130" width="100%" style={{ maxWidth: 480, display: 'block' }} role="img" aria-label={t.cargo.fragmentAria}>
        <defs>
          <linearGradient id="cb-plate" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3a4038" />
            <stop offset="60%" stopColor="#22281f" />
            <stop offset="100%" stopColor="#141813" />
          </linearGradient>
          <radialGradient id="cb-scorch" cx="0.85" cy="0.3" r="0.6">
            <stop offset="0%" stopColor="#000" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path d="M 20 30 L 250 14 L 300 60 L 280 118 L 60 122 L 14 90 Z" fill="url(#cb-plate)" stroke="#5a6a60" strokeWidth="2" />
        {[[70, 40], [120, 48], [190, 30], [230, 100], [90, 100]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.5" fill="var(--hull)" stroke="var(--steel-hi)" strokeWidth="0.75" />
        ))}
        <text x="60" y="66" fontSize="20" fill="var(--parchment)" letterSpacing="4" fontFamily="ui-monospace, monospace">ISV KES</text>
        <text x="168" y="66" fontSize="20" fill="var(--parchment)" letterSpacing="4" fontFamily="ui-monospace, monospace" opacity="0.22">▮</text>
        <text x="192" y="66" fontSize="20" fill="var(--parchment)" letterSpacing="4" fontFamily="ui-monospace, monospace">REL</text>
        <text x="60" y="98" fontSize="16" fill="var(--parchment)" letterSpacing="3" fontFamily="ui-monospace, monospace">REG</text>
        <text x="112" y="98" fontSize="16" fill="var(--parchment)" letterSpacing="3" fontFamily="ui-monospace, monospace" opacity="0.22">▮▮</text>
        <text x="160" y="98" fontSize="16" fill="var(--amber)" letterSpacing="5" fontFamily="ui-monospace, monospace">{digits}</text>
        <path d="M 250 14 L 300 60 L 280 118 L 200 100 Z" fill="url(#cb-scorch)" />
      </svg>
      <p className={analyzed ? 'status-ok' : 'status-dim'} style={{ marginTop: 10 }}>{analyzed ? t.cargo.analyzed : t.cargo.readOut}</p>
      {analyzed && <p className="status-ok blink">{t.cargo.lowerDeck}</p>}
    </div>
  );
}

export function CargoBay() {
  const t = useStrings();
  return (
    <div className="scene">
      <div className="panel">
        <h2>{t.cargo.title}</h2>
        <p>{t.cargo.intro}</p>
      </div>
      <CraneDeck />
      <HullFragment />
    </div>
  );
}
