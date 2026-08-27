import { useState } from 'react';
import { useGame } from '../ui/useGame';
import { useStrings } from '../ui/useLocale';
import { removeGrate, flipBreaker, enterRoom } from '../game/store';
import { getPhotoCaption } from '../game/narrative';
import type { BreakerId } from '../game/types';

function FamilyPhoto() {
  const [zoomed, setZoomed] = useState(false);
  const t = useStrings();
  return (
    <div className="panel">
      <h2>{t.cryo.crewBunk}</h2>
      <p className="status-dim">{t.cryo.photoPinned}</p>
      <button onClick={() => setZoomed((z) => !z)}>{zoomed ? t.cryo.putBack : t.cryo.lookCloser}</button>
      {zoomed && (
        <svg viewBox="0 0 320 258" width="340" role="img" aria-label={t.cryo.photoAria} style={{ display: 'block', marginTop: 12 }}>
          <defs>
            <linearGradient id="photo-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2d1b3d" />
              <stop offset="45%" stopColor="#8a3a2e" />
              <stop offset="75%" stopColor="#d97b3f" />
              <stop offset="100%" stopColor="#f2b96b" />
            </linearGradient>
            <radialGradient id="photo-vignette" cx="0.5" cy="0.45" r="0.75">
              <stop offset="55%" stopColor="#000000" stopOpacity="0" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.5" />
            </radialGradient>
          </defs>
          <g transform="rotate(-2 160 129)">
            {/* photo paper, slightly aged */}
            <rect x="18" y="14" width="284" height="234" fill="#e9e1cd" rx="2" />
            <rect x="18" y="14" width="284" height="234" fill="#7a5c30" opacity="0.06" rx="2" />
            {/* the picture: dusk over water */}
            <rect x="30" y="26" width="260" height="172" fill="url(#photo-sky)" />
            <circle cx="222" cy="122" r="24" fill="#f7d9a0" opacity="0.95" />
            <circle cx="222" cy="122" r="40" fill="#f7d9a0" opacity="0.22" />
            {/* sea + shore */}
            <rect x="30" y="150" width="260" height="10" fill="#8a4526" opacity="0.9" />
            <rect x="30" y="158" width="260" height="40" fill="#5a3220" />
            <rect x="30" y="190" width="260" height="8" fill="#2e1c12" />
            <path d="M 30 158 q 40 -3 80 0 q 60 4 100 0 q 50 -3 80 0" stroke="#f2b96b" strokeWidth="1" fill="none" opacity="0.35" />
            {/* birds */}
            <path d="M 74 62 q 5 -5 10 0 q 5 -5 10 0" stroke="#241a14" strokeWidth="1.6" fill="none" opacity="0.65" />
            <path d="M 104 50 q 4 -4 8 0 q 4 -4 8 0" stroke="#241a14" strokeWidth="1.3" fill="none" opacity="0.55" />
            {/* father with Amara on his shoulders, silhouetted against the sun */}
            <g fill="#1b120c">
              <ellipse cx="133" cy="196" rx="26" ry="4" opacity="0.5" />
              {/* father */}
              <circle cx="133" cy="99" r="9.5" />
              <path d="M 121 109 Q 133 102 145 109 L 142 150 Q 133 155 124 150 Z" />
              <path d="M 126 150 L 123 194 L 130 194 L 131 152 Z" />
              <path d="M 140 150 L 143 194 L 136 194 L 135 152 Z" />
              {/* arms reaching up to hold her ankles */}
              <path d="M 122 110 Q 118 118 123 122 L 127 116 Z" />
              <path d="M 144 110 Q 148 118 143 122 L 139 116 Z" />
              {/* Amara */}
              <circle cx="133" cy="66" r="7" />
              <path d="M 126 74 Q 133 70 140 74 L 139 90 L 127 90 Z" />
              <path d="M 127 90 Q 124 104 124 116 L 129 116 Q 130 103 131 92 Z" />
              <path d="M 139 90 Q 142 104 142 116 L 137 116 Q 136 103 135 92 Z" />
              {/* her arms thrown up */}
              <path d="M 127 73 Q 118 66 116 58 L 120 55 Q 124 64 130 69 Z" />
              <path d="M 139 73 Q 148 66 150 58 L 146 55 Q 142 64 136 69 Z" />
            </g>
            <rect x="30" y="26" width="260" height="172" fill="url(#photo-vignette)" />
            {/* handwritten caption on the print border */}
            <text
              x="160" y="228" textAnchor="middle" fill="#4a3826" fontSize="15"
              style={{ fontFamily: "'Bradley Hand', 'Segoe Script', cursive" }}
            >
              {getPhotoCaption()}
            </text>
          </g>
          {/* tape holding it to the bunk wall */}
          <rect x="138" y="2" width="46" height="18" fill="#d8c9a0" opacity="0.5" transform="rotate(3 161 11)" />
        </svg>
      )}
    </div>
  );
}

function BreakerPanel() {
  const grateRemoved = useGame((s) => s.grateRemoved);
  const flipped = useGame((s) => s.breakersFlipped);
  const auxPower = useGame((s) => s.auxPower);
  const t = useStrings();

  if (!grateRemoved) {
    return (
      <div className="panel">
        <h2>{t.cryo.ventGrate}</h2>
        <p className="status-dim">{t.cryo.ventHum}</p>
        <button onClick={removeGrate}>{t.cryo.pullGrate}</button>
      </div>
    );
  }
  return (
    <div className="panel">
      <h2>{t.cryo.auxPanel}</h2>
      {auxPower ? (
        <p className="status-ok">{t.cryo.auxOnline}</p>
      ) : (
        <>
          <p className="status-dim">{t.cryo.breakersDesc}</p>
          <div style={{ display: 'flex', gap: 12 }}>
            {(['A', 'B', 'C'] as BreakerId[]).map((id) => (
              <button key={id} onClick={() => flipBreaker(id)} disabled={flipped.includes(id)}>
                {t.cryo.breaker} {id} {flipped.includes(id) ? t.cryo.breakerOn : ''}
              </button>
            ))}
          </div>
          {flipped.length === 0 && <p className="status-dim">{t.cryo.allDown}</p>}
        </>
      )}
    </div>
  );
}

function ExitDoor() {
  const unlocked = useGame((s) => s.doors.cryo_exit);
  const auxPower = useGame((s) => s.auxPower);
  const t = useStrings();
  return (
    <div className="panel">
      <h2>{t.cryo.exitTitle}</h2>
      {unlocked ? (
        <>
          <p className="status-ok blink">{t.cryo.doorOpen}</p>
          <button onClick={() => enterRoom('engineering')}>{t.cryo.stepThrough}</button>
        </>
      ) : (
        <p className={auxPower ? 'status-bad' : 'status-dim'}>
          {auxPower ? t.cryo.magLocked : t.cryo.darkDead}
        </p>
      )}
    </div>
  );
}

export function CryoBay() {
  const t = useStrings();
  return (
    <div className="scene">
      <div className="panel">
        <h2>{t.cryo.title}</h2>
        <p>
          {t.cryo.introA}
          <em>{t.cryo.introEm}</em>
          {t.cryo.introB}
        </p>
        <p className="status-dim">{t.cryo.askAI}</p>
      </div>
      <BreakerPanel />
      <FamilyPhoto />
      <ExitDoor />
    </div>
  );
}
