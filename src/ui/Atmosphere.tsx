import type { ReactNode } from 'react';
import { useStore } from 'zustand';
import { directionStore } from '../presentation/runtime';
import { usePrefs } from './usePrefs';
import { setPref } from '../game/prefs';
import { useStrings } from './useLocale';

export function Atmosphere({ children }: { children: ReactNode }) {
  const direction = useStore(directionStore);
  const reduced = usePrefs(p => p.effectsReduced === true);
  return <div className="ship-presence" data-beat={direction.beat} data-reduced={reduced}>
    {children}
    <div className="atmosphere-edge" aria-hidden="true" style={{ opacity: direction.edge }}><i /><i /></div>
  </div>;
}

export function AtmosphereToggle() {
  const reduced = usePrefs(p => p.effectsReduced === true);
  const t = useStrings();
  return <button className="atmosphere-toggle" aria-pressed={reduced} onClick={() => setPref('effectsReduced', !reduced)}
    aria-label={t.hud.reduceEffects} title={t.hud.reduceEffects}>{reduced ? t.hud.effectsLow : t.hud.effectsFull}</button>;
}
