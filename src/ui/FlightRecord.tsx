import { useState } from 'react';
import { useGame } from './useGame';
import { useMeta } from './useMeta';
import { useStrings } from './useLocale';
import { Lamp } from './LinkConsole';
import { encodeShipCode, shipLink } from '../game/shipcode';
import type { EndingId } from '../game/types';

function RecordLamp({ lit, label }: { lit: boolean; label: string }) {
  return (
    <span className={`lamp ${lit ? 'status-ok' : 'status-dim'}`}>
      <Lamp fill={lit ? 'var(--green)' : 'var(--steel-lo)'} lit={lit} />
      {label}
    </span>
  );
}

// The ledger: this run, this device's memory, and the four ending lamps — the
// fourth engraved "—" until STAY has been seen. Compact on the title screen.
export function FlightRecord({ compact = false }: { compact?: boolean }) {
  const seed = useGame((s) => s.seed);
  const ngPlus = useGame((s) => s.ngPlus);
  const toolCalls = useGame((s) => s.toolCalls);
  const waves = useGame((s) => s.chapter3.wavesEndured);
  const ending = useGame((s) => s.ending);
  const proof = useGame((s) => s.chapter2.sampleAnalyzed);
  const beacon = useGame((s) => s.chapter3.beaconHeard);
  const contained = useGame((s) => s.killswitch === 'contained');
  const won = useGame((s) => s.won);
  const meta = useMeta((m) => m);
  const t = useStrings();
  const [copied, setCopied] = useState<'idle' | 'copied' | 'manual'>('idle');
  const code = encodeShipCode(seed, ngPlus);
  const link = shipLink(window.location.origin, seed, ngPlus);
  const seen = (e: EndingId) => meta.endingsSeen.includes(e) || (won && ending === e);
  const leaveSeen = seen('leave_unknowing') || seen('leave_knowing');
  const staySeen = seen('stay');
  // A finished run is already in the memory; an unfinished one is the next.
  const runNumber = won ? meta.runsCompleted : meta.runsCompleted + 1;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied('copied');
      window.setTimeout(() => setCopied('idle'), 1500);
    } catch {
      setCopied('manual');
    }
  };
  return (
    <div className="plate record" role="group" aria-label={t.record.title}>
      <div className="plate-engraved">{t.record.title}</div>
      <div className="rows">
        <div className="r">
          <span className="k">{t.record.hull}</span>
          <span className="v">{code}</span>
          <button onClick={copy} style={{ padding: '2px 8px', fontSize: 10 }} aria-label={t.record.linkAria(code)}>
            {copied === 'copied' ? t.record.copied : t.record.copyLink}
          </button>
        </div>
        {copied === 'manual' && <input readOnly autoFocus value={link} onFocus={(e) => e.currentTarget.select()} aria-label={t.record.linkAria(code)} />}
        <div className="r"><span className="k">{t.record.run}</span><span className="v">{runNumber}</span></div>
        {!compact && (
          <>
            <div className="r"><span className="k">{t.record.profile}</span><span className="v">{ngPlus ? t.record.plus : t.record.classic}</span></div>
            <div className="r">
              <span className="k">{t.record.calls}</span>
              <span className="v">{toolCalls}{meta.bestToolCalls !== null && ` · ${t.record.best} ${meta.bestToolCalls}`}</span>
            </div>
            <div className="r"><span className="k">{t.record.waves}</span><span className="v">{waves}</span></div>
            <div className="r lamps">
              <RecordLamp lit={proof} label={t.record.proof} />
              <RecordLamp lit={beacon} label={t.record.beacon} />
              <RecordLamp lit={contained} label={t.record.contained} />
            </div>
          </>
        )}
        <div className="r lamps" aria-label={t.record.endings}>
          <RecordLamp lit={leaveSeen} label={t.record.leave} />
          <RecordLamp lit={seen('restore')} label={t.record.restore} />
          <RecordLamp lit={seen('broadcast')} label={t.record.broadcast} />
          <RecordLamp lit={staySeen} label={staySeen ? t.record.stay : t.record.unknown} />
        </div>
      </div>
    </div>
  );
}
