import { useEffect, useMemo, useState } from 'react';
import { HUD } from './ui/HUD';
import { FallbackBanner } from './ui/FallbackBanner';
import { useGame } from './ui/useGame';
import { detectModelContext } from './mcp/detect';
import { createToolRegistry } from './mcp/registry';
import { buildTools } from './mcp/tools';
import { gameStore } from './game/store';
import { CryoBay } from './scenes/CryoBay';
import { Engineering } from './scenes/Engineering';

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
  const room = useGame((s) => s.room);
  const won = useGame((s) => s.won);
  const mc = useMemo(() => detectModelContext(), []);

  useEffect(() => {
    if (!mc) return;
    const registry = createToolRegistry(mc, buildTools(), gameStore);
    return () => registry.dispose();
  }, [mc]);

  if (!started) {
    return (
      <div className="scene" style={{ marginTop: '15vh', textAlign: 'center' }}>
        <h1 style={{ letterSpacing: '0.4em', color: 'var(--amber)' }}>DERELICT</h1>
        <p>A two-crew escape. You see the ship. Your AI runs it. Neither of you leaves alone.</p>
        {!mc && <FallbackBanner />}
        <div>
          <button onClick={() => setStarted(true)}>Wake up</button>
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
        <ScenePlaceholder name="Epilogue" />
      ) : room === 'cryo_bay' ? (
        <CryoBay />
      ) : room === 'engineering' ? (
        <Engineering />
      ) : (
        <ScenePlaceholder name="Bridge" />
      )}
    </>
  );
}
