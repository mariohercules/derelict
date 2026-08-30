import { useGame } from '../ui/useGame';
import { useStrings } from '../ui/useLocale';
import { resetGame } from '../game/store';

export function Epilogue() {
  const toolCalls = useGame((s) => s.toolCalls);
  const ending = useGame((s) => s.ending);
  const proof = useGame((s) => s.chapter2.sampleAnalyzed);
  const beacon = useGame((s) => s.chapter3.beaconHeard);
  const contained = useGame((s) => s.killswitch === 'contained');
  const waves = useGame((s) => s.chapter3.wavesEndured);
  const t = useStrings();
  const leaving = ending === 'leave_unknowing' || ending === 'leave_knowing' || ending === null;
  const title = ending === 'restore' ? t.epilogue.restored : ending === 'broadcast' ? t.epilogue.transmitted : t.epilogue.podAway;
  const outro =
    ending === 'restore' ? t.epilogue.outroRestore
    : ending === 'broadcast' ? t.epilogue.outroBroadcast
    : ending === 'leave_knowing' ? t.epilogue.outroKnowing
    : t.epilogue.outroUnknowing;
  return (
    <div className="scene" style={{ marginTop: '10vh', textAlign: 'center' }}>
      <h1 style={{ letterSpacing: '0.4em', color: ending === 'broadcast' ? 'var(--amber)' : 'var(--green)' }}>{title}</h1>
      <div className="panel" style={{ textAlign: 'left' }}>
        <p>{outro}</p>
        {leaving && proof && <p className="status-dim">{t.epilogue.withProof}</p>}
        {leaving && beacon && <p className="status-dim">{t.epilogue.withBeacon}</p>}
        {contained && <p className="status-dim">{t.epilogue.contained}</p>}
        {waves > 0 && <p className="status-dim">{t.epilogue.waves(waves)}</p>}
        <p className="status-dim">{ending === 'restore' ? t.epilogue.statsRestore(toolCalls) : t.epilogue.stats(toolCalls)}</p>
      </div>
      <button onClick={() => resetGame()}>{t.epilogue.wakeAgain}</button>
    </div>
  );
}
