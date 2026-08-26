import { useState } from 'react';
import { useGame } from '../ui/useGame';
import { removeGrate, flipBreaker, enterRoom } from '../game/store';
import type { BreakerId } from '../game/types';

function FamilyPhoto() {
  const [zoomed, setZoomed] = useState(false);
  return (
    <div className="panel">
      <h2>Crew bunk — Okafor</h2>
      <p className="status-dim">A photo is pinned above the pillow, slightly crooked.</p>
      <button onClick={() => setZoomed((z) => !z)}>{zoomed ? 'Put photo back' : 'Look closer'}</button>
      {zoomed && (
        <svg viewBox="0 0 300 200" width="300" role="img" aria-label="A framed family photo">
          <rect x="0" y="0" width="300" height="200" fill="#1d2620" stroke="#5a4a30" strokeWidth="6" />
          <circle cx="110" cy="80" r="26" fill="#8a6f52" />
          <circle cx="180" cy="90" r="18" fill="#a5876a" />
          <rect x="70" y="110" width="160" height="50" rx="8" fill="#243028" />
          <text x="150" y="180" textAnchor="middle" fill="#cfe3d4" fontSize="14" fontFamily="monospace">
            Amara — 04 July 2098 🎂
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

  if (!grateRemoved) {
    return (
      <div className="panel">
        <h2>Vent grate</h2>
        <p className="status-dim">Something hums behind this grate. The screws gave up years ago.</p>
        <button onClick={removeGrate}>Pull the grate off</button>
      </div>
    );
  }
  return (
    <div className="panel">
      <h2>Aux power panel P-7</h2>
      {auxPower ? (
        <p className="status-ok">AUXILIARY POWER ONLINE. Somewhere, a door controller wakes up.</p>
      ) : (
        <>
          <p className="status-dim">
            Three breakers, labeled A, B, C — in an order that helps no one. A warning sticker reads:
            "WRONG SEQUENCE TRIPS MASTER RELAY".
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            {(['A', 'B', 'C'] as BreakerId[]).map((id) => (
              <button key={id} onClick={() => flipBreaker(id)} disabled={flipped.includes(id)}>
                Breaker {id} {flipped.includes(id) ? '(on)' : ''}
              </button>
            ))}
          </div>
          {flipped.length === 0 && <p className="status-dim">All breakers down.</p>}
        </>
      )}
    </div>
  );
}

function ExitDoor() {
  const unlocked = useGame((s) => s.doors.cryo_exit);
  const auxPower = useGame((s) => s.auxPower);
  return (
    <div className="panel">
      <h2>Exit — to engineering</h2>
      {unlocked ? (
        <button onClick={() => enterRoom('engineering')}>Step through the open door →</button>
      ) : (
        <p className={auxPower ? 'status-bad' : 'status-dim'}>
          {auxPower
            ? 'MAG-LOCKED. The keypad is dead — this door only answers to the ship. Your AI can reach the door controller; it will need a crew code.'
            : 'Dark. Dead. The lock needs power before anything else.'}
        </p>
      )}
    </div>
  );
}

export function CryoBay() {
  return (
    <div className="scene">
      <div className="panel">
        <h2>Cryo bay</h2>
        <p>
          You wake up cold in an open cryopod. Emergency lights. The ship is silent in the way ships
          should never be. A terminal blinks: <em>AUXILIARY MODEL-CONTEXT LINK ACTIVE</em> — your AI
          is aboard, even if nothing else is.
        </p>
        <p className="status-dim">Ask your AI what it can see. It reads things you can't.</p>
      </div>
      <BreakerPanel />
      <FamilyPhoto />
      <ExitDoor />
    </div>
  );
}
