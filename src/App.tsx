import { useEffect, useMemo, useState } from 'react';
import { HUD } from './ui/HUD';
import { FallbackBanner } from './ui/FallbackBanner';
import { useGame } from './ui/useGame';
import { detectModelContext } from './mcp/detect';
import { createToolRegistry } from './mcp/registry';
import { buildTools } from './mcp/tools';
import { gameStore, resetGame } from './game/store';
import { loadSavedState } from './game/persist';
import { playAlarm, playBlip, startAmbience } from './audio/sound';
import { CryoBay } from './scenes/CryoBay';
import { Engineering } from './scenes/Engineering';
import { Bridge } from './scenes/Bridge';
import { Epilogue } from './scenes/Epilogue';

function ScenePlaceholder({ name }: { name: string }) {
  return (
    <div className="scene">
      <div className="panel">
        <h2>{name}</h2>
        <p className="status-dim">Compartment under construction.</p>
      </div>
    </div>
  );
}

export default function App() {
  const [started, setStarted] = useState(false);
  const [hasSave, setHasSave] = useState(() => loadSavedState() !== null);
  const room = useGame((s) => s.room);
  const won = useGame((s) => s.won);
  const mc = useMemo(() => detectModelContext(), []);

  useEffect(() => {
    if (!mc) return;
    const registry = createToolRegistry(mc, buildTools(), gameStore);
    const unsubscribeSound = gameStore.subscribe((state, prevState) => {
      if (state.auxPower && !prevState.auxPower) playBlip();
      if (state.launch.phase === 'countdown' && prevState.launch.phase !== 'countdown') playAlarm();
    });
    return () => {
      registry.dispose();
      unsubscribeSound();
    };
  }, [mc]);

  if (!started) {
    return (
      <div className="scene" style={{ marginTop: '15vh', textAlign: 'center' }}>
        <h1 style={{ letterSpacing: '0.4em', color: 'var(--amber)' }}>DERELICT</h1>
        <p>A two-crew escape. You see the ship. Your AI runs it. Neither of you leaves alone.</p>
        {!mc && <FallbackBanner />}
        <div>
          <button
            onClick={() => {
              startAmbience();
              playBlip();
              setStarted(true);
            }}
          >
            Wake up
          </button>
          {hasSave && (
            <button
              style={{ marginLeft: 12 }}
              onClick={() => {
                resetGame();
                setHasSave(false);
              }}
            >
              Abandon previous run
            </button>
          )}
        </div>
        <p className="status-dim">
          Tip: talk to your AI like a crewmate. Describe what you see. Ask what it can reach.
        </p>
      </div>
    );
  }

  return (
    <>
      <HUD />
      {!mc && <FallbackBanner />}
      {won ? (
        <Epilogue />
      ) : room === 'cryo_bay' ? (
        <CryoBay />
      ) : room === 'engineering' ? (
        <Engineering />
      ) : (
        <Bridge />
      )}
    </>
  );
}
