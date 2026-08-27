import { useState } from 'react';
import { useGame } from '../ui/useGame';
import { useStrings } from '../ui/useLocale';
import { removeGrate, flipBreaker, enterRoom } from '../game/store';
import { getPhotoCaption } from '../game/narrative';
import type { BreakerId } from '../game/types';
import photoStill from '../assets/family-photo.jpg';
import photoLoop from '../assets/family-photo.mp4';

function FamilyPhoto() {
  const [zoomed, setZoomed] = useState(false);
  const t = useStrings();
  const reducedMotion =
    typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  return (
    <div className="panel">
      <h2>{t.cryo.crewBunk}</h2>
      <p className="status-dim">{t.cryo.photoPinned}</p>
      <button onClick={() => setZoomed((z) => !z)}>{zoomed ? t.cryo.putBack : t.cryo.lookCloser}</button>
      {zoomed && (
        <div
          role="img"
          aria-label={t.cryo.photoAria}
          style={{
            display: 'inline-block',
            background: '#e9e1cd',
            padding: '12px 12px 4px',
            transform: 'rotate(-2deg)',
            margin: '18px 0 8px',
            position: 'relative',
            maxWidth: 380,
            boxShadow: '0 6px 22px rgba(0,0,0,0.55)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -9,
              left: '50%',
              width: 52,
              height: 18,
              background: '#d8c9a0',
              opacity: 0.55,
              transform: 'translateX(-50%) rotate(3deg)',
            }}
          />
          {reducedMotion ? (
            <img src={photoStill} alt="" style={{ display: 'block', width: '100%' }} />
          ) : (
            <video
              src={photoLoop}
              poster={photoStill}
              autoPlay
              muted
              loop
              playsInline
              style={{ display: 'block', width: '100%' }}
            />
          )}
          <div
            style={{
              textAlign: 'center',
              color: '#4a3826',
              fontFamily: "'Bradley Hand', 'Segoe Script', cursive",
              fontSize: 15,
              padding: '6px 0 2px',
            }}
          >
            {getPhotoCaption()}
          </div>
        </div>
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
