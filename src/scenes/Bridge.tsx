import { useEffect, useState } from 'react';
import { useGame } from '../ui/useGame';
import { useStrings } from '../ui/useLocale';
import { takeStarFix, holdHandle, enterRoom } from '../game/store';
import { STAR_FIX } from '../game/content';

function Viewport() {
  const taken = useGame((s) => s.starFixTaken);
  const t = useStrings();
  const [alignment, setAlignment] = useState(0);
  const aligned = alignment >= 47 && alignment <= 53;

  useEffect(() => {
    if (aligned && !taken) takeStarFix();
  }, [aligned, taken]);

  return (
    <div className="panel">
      <h2>{t.bridge.viewportTitle}</h2>
      <p className="status-dim">{t.bridge.viewportDesc}</p>
      <svg viewBox="0 0 400 160" width="100%" role="img" aria-label={t.bridge.starAria}>
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
        aria-label={t.bridge.reticleAria}
      />
      {aligned && <p className="status-ok">{t.bridge.beaconsLocked}</p>}
    </div>
  );
}

function LaunchConsole() {
  const launch = useGame((s) => s.launch);
  const trajectorySet = useGame((s) => s.trajectorySet);
  const t = useStrings();
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    if (launch.phase !== 'countdown') return;
    const timer = setInterval(() => setNowTick(Date.now()), 250);
    return () => clearInterval(timer);
  }, [launch.phase]);

  const secondsLeft =
    launch.phase === 'countdown' && launch.countdownEndsAt
      ? Math.max(0, Math.ceil((launch.countdownEndsAt - nowTick) / 1000))
      : null;

  return (
    <div className="panel">
      <h2>{t.bridge.consoleTitle}</h2>
      {!trajectorySet && <p className="status-dim">{t.bridge.trajNotSet}</p>}
      {trajectorySet && launch.phase === 'idle' && <p className="status-ok">{t.bridge.trajLocked}</p>}
      {launch.phase === 'countdown' && (
        <>
          <p className="status-bad blink" style={{ fontSize: 24 }}>T-{secondsLeft}s</p>
          <p>{t.bridge.twoOp}</p>
          {secondsLeft === 0 && <p className="status-dim">{t.bridge.windowElapsed}</p>}
        </>
      )}
      <button
        onPointerDown={() => holdHandle(true)}
        onPointerUp={() => holdHandle(false)}
        onPointerLeave={() => holdHandle(false)}
        disabled={launch.phase !== 'countdown'}
        style={{ fontSize: 18, padding: '16px 28px', borderWidth: 2 }}
      >
        {launch.handleHeld ? t.bridge.holding : t.bridge.confirmHold}
      </button>
    </div>
  );
}

function EngineeringLadder() {
  const t = useStrings();
  return (
    <div className="panel">
      <h2>{t.bridge.ladderDown}</h2>
      <button onClick={() => enterRoom('engineering')}>{t.bridge.climbDown}</button>
    </div>
  );
}

export function Bridge() {
  const t = useStrings();
  return (
    <div className="scene">
      <div className="panel">
        <h2>{t.bridge.title}</h2>
        <p>{t.bridge.intro}</p>
      </div>
      <Viewport />
      <LaunchConsole />
      <EngineeringLadder />
    </div>
  );
}
