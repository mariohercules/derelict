import { setPref } from '../game/prefs';
import { usePrefs } from './usePrefs';
import { useStrings } from './useLocale';

export function SoundToggle() {
  const muted = usePrefs((p) => p.muted);
  const t = useStrings();
  return (
    <button
      onClick={() => setPref('muted', !muted)}
      aria-label={muted ? t.hud.soundOn : t.hud.soundOff}
      aria-pressed={!muted}
      style={{ padding: '4px 10px', fontSize: 11, color: muted ? 'var(--dim)' : undefined, borderColor: muted ? 'var(--dim)' : undefined }}
    >
      {t.hud.sound} {muted ? '○' : '●'}
    </button>
  );
}
