import { useEffect, useRef, useState } from 'react';
import { useGame } from './useGame';
import { useMeta } from './useMeta';
import { useStrings } from './useLocale';
import { COLD_OPEN_DONE_MS, coldOpenSchedule, crystalPoints, frostCrystals, thawTemp } from './thaw';
import { reducedMotion } from './motion';
import { playBulkhead } from '../audio/sound';

// The thaw. Four steps on a schedule; skippable; under reduced motion it is
// the final frame and a CONTINUE button. Steps: 0 vitals, 1 frost clearing,
// 2 bulletin printing, 3 pod open.
export function ColdOpen({ onDone }: { onDone: () => void }) {
  const seed = useGame((s) => s.seed);
  const ngPlus = useGame((s) => s.ngPlus);
  const runs = useMeta((m) => m.runsCompleted);
  const t = useStrings();
  const [reduced] = useState(reducedMotion);
  const [step, setStep] = useState(reduced ? 3 : 0);
  const [progress, setProgress] = useState(reduced ? 1 : 0);
  const dialog = useRef<HTMLDivElement>(null);
  const done = useRef(false);
  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDone();
  };

  useEffect(() => {
    dialog.current?.focus();
  }, []);

  useEffect(() => {
    if (reduced) return;
    const timers = coldOpenSchedule().map((s, i) =>
      window.setTimeout(() => {
        setStep(i);
        if (s.id === 'open') playBulkhead();
      }, s.at)
    );
    timers.push(window.setTimeout(finish, COLD_OPEN_DONE_MS));
    const ticks = window.setInterval(() => setProgress((p) => Math.min(1, p + 0.05)), 80);
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      window.clearInterval(ticks);
    };
    // finish is stable for the life of the overlay
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ') {
        e.preventDefault();
        finish();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const crystals = frostCrystals(seed);
  const lines = [t.open.line1, t.open.line2, t.open.line3, t.open.line4];
  return (
    <div className="coldopen" role="dialog" aria-modal="true" aria-label={t.open.aria} tabIndex={-1} ref={dialog} onClick={reduced ? undefined : finish}>
      <div className="pod-plate">
        <div className="plate-engraved">
          {ngPlus ? t.open.plateAgain : t.open.plate}
          {ngPlus && ` · ${t.open.run(runs + 1)}`}
        </div>
        <svg viewBox="0 0 320 60" width="100%" role="img" aria-label={t.open.vitals}>
          <rect x="1" y="1" width="318" height="58" rx="4" fill="var(--face-deep)" stroke="var(--steel)" />
          <polyline
            className={reduced ? undefined : 'ecg-draw'}
            points="4,30 40,30 52,30 58,12 64,48 70,30 110,30 122,30 128,12 134,48 140,30 180,30 192,30 198,12 204,48 210,30 250,30 262,30 268,12 274,48 280,30 316,30"
            fill="none" stroke="var(--green)" strokeWidth="1.5"
          />
        </svg>
        <div className="row">
          <span className="status-dim">{t.open.temp}</span>
          <span style={{ color: 'var(--amber)' }}>{thawTemp(progress).toFixed(1)} °C</span>
        </div>
        <div className="bulletin" aria-live="polite">
          {step >= 2 && lines.map((line, i) => (
            <div key={i} className={reduced ? undefined : 'typewriter'} style={reduced ? undefined : { animationDelay: `${i * 0.6}s` }}>{line}</div>
          ))}
        </div>
        <div className="row">
          <span className={step >= 3 ? 'status-ok' : 'status-dim'}>{step >= 3 ? '●' : '○'} {step >= 3 ? t.open.podOpen : t.open.podSealed}</span>
          {reduced ? <button onClick={finish}>{t.open.continue}</button> : <span className="status-dim">{t.open.skip}</span>}
        </div>
      </div>
      {!reduced && (
        <svg className={`frost ${step >= 1 ? 'frost-clearing' : ''}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <mask id="co-hole">
              <rect width="100" height="100" fill="white" />
              <circle className="frost-hole" cx="50" cy="50" r="0" fill="black" />
            </mask>
          </defs>
          <g mask="url(#co-hole)" fill="var(--parchment)" opacity="0.28">
            {crystals.map((c, i) => <polygon key={i} points={crystalPoints(c)} />)}
          </g>
        </svg>
      )}
    </div>
  );
}
