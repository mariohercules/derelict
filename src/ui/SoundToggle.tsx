import { setPref } from '../game/prefs';
import { usePrefs } from './usePrefs';
import { useStrings } from './useLocale';
import { setMuted } from '../audio/sound';

export function SoundToggle() {
  const muted = usePrefs((p) => p.muted);
  const t = useStrings();
  return (
    <button
      onClick={() => {
        // The opening exposes this control before the mixer subscribes.
        // Arm the master flag before the first audio context can be created.
        setMuted(!muted);
        setPref('muted', !muted);
      }}
      aria-label={t.hud.sound}
      aria-pressed={!muted}
      title={muted ? t.hud.soundOn : t.hud.soundOff}
      style={{ padding: '4px 10px', fontSize: 11, color: muted ? 'var(--dim)' : undefined, borderColor: muted ? 'var(--dim)' : undefined }}
    >
      {t.hud.sound} {muted ? '○' : '●'}
    </button>
  );
}
