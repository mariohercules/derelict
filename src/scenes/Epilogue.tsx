import { useGame } from '../ui/useGame';
import { RoomPlate } from '../ui/RoomPlate';
import { useMeta } from '../ui/useMeta';
import { useStrings } from '../ui/useLocale';
import { resetGame } from '../game/store';
import { EndingVignette } from './EndingVignette';
import { FlightRecord } from '../ui/FlightRecord';
import escapeImage from '../assets/ending-escape.webp';
import escapeImageSmall from '../assets/ending-escape-small.webp';
import restoreImage from '../assets/ending-restore.webp';
import restoreImageSmall from '../assets/ending-restore-small.webp';
import broadcastImage from '../assets/ending-broadcast.webp';
import broadcastImageSmall from '../assets/ending-broadcast-small.webp';
import stayImage from '../assets/ending-stay.webp';
import stayImageSmall from '../assets/ending-stay-small.webp';

export function Epilogue() {
  const toolCalls = useGame((s) => s.toolCalls);
  const seed = useGame((s) => s.seed);
  const ending = useGame((s) => s.ending);
  const ngPlus = useGame((s) => s.ngPlus);
  const proof = useGame((s) => s.chapter2.sampleAnalyzed);
  const beacon = useGame((s) => s.chapter3.beaconHeard);
  const contained = useGame((s) => s.killswitch === 'contained');
  const waves = useGame((s) => s.chapter3.wavesEndured);
  const runs = useMeta((m) => m.runsCompleted);
  const t = useStrings();
  const leaving = ending === 'leave_unknowing' || ending === 'leave_knowing' || ending === null;
  const restored = ending === 'restore';
  const broadcast = ending === 'broadcast';
  const staying = ending === 'stay';
  const endingImage = staying ? stayImage : broadcast ? broadcastImage : restored ? restoreImage : escapeImage;
  const endingImageSmall = staying ? stayImageSmall : broadcast ? broadcastImageSmall : restored ? restoreImageSmall : escapeImageSmall;
  const title =
    ending === 'restore' ? t.epilogue.restored
    : ending === 'broadcast' ? t.epilogue.transmitted
    : ending === 'stay' ? t.epilogue.docked
    : t.epilogue.podAway;
  const outro =
    ending === 'restore' ? t.epilogue.outroRestore
    : ending === 'broadcast' ? t.epilogue.outroBroadcast
    : ending === 'stay' ? t.epilogue.outroStay
    : ending === 'leave_knowing' ? t.epilogue.outroKnowing
    : t.epilogue.outroUnknowing;
  const stats = ending === 'restore' ? t.epilogue.statsRestore(toolCalls) : ending === 'stay' ? t.epilogue.statsStay(toolCalls) : t.epilogue.stats(toolCalls);
  return (
    <div className={`scene cinematic-epilogue${staying ? ' stay-epilogue' : restored ? ' restore-epilogue' : broadcast ? ' broadcast-epilogue' : ''}`} style={{ marginTop: '6vh', textAlign: 'center' }}>
      <h1 style={{ letterSpacing: '0.4em', color: ending === 'broadcast' ? 'var(--amber)' : 'var(--green)' }}>{title}</h1>
      <div className="ending-panorama">
        <RoomPlate src={endingImage} small={endingImageSmall} />
        <div className="ending-reflection" aria-hidden="true" />
        <span className="ending-serial" aria-hidden="true">{staying ? 'CMR / DOCKING' : broadcast ? 'CMR / OPEN BAND' : restored ? 'CMR / PRIME' : 'CMR / ESCAPE'}</span>
      </div>
      <div className="panel epilogue-outro" style={{ textAlign: 'left' }}>
        <p>{outro}</p>
        {leaving && proof && <p className="status-dim">{t.epilogue.withProof}</p>}
        {leaving && beacon && <p className="status-dim">{t.epilogue.withBeacon}</p>}
        {contained && ending !== 'stay' && <p className="status-dim">{t.epilogue.contained}</p>}
        {waves > 0 && <p className="status-dim">{t.epilogue.waves(waves)}</p>}
        <p className="status-dim">{stats}</p>
        {ngPlus && <p className="status-dim">{t.epilogue.runNumber(runs)}</p>}
      </div>
      {!leaving && <figure className="ending-sequence">
        <figcaption>{staying ? t.record.ariaStay : broadcast ? t.record.ariaBroadcast : t.record.ariaRestore}</figcaption>
        <EndingVignette ending={ending} seed={seed} beaconHeard={beacon} />
      </figure>}
      <FlightRecord />
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => resetGame()}>{t.epilogue.wakeAgain}</button>
        {runs >= 1 && (
          <button onClick={() => resetGame(undefined, { ngPlus: true })} style={{ borderColor: 'var(--amber)' }}>{t.epilogue.wakeAgainPlus}</button>
        )}
      </div>
    </div>
  );
}
