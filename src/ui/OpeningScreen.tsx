import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { GameState } from '../game/types';
import type { ShipInvite } from '../game/shipcode';
import { encodeShipCode } from '../game/shipcode';
import { useStrings } from './useLocale';
import { usePrefs } from './usePrefs';
import { reducedMotion } from './motion';
import { OpeningBackdrop } from './OpeningBackdrop';
import { LocaleToggle } from './LocaleToggle';
import { SoundToggle } from './SoundToggle';
import { AtmosphereToggle } from './Atmosphere';
import type { OpeningPanelId } from './OpeningPanel';

const OpeningPanel = lazy(() => import('./OpeningPanel'));

interface OpeningProps {
  saved: GameState | null;
  linked: boolean;
  invite: ShipInvite | null;
  plusAllowed: boolean;
  onEngage: () => void;
  onWake: () => void;
  onNew: () => void;
  onInvite: () => void;
}

export function OpeningScreen({ saved, linked, invite, plusAllowed, onEngage, onWake, onNew, onInvite }: OpeningProps) {
  const t = useStrings();
  const reduced = usePrefs(p => p.effectsReduced === true);
  const [panel, setPanel] = useState<OpeningPanelId | null>(null);
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pending = useRef(false);
  useEffect(() => () => clearTimeout(timer.current), []);

  const begin = (action: () => void) => {
    if (pending.current) return;
    pending.current = true;
    setPanel(null);
    onEngage(); // Audio is unlocked by this gesture, before the visual transition.
    if (reducedMotion()) { action(); return; }
    setLeaving(true);
    timer.current = setTimeout(action, 760);
  };
  const primary = !saved ? t.app.wakeUp : saved.won ? t.app.reviewEnding : t.app.resume;

  return <main className="opening-screen" data-leaving={leaving} data-reduced={reduced}>
    <OpeningBackdrop />
    <header className="opening-topbar">
      <span className="opening-deckmark">ISV / CMR</span>
      <div className="opening-settings"><SoundToggle /><AtmosphereToggle /><LocaleToggle /></div>
    </header>
    <div className="opening-content">
      <p className="opening-eyebrow">ISV CORMORANT</p>
      <h1>DERELICT</h1>
      <p className="opening-tagline"><span>{t.app.youSee}</span><span>{t.app.aiOperates}</span></p>
      <nav className="opening-menu" aria-label={t.app.mainMenu}>
        <button className="opening-primary" disabled={leaving} onClick={() => begin(onWake)}>
          <span>{primary}</span><span aria-hidden="true">↗</span>
        </button>
        {saved && !saved.won && <p className="opening-checkpoint">
          {t.app.resumeAt(t.hud.rooms[saved.room])}
        </p>}
        <button disabled={leaving} onClick={() => setPanel('how')}>{t.app.howToPlay}</button>
        <button disabled={leaving} onClick={() => setPanel('record')}>{t.app.flightRecord}</button>
        {saved && <button className="opening-new" disabled={leaving} onClick={() => setPanel('restart')}>{t.app.newJourney}<span aria-hidden="true"> +</span></button>}
      </nav>
      {invite && <button className="opening-invite" disabled={leaving} onClick={() => setPanel('invite')}>
        <span aria-hidden="true">↳ </span>{invite.ok ? t.ship.received(encodeShipCode(invite.seed, invite.ngPlus)) : t.ship.unreadable}
      </button>}
    </div>
    <footer className="opening-footer">
      <div className="opening-link" data-linked={linked}>
        <span className="opening-link-lamp" aria-hidden="true" />
        {linked ? <span role="status">{t.app.linkActive}</span>
          : <button disabled={leaving} onClick={() => setPanel('link')}>{t.app.linkMissing} <span aria-hidden="true">↗</span></button>}
      </div>
      <span className="opening-crew">{t.app.twoCrew}</span>
    </footer>
    {panel && <Suspense fallback={<span className="opening-loading" role="status">{t.app.accessing}</span>}>
      <OpeningPanel panel={panel} linked={linked} invite={invite} hasSave={saved !== null} plusAllowed={plusAllowed}
        onClose={() => setPanel(null)} onNew={() => begin(onNew)} onInvite={() => begin(onInvite)} />
    </Suspense>}
  </main>;
}
