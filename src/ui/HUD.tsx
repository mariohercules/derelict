import { useEffect, useState } from 'react';
import { useGame } from './useGame';
import { enginesOnline } from '../game/derived';
import { useStrings } from './useLocale';
import { LocaleToggle } from './LocaleToggle';
import { SoundToggle } from './SoundToggle';
import { LinkConsole } from './LinkConsole';
import { secondsToNextPhase } from '../game/killswitch';
import { rulesFor } from '../game/rules';

function WaveBanner() {
  const killswitch = useGame((s) => s.killswitch);
  const wave = useGame((s) => s.chapter3.wave);
  const startedAt = useGame((s) => s.chapter3.cycleStartedAt);
  const won = useGame((s) => s.won);
  const ngPlus = useGame((s) => s.ngPlus);
  const t = useStrings();
  const [now, setNow] = useState(() => Date.now());
  const live = killswitch === 'active' && wave !== 'calm' && startedAt !== null;
  useEffect(() => {
    if (!live) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [live]);
  if (won) return null;
  if (killswitch === 'contained') return <div className="wave-banner status-ok">{t.hud.contained}</div>;
  if (!live) return null;
  const secs = secondsToNextPhase(startedAt!, now, rulesFor({ ngPlus }).cycle);
  return (
    <div className={`wave-banner blink ${wave === 'active' ? 'status-bad' : ''}`} style={{ color: wave === 'warning' ? 'var(--amber)' : undefined }} role="status">
      {wave === 'warning' ? t.hud.waveWarning(secs) : t.hud.waveActive(secs)}
    </div>
  );
}

export function HUD({ linked }: { linked: boolean }) {
  const state = useGame((s) => s);
  const t = useStrings();
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
          {state.ngPlus && <>{' '}<span style={{ color: 'var(--amber)', border: '1px solid var(--amber)', borderRadius: 3, padding: '0 6px', fontSize: 11, letterSpacing: '0.1em' }}>{t.hud.ngPlus}</span></>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
          <SoundToggle />
          <LocaleToggle />
        </div>
      </header>
      <LinkConsole linked={linked} />
      <WaveBanner />
    </>
  );
}
