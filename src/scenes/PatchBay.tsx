import { useState } from 'react';
import { useGame } from '../ui/useGame';
import { useStrings } from '../ui/useLocale';
import { energize, plugCable } from '../game/store';

// Scene-material colours for the three lines (like hydroponics' soil and water).
const CABLE_COLOURS = ['#c0392b', '#27ae60', '#3a7a8a'];
const JACK_Y = [38, 74, 110];
const SOCKET_Y = [38, 74, 110];

export function PatchBay() {
  const sockets = useGame((s) => s.chapter1v.sockets);
  const auxPower = useGame((s) => s.auxPower);
  const t = useStrings();
  const [wrong, setWrong] = useState(false);

  const cycle = (cable: 0 | 1 | 2) => {
    setWrong(false);
    // step null → 1 → 2 → 3 → null, skipping a bus held by another cable
    const order: (number | null)[] = [1, 2, 3, null];
    let idx = sockets[cable] === null ? order.length - 1 : order.indexOf(sockets[cable]);
    for (let n = 0; n < order.length; n++) {
      idx = (idx + 1) % order.length;
      const next = order[idx];
      if (next === null || !sockets.some((v, i) => i !== cable && v === next)) {
        plugCable(cable, next);
        return;
      }
    }
  };

  const press = () => setWrong(!energize().ok && !sockets.some((b) => b === null));

  return (
    <div className="panel">
      <h2>{t.cryo.pbTitle}</h2>
      {auxPower ? (
        <p className="status-ok">{t.cryo.auxOnline}</p>
      ) : (
        <>
          <p className="status-dim">{t.cryo.pbDesc}</p>
          <svg viewBox="0 0 320 150" width="100%" style={{ maxWidth: 520, display: 'block' }} role="img" aria-label={t.cryo.pbAria}>
            <defs>
              <linearGradient id="pb-brass" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--brass-hi)" />
                <stop offset="100%" stopColor="var(--brass-lo)" />
              </linearGradient>
            </defs>
            <rect x="4" y="4" width="312" height="142" rx="6" fill="var(--face)" stroke="var(--steel)" strokeWidth="3" />
            <rect x="10" y="10" width="300" height="130" rx="4" fill="var(--face-deep)" stroke="var(--line)" />
            {/* cable spools and jacks, left */}
            {CABLE_COLOURS.map((c, i) => (
              <g key={c}>
                <circle cx="38" cy={JACK_Y[i]} r="11" fill="var(--steel-lo)" stroke="var(--steel)" strokeWidth="2" />
                <circle cx="38" cy={JACK_Y[i]} r="5" fill={c} stroke="var(--hull)" />
                {/* the cable: taut bezier to its socket when seated, a loose sag when not */}
                {sockets[i] !== null ? (
                  <path d={`M 49 ${JACK_Y[i]} C 130 ${JACK_Y[i]}, 190 ${SOCKET_Y[sockets[i]! - 1]}, 258 ${SOCKET_Y[sockets[i]! - 1]}`}
                    fill="none" stroke={c} strokeWidth="4" strokeLinecap="round" style={{ transition: 'd 0.3s' }} />
                ) : (
                  <path d={`M 49 ${JACK_Y[i]} C 90 ${JACK_Y[i] + 26}, 110 ${JACK_Y[i] + 30}, 120 ${JACK_Y[i] + 18}`}
                    fill="none" stroke={c} strokeWidth="4" strokeLinecap="round" opacity="0.7" />
                )}
              </g>
            ))}
            {/* bus sockets, right */}
            {[0, 1, 2].map((b) => (
              <g key={b}>
                <circle cx="266" cy={SOCKET_Y[b]} r="10" fill="url(#pb-brass)" stroke="var(--brass-lo)" strokeWidth="2" />
                <circle cx="266" cy={SOCKET_Y[b]} r="4" fill="var(--face-deep)" />
                <rect x="282" y={SOCKET_Y[b] - 8} width="30" height="16" rx="2" fill="var(--panel-solid)" stroke="var(--line)" />
                <text x="297" y={SOCKET_Y[b] + 3.5} textAnchor="middle" fontSize="7" fill="var(--text)" letterSpacing="1">{t.cryo.pbBus} {b + 1}</text>
                {/* this SVG renders only while !auxPower, so the lamp is always the dim housing */}
                <circle cx="266" cy={SOCKET_Y[b] - 16} r="3" fill="var(--face)" stroke="var(--steel)" strokeWidth="0.75" />
              </g>
            ))}
            <rect x="18" y="128" width="44" height="13" rx="2" fill="var(--panel-solid)" stroke="var(--line)" />
            <text x="40" y="137.5" textAnchor="middle" fontSize="7" fill="var(--text)" letterSpacing="2">P-7B</text>
          </svg>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
            {t.cryo.pbColours.map((colour, i) => (
              <button key={colour} onClick={() => cycle(i as 0 | 1 | 2)} aria-label={t.cryo.pbCableAria(colour)}
                style={{ borderColor: CABLE_COLOURS[i], color: 'var(--text)' }}>
                {colour}: {sockets[i] === null ? t.cryo.pbEmpty : `${t.cryo.pbBus} ${sockets[i]}`}
              </button>
            ))}
            <button onClick={press} style={{ borderColor: 'var(--amber)' }}>{t.cryo.pbEnergize}</button>
          </div>
          {wrong && <p className="status-bad" style={{ marginTop: 8 }}>{t.cryo.pbWrong}</p>}
        </>
      )}
    </div>
  );
}
