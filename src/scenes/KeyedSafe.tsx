import { useEffect, useRef, useState } from 'react';
import { useGame } from '../ui/useGame';
import { useStrings } from '../ui/useLocale';
import { liftDrawing, turnSafeKey } from '../game/store';
import { DRAWINGS, variantSecretsFor } from '../game/variants';
import type { Drawing } from '../game/variants';

// Scene-material colours for a child's crayons on parchment (like hydroponics' soil).
const CRAYON = { line: '#5a3d22', red: '#b3402e', blue: '#3a6a8a', yellow: '#d9a441', green: '#4f8a5c' };

export function KeyedSafe() {
  const opened = useGame((s) => s.chapter2.safeOpened);
  const keyFound = useGame((s) => s.chapter2v.keyFound);
  const t = useStrings();
  const aria = opened ? t.quarters.keyedAriaOpen : keyFound ? t.quarters.keyedAriaKey : t.quarters.keyedAria;
  return (
    <div className="panel">
      <h2>{t.quarters.safeTitle}</h2>
      <p className="status-dim">{t.quarters.keyedDesc}</p>
      <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <svg viewBox="0 0 200 170" width="200" role="img" aria-label={aria}>
          <defs>
            <linearGradient id="ks-bezel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brass-hi)" />
              <stop offset="50%" stopColor="var(--brass-lo)" />
              <stop offset="100%" stopColor="var(--brass-mid)" />
            </linearGradient>
            <linearGradient id="ks-key" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--brass-hi)" />
              <stop offset="100%" stopColor="var(--brass-mid)" />
            </linearGradient>
            <radialGradient id="ks-hole" cx="0.5" cy="0.4" r="0.7">
              <stop offset="0%" stopColor="var(--face-deep)" />
              <stop offset="100%" stopColor="var(--hull)" />
            </radialGradient>
          </defs>
          {/* bezel and inset door */}
          <rect x="2" y="2" width="196" height="166" rx="10" fill="url(#ks-bezel)" stroke="var(--brass-lo)" strokeWidth="3" />
          <rect x="12" y="12" width="176" height="118" rx="6" fill="var(--panel-solid)" stroke="var(--line)" strokeWidth="2" />
          {/* hinge line, four screws */}
          <line x1="20" y1="18" x2="20" y2="124" stroke="var(--steel-lo)" strokeWidth="2" />
          {[[30, 22], [178, 22], [30, 120], [178, 120]].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="2.5" fill="var(--steel-hi)" stroke="var(--steel-lo)" strokeWidth="0.75" />
          ))}
          {/* keyed lock: escutcheon, keyhole, and the key once found */}
          <circle cx="112" cy="70" r="24" fill="var(--steel)" stroke="var(--steel-lo)" strokeWidth="2" />
          <circle cx="112" cy="70" r="18" fill="url(#ks-hole)" stroke="var(--brass-lo)" strokeWidth="1.5" />
          <g style={{ transition: 'transform 0.5s', transform: opened ? 'rotate(90deg)' : 'rotate(0deg)', transformOrigin: '112px 70px' }}>
            <circle cx="112" cy="66" r="4" fill="var(--hull)" />
            <rect x="110" y="66" width="4" height="12" fill="var(--hull)" />
            {keyFound && (
              <g>
                <rect x="109" y="64" width="6" height="30" rx="1" fill="url(#ks-key)" stroke="var(--brass-lo)" strokeWidth="0.75" />
                <circle cx="112" cy="98" r="7" fill="url(#ks-key)" stroke="var(--brass-lo)" strokeWidth="1" />
                <circle cx="112" cy="98" r="2.5" fill="var(--panel-solid)" />
                <rect x="115" y="70" width="4" height="3" fill="var(--brass-hi)" />
                <rect x="115" y="76" width="3" height="3" fill="var(--brass-hi)" />
              </g>
            )}
          </g>
          {/* bolt lamp */}
          <circle cx="160" cy="70" r="4" fill={opened ? 'var(--green)' : 'var(--face)'} stroke="var(--steel)" strokeWidth="1" />
          {/* engraved plates */}
          <rect x="34" y="138" width="132" height="22" rx="3" fill="var(--hull)" stroke="var(--amber)" strokeWidth="1" />
          <text x="100" y="153" textAnchor="middle" fontSize="10" letterSpacing="2" fill="var(--amber)">VASQUEZ · PERSONAL</text>
          <text x="112" y="46" textAnchor="middle" fontSize="7" letterSpacing="2" fill="var(--parchment)" opacity="0.7">KEYED</text>
        </svg>
        {!opened && (
          <button onClick={() => turnSafeKey()} disabled={!keyFound} style={{ borderColor: 'var(--amber)' }}>{t.quarters.turnKey}</button>
        )}
      </div>
      {opened && <p className="status-ok" style={{ marginTop: 10 }}>{t.quarters.safeOpen}</p>}
      {opened && <p className="status-dim">{t.quarters.driveNote}</p>}
      {!opened && <p className="status-dim" style={{ marginTop: 10 }}>{keyFound ? t.quarters.keyInHand : t.quarters.noKey}</p>}
    </div>
  );
}

// One crayon drawing per subject, drawn in a 90×70 box. Deterministic strokes.
function Sketch({ subject }: { subject: Drawing }) {
  switch (subject) {
    case 'rocket':
      return (
        <g fill="none" stroke={CRAYON.line} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M45 8 L58 30 L58 54 L32 54 L32 30 Z" fill="#e9dcc0" />
          <path d="M32 44 L22 58 L32 54 M58 44 L68 58 L58 54" fill={CRAYON.red} />
          <circle cx="45" cy="34" r="5" fill={CRAYON.blue} />
          <path d="M38 56 Q45 68 52 56" fill={CRAYON.yellow} stroke={CRAYON.red} />
        </g>
      );
    case 'cake':
      return (
        <g fill="none" stroke={CRAYON.line} strokeWidth="2" strokeLinecap="round">
          <rect x="18" y="36" width="54" height="24" rx="3" fill="#e2b6a0" />
          <path d="M18 44 Q27 40 36 44 T54 44 T72 44" stroke={CRAYON.red} />
          {[30, 45, 60].map((x) => (
            <g key={x}>
              <line x1={x} y1="36" x2={x} y2="24" stroke={CRAYON.blue} />
              <ellipse cx={x} cy="20" rx="2.5" ry="4" fill={CRAYON.yellow} stroke={CRAYON.yellow} />
            </g>
          ))}
        </g>
      );
    case 'cat':
      return (
        <g fill="none" stroke={CRAYON.line} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="50" cy="48" rx="20" ry="12" fill="#d9c9a8" />
          <circle cx="30" cy="34" r="11" fill="#d9c9a8" />
          <path d="M22 26 L20 14 L30 24 M38 26 L40 14 L30 24" fill="#d9c9a8" />
          <path d="M70 46 Q84 40 78 28" />
          <circle cx="26" cy="33" r="1.5" fill={CRAYON.line} />
          <circle cx="34" cy="33" r="1.5" fill={CRAYON.line} />
          <path d="M16 38 L24 37 M16 42 L24 40 M36 37 L44 38 M36 40 L44 42" strokeWidth="1.2" />
        </g>
      );
    case 'cormorant':
      return (
        <g fill="none" stroke={CRAYON.line} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 42 L20 30 L74 30 L82 42 L74 54 L20 54 Z" fill="#c9d3d6" />
          <rect x="36" y="20" width="22" height="10" fill="#c9d3d6" />
          {[24, 32, 40, 48, 56, 64, 72].map((x) => <rect key={x} x={x} y="38" width="5" height="5" fill={CRAYON.blue} stroke="none" />)}
          {[28, 40, 52, 64].map((x) => <rect key={`t${x}`} x={x} y="46" width="5" height="4" fill={CRAYON.blue} stroke="none" />)}
        </g>
      );
    case 'sun':
      return (
        <g fill="none" stroke={CRAYON.yellow} strokeWidth="2.5" strokeLinecap="round">
          <circle cx="45" cy="36" r="13" fill={CRAYON.yellow} stroke={CRAYON.line} strokeWidth="2" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <line key={a} x1="45" y1="18" x2="45" y2="10" transform={`rotate(${a} 45 36)`} />
          ))}
          <path d="M39 38 Q45 44 51 38" stroke={CRAYON.line} strokeWidth="1.5" />
        </g>
      );
    case 'family':
      return (
        <g fill="none" stroke={CRAYON.line} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {[[22, 14, 1], [45, 18, 0.9], [66, 30, 0.6]].map(([x, top, s], i) => (
            <g key={i}>
              <circle cx={x} cy={top + 6} r={6 * s} fill={i === 2 ? '#e2b6a0' : '#d9c9a8'} />
              <line x1={x} y1={top + 12} x2={x} y2={top + 12 + 24 * s} />
              <path d={`M${x - 10 * s} ${top + 22} L${x} ${top + 16} L${x + 10 * s} ${top + 22}`} />
              <path d={`M${x - 8 * s} ${top + 12 + 38 * s} L${x} ${top + 12 + 24 * s} L${x + 8 * s} ${top + 12 + 38 * s}`} />
            </g>
          ))}
          <line x1="52" y1="34" x2="60" y2="42" stroke={CRAYON.red} />
        </g>
      );
    default:
      return null;
  }
}

export function DrawingWall() {
  const seed = useGame((s) => s.seed);
  const keyFound = useGame((s) => s.chapter2v.keyFound);
  const t = useStrings();
  const [tilted, setTilted] = useState<number | null>(null);
  const [last, setLast] = useState<Drawing | null>(null);
  const timer = useRef<number | null>(null);
  // The secret is read only once the puzzle has revealed it — never before.
  const keyAt = keyFound ? variantSecretsFor(seed).keyDrawing : null;

  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);

  const lift = (i: number) => {
    const r = liftDrawing(i as 0 | 1 | 2 | 3 | 4 | 5);
    setLast(DRAWINGS[i]);
    if (r.ok) return;
    setTilted(i);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setTilted(null), 600);
  };

  return (
    <div className="panel">
      <h2>{t.quarters.wallTitle}</h2>
      <p className="status-dim">{t.quarters.wallKeyedDesc}</p>
      <div role="group" aria-label={t.quarters.wallAria}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 100px)', gap: 14, padding: 12, background: 'var(--steel-lo)', borderRadius: 6, border: '1px solid var(--line)', width: 'fit-content' }}>
        {DRAWINGS.map((subject, i) => {
          const isKey = keyAt === i;
          const rot = isKey ? -9 : tilted === i ? -6 : 0;
          return (
            <div key={subject} style={{ position: 'relative', height: 96 }}>
              {/* the key, revealed under the lifted drawing */}
              {isKey && (
                <svg viewBox="0 0 40 20" width="40" style={{ position: 'absolute', left: 30, bottom: 2 }} aria-hidden="true">
                  <rect x="12" y="8" width="26" height="4" rx="1" fill="var(--brass-hi)" stroke="var(--brass-lo)" strokeWidth="0.75" />
                  <circle cx="8" cy="10" r="6" fill="var(--brass)" stroke="var(--brass-lo)" strokeWidth="1" />
                  <circle cx="8" cy="10" r="2" fill="var(--steel-lo)" />
                  <rect x="30" y="12" width="3" height="3" fill="var(--brass-hi)" />
                  <rect x="35" y="12" width="2" height="4" fill="var(--brass-hi)" />
                </svg>
              )}
              <button onClick={() => lift(i)} disabled={keyFound} aria-label={t.quarters.drawingAria(subject)}
                style={{
                  position: 'absolute', inset: 0, padding: 0, background: 'var(--parchment)', border: '1px solid var(--brass-lo)', borderRadius: 2,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.5)', transformOrigin: 'top center', transition: 'transform 0.25s',
                  transform: `rotate(${rot}deg) translateY(${isKey ? -18 : 0}px)`, cursor: keyFound ? 'default' : 'pointer',
                }}>
                <svg viewBox="0 0 90 70" width="100%" height="100%" aria-hidden="true">
                  {/* tape at the top edge */}
                  <rect x="34" y="0" width="22" height="7" fill="var(--brass-hi)" opacity="0.6" />
                  <Sketch subject={subject} />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
      {last !== null && !keyFound && <p className="status-dim" style={{ marginTop: 10 }}>{t.quarters.nothingBehind(last)}</p>}
      {keyFound && keyAt !== null && <p className="status-ok" style={{ marginTop: 10 }}>{t.quarters.keyBehind(DRAWINGS[keyAt])}</p>}
    </div>
  );
}
