import { useEffect, useState } from 'react';
import { useGame } from '../ui/useGame';
import { takeStarFix, holdHandle, enterRoom } from '../game/store';
import { STAR_FIX } from '../game/content';

function Viewport() {
  const taken = useGame((s) => s.starFixTaken);
  const [alignment, setAlignment] = useState(0);
  const aligned = alignment >= 47 && alignment <= 53;

  useEffect(() => {
    if (aligned && !taken) takeStarFix();
  }, [aligned, taken]);

  return (
    <div className="panel">
      <h2>Viewport — navigation reticle</h2>
      <p className="status-dim">
        The nav cameras are dead. The reticle is optical: drag it until the three beacons sit inside
        the ring, then read the constellation glyphs to your AI, left to right.
      </p>
      <svg viewBox="0 0 400 160" width="100%" role="img" aria-label="star field with alignment reticle">
        <rect width="400" height="160" fill="#05080a" />
        {[30, 90, 150, 210, 300, 370].map((x, i) => (
          <circle key={i} cx={x} cy={(i * 53) % 150 + 5} r="1.5" fill="#3d4f45" />
        ))}
        {STAR_FIX.map((glyph, i) => {
          const x = 120 + i * 80 + (50 - alignment) * 2;
          return (
            <g key={glyph}>
              <circle cx={x} cy={70} r="4" fill="var(--amber)" />
              <text x={x} y={95} textAnchor="middle" fill="var(--green)" fontSize="13"
                opacity={aligned ? 1 : 0} style={{ transition: 'opacity 0.6s' }}>
                {glyph}
              </text>
            </g>
          );
        })}
        <circle cx="200" cy="70" r="55" fill="none" stroke={aligned ? 'var(--green)' : 'var(--dim)'} strokeDasharray="6 4" />
      </svg>
      <input
        type="range" min={0} max={100} value={alignment}
        onChange={(e) => setAlignment(Number(e.target.value))}
        style={{ width: '100%' }}
        aria-label="reticle alignment"
      />
      {aligned && <p className="status-ok">Beacons locked in the ring. Three glyphs resolve beneath them.</p>}
    </div>
  );
}

function LaunchConsole() {
  const launch = useGame((s) => s.launch);
  const trajectorySet = useGame((s) => s.trajectorySet);
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    if (launch.phase !== 'countdown') return;
    const t = setInterval(() => setNowTick(Date.now()), 250);
    return () => clearInterval(t);
  }, [launch.phase]);

  const secondsLeft =
    launch.phase === 'countdown' && launch.countdownEndsAt
      ? Math.max(0, Math.ceil((launch.countdownEndsAt - nowTick) / 1000))
      : null;

  return (
    <div className="panel">
      <h2>Escape pod two — launch console</h2>
      {!trajectorySet && (
        <p className="status-dim">
          TRAJECTORY: NOT SET. The console wants a course before it wants courage.
        </p>
      )}
      {trajectorySet && launch.phase === 'idle' && (
        <p className="status-ok">
          TRAJECTORY LOCKED. Initiation is ship-side — your AI has the authorization question to answer.
        </p>
      )}
      {launch.phase === 'countdown' && (
        <>
          <p className="status-bad blink" style={{ fontSize: 24 }}>T-{secondsLeft}s</p>
          <p>
            TWO-OPERATOR RULE: hold the handle down and keep it held while your AI confirms the launch.
            Let go and the ship assumes you changed your mind.
          </p>
          {secondsLeft === 0 && (
            <p className="status-dim">
              Window elapsed. The ship is patient. Ask your AI to initiate again.
            </p>
          )}
        </>
      )}
      <button
        onPointerDown={() => holdHandle(true)}
        onPointerUp={() => holdHandle(false)}
        onPointerLeave={() => holdHandle(false)}
        disabled={launch.phase !== 'countdown'}
        style={{ fontSize: 18, padding: '16px 28px', borderWidth: 2 }}
      >
        {launch.handleHeld ? 'HOLDING — DO NOT LET GO' : 'CONFIRM LAUNCH (hold)'}
      </button>
    </div>
  );
}

function EngineeringLadder() {
  return (
    <div className="panel">
      <h2>Ladder down — to engineering</h2>
      <button onClick={() => enterRoom('engineering')}>Climb back down →</button>
    </div>
  );
}

export function Bridge() {
  return (
    <div className="scene">
      <div className="panel">
        <h2>Bridge</h2>
        <p>
          Empty chairs, a cracked viewport, and one escape pod indicator burning steady green.
          Someone left this deck ready for you.
        </p>
      </div>
      <Viewport />
      <LaunchConsole />
      <EngineeringLadder />
    </div>
  );
}
