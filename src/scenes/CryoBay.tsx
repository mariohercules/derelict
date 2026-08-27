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
        <svg viewBox="0 0 300 200" width="300" role="img" aria-label={t.cryo.photoAria}>
          <rect x="0" y="0" width="300" height="200" fill="#1d2620" stroke="#5a4a30" strokeWidth="6" />
          <circle cx="110" cy="80" r="26" fill="#8a6f52" />
          <circle cx="180" cy="90" r="18" fill="#a5876a" />
          <rect x="70" y="110" width="160" height="50" rx="8" fill="#243028" />
          <text x="150" y="180" textAnchor="middle" fill="#cfe3d4" fontSize="14" fontFamily="monospace">
            {getPhotoCaption()}
          </text>
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
