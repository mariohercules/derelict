import { useEffect, useRef, useState } from 'react';
import { RoomPlate } from '../ui/RoomPlate';
import { inspect } from '../ui/inspect';
import { useGame } from '../ui/useGame';
import { useLocale, useStrings } from '../ui/useLocale';
import { dialSafe, playRecorder } from '../game/store';
import { getRecorderTranscript } from '../game/narrative';
import { variantFor } from '../game/variants';
import { DrawingWall, KeyedSafe } from './KeyedSafe';
import { startRecorderPlayback, type PlaybackStatus } from '../audio/recorder';
import { usePrefs } from '../ui/usePrefs';
import okaforEn from '../assets/okafor-en.mp3';
import okaforPt from '../assets/okafor-pt.mp3';
import quartersRoom from '../assets/quarters-room.webp';
import quartersRoomSmall from '../assets/quarters-room-small.webp';

function Wheel({ value, onUp, onDown, aria, disabled, index }: { value: number; onUp: () => void; onDown: () => void; aria: string; disabled: boolean; index: number }) {
  const prev = (value + 9) % 10;
  const next = (value + 1) % 10;
  const gradientId = `q-drum-${index}`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <button onClick={onUp} disabled={disabled} aria-label={`${aria} +`} style={{ padding: '2px 10px', minWidth: 44, minHeight: 44 }}>▲</button>
      <svg viewBox="0 0 40 60" width="40" role="img" aria-label={`${aria}: ${value}`}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2b2416" />
            <stop offset="50%" stopColor="#6a5630" />
            <stop offset="100%" stopColor="#2b2416" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="36" height="56" rx="5" fill={`url(#${gradientId})`} stroke="#8a7040" />
        <text x="20" y="16" textAnchor="middle" fontSize="9" fill="#a8905a" opacity="0.5">{prev}</text>
        <rect x="6" y="22" width="28" height="16" rx="2" fill="var(--hull)" stroke="var(--brass)" />
        <text x="20" y="34" textAnchor="middle" fontSize="12" fill="var(--amber)" fontWeight="bold">{value}</text>
        <text x="20" y="52" textAnchor="middle" fontSize="9" fill="#a8905a" opacity="0.5">{next}</text>
      </svg>
      <button onClick={onDown} disabled={disabled} aria-label={`${aria} −`} style={{ padding: '2px 10px', minWidth: 44, minHeight: 44 }}>▼</button>
    </div>
  );
}

// Decorative brass-toned bezel plate behind the wheel tray — stretches to fill
// whatever box the in-flow wheel row (its sibling) establishes.
function SafeBezel() {
  return (
    <svg viewBox="0 0 200 170" preserveAspectRatio="none" width="100%" height="100%"
      style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
      <defs>
        <linearGradient id="q-safe-bezel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a8905a" />
          <stop offset="50%" stopColor="#5a4a28" />
          <stop offset="100%" stopColor="#8a7040" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="196" height="166" rx="10" fill="url(#q-safe-bezel)" stroke="#3a2f18" strokeWidth="3" />
      <rect x="10" y="10" width="180" height="122" rx="6" fill="var(--panel-solid)" stroke="var(--line)" strokeWidth="2" />
      <rect x="34" y="140" width="132" height="22" rx="3" fill="var(--hull)" stroke="var(--amber)" strokeWidth="1" />
      <text x="100" y="156" textAnchor="middle" fontSize="11" letterSpacing="2" fill="var(--amber)">VASQUEZ · PERSONAL</text>
    </svg>
  );
}

function Safe() {
  const opened = useGame((s) => s.chapter2.safeOpened);
  const t = useStrings();
  const [combo, setCombo] = useState<[number, number, number]>([0, 0, 0]);
  const [last, setLast] = useState<'shut' | null>(null);
  const turn = (i: 0 | 1 | 2, d: 1 | -1) =>
    setCombo((c) => { const n = [...c] as [number, number, number]; n[i] = (n[i] + 10 + d) % 10; return n; });
  return (
    <div className="panel">
      <h2>{t.quarters.safeTitle}</h2>
      <p className="status-dim">{t.quarters.safeDesc}</p>
      <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <SafeBezel />
          <div style={{ position: 'relative', display: 'flex', gap: 10, padding: '18px 16px 40px' }}>
            {([0, 1, 2] as const).map((i) => (
              <Wheel key={i} index={i} value={combo[i]} aria={t.quarters.wheelAria(i + 1)} disabled={opened}
                onUp={() => turn(i, 1)} onDown={() => turn(i, -1)} />
            ))}
          </div>
        </div>
        {/* handle: drops when the bolt slides */}
        <svg viewBox="0 0 60 60" width="60" aria-hidden="true">
          <circle cx="30" cy="30" r="24" fill="var(--panel-solid)" stroke="#8a7040" strokeWidth="3" />
          <g style={{ transition: 'transform 0.5s', transform: opened ? 'rotate(60deg)' : 'rotate(0deg)', transformOrigin: '30px 30px' }}>
            <rect x="27" y="8" width="6" height="26" rx="3" fill="var(--brass)" />
          </g>
          <circle cx="30" cy="30" r="4" fill="var(--brass)" />
        </svg>
        {!opened && <button onClick={() => setLast(dialSafe(combo).ok ? null : 'shut')}>{t.quarters.tryHandle}</button>}
      </div>
      {opened && <p className="status-ok" style={{ marginTop: 10 }}>{t.quarters.safeOpen}</p>}
      {opened && <p className="status-dim">{t.quarters.driveNote}</p>}
      {!opened && last === 'shut' && <p className="status-dim" style={{ marginTop: 10 }}>{t.quarters.safeShut}</p>}
    </div>
  );
}

function Recorder() {
  const played = useGame((s) => s.chapter2.recorderPlayed);
  const locale = useLocale();
  const t = useStrings();
  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const muted = usePrefs(p => p.muted);
  const playing = status === 'playing';
  const busy = playing || status === 'loading';
  const transcript = getRecorderTranscript();
  const bars = Array.from({ length: 24 }, (_, i) => 4 + ((transcript.charCodeAt(i * 7 % transcript.length) * 7) % 18));
  const audioRef = useRef<HTMLAudioElement>(null);
  const playButton = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const session = useRef<ReturnType<typeof startRecorderPlayback> | null>(null);
  useEffect(() => {
    if (!busy && restoreFocus.current) { restoreFocus.current = false; playButton.current?.focus(); }
  }, [busy]);
  useEffect(() => {
    setStatus('idle');
    return () => { session.current?.dispose(); session.current = null; };
  }, [locale]);
  const play = () => {
    session.current?.dispose();
    playRecorder();
    if (audioRef.current) session.current = startRecorderPlayback(audioRef.current, transcript,
      locale === 'pt-BR' ? 'pt-BR' : 'en-US', setStatus);
  };

  return (
    <div className="panel recorder-panel" data-playback={status}>
      <audio ref={audioRef} src={locale === 'pt-BR' ? okaforPt : okaforEn} preload="none" />
      <h2>{t.quarters.recorderTitle}</h2>
      <p className="status-dim">{t.quarters.recorderDesc}</p>
      <svg viewBox="0 0 320 120" width="100%" style={{ maxWidth: 480, display: 'block' }} aria-hidden="true">
        <rect x="4" y="4" width="312" height="112" rx="8" fill="var(--panel-solid)" stroke="var(--steel)" strokeWidth="2" />
        {[80, 240].map((cx, i) => (
          <g key={cx} className={playing ? 'reel-spinning' : undefined}>
            <circle cx={cx} cy="50" r={i === 0 ? 34 : 24} fill="var(--hull)" stroke="#5a4a30" strokeWidth="3" />
            <circle cx={cx} cy="50" r="7" fill="#2a2216" stroke="#8a7040" />
            {[0, 120, 240].map((a) => (
              <line key={a} x1={cx} y1="50" x2={cx + 20 * Math.cos((a * Math.PI) / 180)} y2={50 + 20 * Math.sin((a * Math.PI) / 180)} stroke="#5a4a30" strokeWidth="3" />
            ))}
          </g>
        ))}
        <path d="M 80 84 Q 160 96 240 74" fill="none" stroke="#6a5630" strokeWidth="2" />
        {/* VU bars */}
        {bars.map((h, i) => (
          <rect key={i} x={40 + i * 10} y={110 - h} width="6" height={h} fill={playing ? 'var(--green)' : 'var(--line)'} opacity={playing ? 0.85 : 0.6} />
        ))}
        <circle cx="300" cy="18" r="4" fill={playing ? 'var(--red)' : '#2a1414'} stroke="#3a2020" />
        <text x="292" y="30" fontSize="6" fill="var(--dim)" textAnchor="middle">PLAY</text>
      </svg>
      <div className="recorder-controls">
        <button ref={playButton} onClick={play} disabled={busy}>{playing ? t.quarters.playing : status === 'loading' ? t.quarters.loading : t.quarters.play}</button>
        {busy && <button onClick={() => { restoreFocus.current = true; session.current?.stop(); }}>{t.quarters.stop}</button>}
      </div>
      <div role="status">
        {played && muted && <p className="status-dim">{t.quarters.muted}</p>}
        {status === 'unavailable' && !muted && <p className="status-dim">{t.quarters.playbackFailed}</p>}
      </div>
      {played && (
        <div style={{ marginTop: 10 }}>
          <p className="status-dim">{t.quarters.transcriptLabel}</p>
          <p style={{ fontStyle: 'italic' }}>"{transcript}"</p>
        </div>
      )}
    </div>
  );
}

export function CrewQuarters() {
  const seed = useGame((s) => s.seed);
  const keyed = variantFor(seed, 'crew_quarters') === 1;
  const t = useStrings();
  return (
    <div className="scene quarters-scene">
      <header className="quarters-heading">
        <div><span className="scene-eyebrow">{t.quarters.sector}</span><h1>{t.quarters.title}</h1></div>
        <span className="quarters-residents">VASQUEZ / OKAFOR</span>
      </header>
      <div className="quarters-panorama">
        <RoomPlate src={quartersRoom} small={quartersRoomSmall} />
        <div className="quarters-lamplight" aria-hidden="true" />
        <span className="quarters-serial" aria-hidden="true">CMR / HABITAT</span>
        <p className="quarters-caption">{t.quarters.intro}</p>
      </div>
      <nav className="quarters-stations" aria-label={t.quarters.stationNav}>
        {[
          ['quarters-safe', t.quarters.safeTitle],
          ['quarters-recorder', t.quarters.recorderTitle],
          ['quarters-drawings', t.quarters.wallTitle],
        ].map(([id, label], index) => <button key={id} onClick={() => inspect(id)}><span aria-hidden="true">0{index + 1}</span><strong>{label}</strong><span aria-hidden="true">↘</span></button>)}
      </nav>
      <div className="quarters-objects">
        <section id="quarters-safe" tabIndex={-1} aria-label={t.quarters.safeTitle}>{keyed ? <KeyedSafe /> : <Safe />}</section>
        <section id="quarters-recorder" tabIndex={-1} aria-label={t.quarters.recorderTitle}><Recorder /></section>
        <section id="quarters-drawings" tabIndex={-1} aria-label={t.quarters.wallTitle}>
          {keyed ? <DrawingWall /> : <div className="panel"><h2>{t.quarters.wallTitle}</h2><p className="status-dim">{t.quarters.wallDesc}</p></div>}
        </section>
      </div>
    </div>
  );
}
