import { useEffect, useState } from 'react';
import { useGame } from './useGame';
import { toolAvailability } from '../mcp/tools';
import { enginesOnline } from '../game/derived';
import { useStrings } from './useLocale';
import { LocaleToggle } from './LocaleToggle';
import { secondsToNextPhase } from '../game/killswitch';

function WaveBanner() {
  const killswitch = useGame((s) => s.killswitch);
  const wave = useGame((s) => s.chapter3.wave);
  const startedAt = useGame((s) => s.chapter3.cycleStartedAt);
  const t = useStrings();
  const [now, setNow] = useState(() => Date.now());
  const live = killswitch === 'active' && wave !== 'calm' && startedAt !== null;
  useEffect(() => {
    if (!live) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [live]);
  if (killswitch === 'contained') return <div className="wave-banner status-ok">{t.hud.contained}</div>;
  if (!live) return null;
  const secs = secondsToNextPhase(startedAt!, now);
  return (
    <div className={`wave-banner blink ${wave === 'active' ? 'status-bad' : ''}`} style={{ color: wave === 'warning' ? 'var(--amber)' : undefined }} role="status">
      {wave === 'warning' ? t.hud.waveWarning(secs) : t.hud.waveActive(secs)}
    </div>
  );
}

export function HUD({ linked }: { linked: boolean }) {
  const state = useGame((s) => s);
  const t = useStrings();
  const tools = toolAvailability(state);
  const onlineCount = tools.filter((tool) => tool.online).length;
  return (
    <>
      <header className="hud">
        <div>
          <strong>ISV CORMORANT</strong>{' '}
          <span className="status-dim">// {t.hud.rooms[state.room]}</span>{' '}
          <span className={state.auxPower ? 'status-ok' : 'status-bad blink'}>
            AUX {state.auxPower ? 'ON' : 'OFF'}
          </span>{' '}
          <span className={enginesOnline(state) ? 'status-ok' : 'status-dim'}>
            {t.hud.engines} {enginesOnline(state) ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>
        <div className="ailink" title={linked ? t.hud.ailinkTitle : undefined}>
          {linked ? (
            <>
              <span className="status-dim">AI LINK {onlineCount}/{tools.length} · status:</span>
              {tools.map((tool) => (
                <span key={tool.name} className={`tool ${tool.online ? 'status-ok' : 'status-dim'}`}>
                  {tool.online ? '●' : '○'} {tool.name}
                </span>
              ))}
            </>
          ) : (
            <span className="status-bad">AI LINK · {t.hud.severed}</span>
          )}
        </div>
        <LocaleToggle />
      </header>
      <WaveBanner />
    </>
  );
}
