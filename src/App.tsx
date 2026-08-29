import { useEffect, useState } from 'react';
import { HUD } from './ui/HUD';
import { FallbackBanner } from './ui/FallbackBanner';
import { useGame } from './ui/useGame';
import { useStrings } from './ui/useLocale';
import { LocaleToggle } from './ui/LocaleToggle';
import { detectModelContext } from './mcp/detect';
import { createToolRegistry } from './mcp/registry';
import { buildTools } from './mcp/tools';
import { gameStore, resetGame } from './game/store';
import { loadSavedState } from './game/persist';
import { playAlarm, playBlip, startAmbience } from './audio/sound';
import { SCENES } from './scenes/registry';
import { Epilogue } from './scenes/Epilogue';
import { DeckMap } from './ui/DeckMap';

function BuildTag() {
  return (
    <div
      className="status-dim"
      style={{ position: 'fixed', bottom: 6, right: 10, fontSize: 10, opacity: 0.6, pointerEvents: 'none' }}
    >
      {__BUILD_ID__}
    </div>
  );
}

export default function App() {
  const [started, setStarted] = useState(false);
  const [hasSave, setHasSave] = useState(() => loadSavedState() !== null);
  const room = useGame((s) => s.room);
  const won = useGame((s) => s.won);
  const t = useStrings();
  const [mc, setMc] = useState(() => detectModelContext());

  // Some hosts (extension bridges, agents attaching after page load) inject
  // modelContext only after React mounts — poll briefly instead of deciding
  // the link is severed forever at first render.
  useEffect(() => {
    if (mc) return;
    let tries = 0;
    const timer = setInterval(() => {
      const found = detectModelContext();
      if (found) {
        setMc(found);
        clearInterval(timer);
      } else if (++tries >= 20) {
        clearInterval(timer);
      }
    }, 500);
    return () => clearInterval(timer);
  }, [mc]);

  useEffect(() => {
    if (!mc) return;
    const registry = createToolRegistry(mc, buildTools(), gameStore);
    return () => registry.dispose();
  }, [mc]);

  useEffect(() => {
    const unsubscribeSound = gameStore.subscribe((state, prevState) => {
      if (state.auxPower && !prevState.auxPower) playBlip();
      if (state.doors.cryo_exit && !prevState.doors.cryo_exit) playBlip();
      if (state.doors.engineering_exit && !prevState.doors.engineering_exit) playBlip();
      if (state.ritual.phase === 'armed' && prevState.ritual.phase !== 'armed') playAlarm();
    });
    return unsubscribeSound;
  }, []);

  if (!started) {
    return (
      <div className="scene" style={{ marginTop: '15vh', textAlign: 'center' }}>
        <div style={{ position: 'absolute', top: 12, right: 16 }}>
          <LocaleToggle />
        </div>
        <h1 style={{ letterSpacing: '0.4em', color: 'var(--amber)' }}>DERELICT</h1>
        <p>{t.app.tagline}</p>
        {!mc && <FallbackBanner />}
        <div className="panel" style={{ textAlign: 'left', maxWidth: 680, margin: '20px auto' }}>
          <h2>{t.app.howTitle}</h2>
          <p className="status-dim">1. {t.app.how1}</p>
          <p className="status-dim">2. {t.app.how2}</p>
          <p className="status-dim">3. {t.app.how3}</p>
        </div>
        <div>
          <button
            onClick={() => {
              startAmbience();
              playBlip();
              setStarted(true);
            }}
          >
            {t.app.wakeUp}
          </button>
          {hasSave && (
            <button
              style={{ marginLeft: 12 }}
              onClick={() => {
                resetGame();
                setHasSave(false);
              }}
            >
              {t.app.abandonRun}
            </button>
          )}
        </div>
        <BuildTag />
      </div>
    );
  }

  return (
    <>
      <HUD linked={mc !== null} />
      {!mc && <FallbackBanner />}
      {won ? (
        <Epilogue />
      ) : (
        <>
          <DeckMap />
          {(() => {
            const Scene = SCENES[room];
            return <Scene />;
          })()}
        </>
      )}
      <BuildTag />
    </>
  );
}
