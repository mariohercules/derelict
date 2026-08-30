import { useEffect, useRef, useState } from 'react';
import { useGame } from '../ui/useGame';
import { useLocale, useStrings } from '../ui/useLocale';
import { dialSafe, playRecorder } from '../game/store';
import { getRecorderTranscript } from '../game/narrative';

function Wheel({ value, onUp, onDown, aria, disabled, index }: { value: number; onUp: () => void; onDown: () => void; aria: string; disabled: boolean; index: number }) {
  const prev = (value + 9) % 10;
  const next = (value + 1) % 10;
  const gradientId = `q-drum-${index}`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <button onClick={onUp} disabled={disabled} aria-label={`${aria} +`} style={{ padding: '2px 10px' }}>▲</button>
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
        <rect x="6" y="22" width="28" height="16" rx="2" fill="#0a0e0c" stroke="#c9a55a" />
        <text x="20" y="34" textAnchor="middle" fontSize="12" fill="var(--amber)" fontWeight="bold">{value}</text>
        <text x="20" y="52" textAnchor="middle" fontSize="9" fill="#a8905a" opacity="0.5">{next}</text>
      </svg>
      <button onClick={onDown} disabled={disabled} aria-label={`${aria} −`} style={{ padding: '2px 10px' }}>▼</button>
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
          <circle cx="30" cy="30" r="24" fill="#131a16" stroke="#8a7040" strokeWidth="3" />
          <g style={{ transition: 'transform 0.5s', transform: opened ? 'rotate(60deg)' : 'rotate(0deg)', transformOrigin: '30px 30px' }}>
            <rect x="27" y="8" width="6" height="26" rx="3" fill="#c9a55a" />
          </g>
          <circle cx="30" cy="30" r="4" fill="#c9a55a" />
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
  const [playing, setPlaying] = useState(false);
  const [noSpeech, setNoSpeech] = useState(false);
  const transcript = getRecorderTranscript();
  const bars = Array.from({ length: 24 }, (_, i) => 4 + ((transcript.charCodeAt(i * 7 % transcript.length) * 7) % 18));
  // Bounded, deterministic fallback: some browsers (Chrome, notably) drop the
  // utterance's `end` event on long reads or after tab backgrounding, which
  // would otherwise leave the reels spinning and the button disabled forever.
  const fallbackMs = Math.min(90_000, 3_000 + transcript.length * 60);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => () => {
    clearTimer();
    try { window.speechSynthesis?.cancel(); } catch { /* no speech */ }
  }, []);

  const stop = () => {
    clearTimer();
    setPlaying(false);
  };

  const play = () => {
    playRecorder();
    clearTimer();
    setPlaying(true);
    // Armed unconditionally: it also covers the no-speech branch below, so the
    // reels run for a short deterministic stretch and then stop on their own.
    timerRef.current = setTimeout(() => {
      try { window.speechSynthesis?.cancel(); } catch { /* no speech */ }
      timerRef.current = null;
      setPlaying(false);
    }, fallbackMs);
    try {
      const synth = window.speechSynthesis;
      if (!synth) throw new Error('no speech');
      synth.cancel();
      const u = new SpeechSynthesisUtterance(transcript);
      u.lang = locale === 'pt-BR' ? 'pt-BR' : 'en-US';
      u.rate = 0.92;
      u.onend = () => stop();
      u.onerror = () => stop();
      synth.speak(u);
    } catch {
      setNoSpeech(true);
      // playing stays true; the armed fallback timer above stops it.
    }
  };

  return (
    <div className="panel">
      <h2>{t.quarters.recorderTitle}</h2>
      <p className="status-dim">{t.quarters.recorderDesc}</p>
      <svg viewBox="0 0 320 120" width="100%" style={{ maxWidth: 480, display: 'block' }} aria-hidden="true">
        <rect x="4" y="4" width="312" height="112" rx="8" fill="#131a16" stroke="#3a4a40" strokeWidth="2" />
        {[80, 240].map((cx, i) => (
          <g key={cx} className={playing ? 'reel-spinning' : undefined}>
            <circle cx={cx} cy="50" r={i === 0 ? 34 : 24} fill="#0a0e0c" stroke="#5a4a30" strokeWidth="3" />
            <circle cx={cx} cy="50" r="7" fill="#2a2216" stroke="#8a7040" />
            {[0, 120, 240].map((a) => (
              <line key={a} x1={cx} y1="50" x2={cx + 20 * Math.cos((a * Math.PI) / 180)} y2={50 + 20 * Math.sin((a * Math.PI) / 180)} stroke="#5a4a30" strokeWidth="3" />
            ))}
          </g>
        ))}
        <path d="M 80 84 Q 160 96 240 74" fill="none" stroke="#6a5630" strokeWidth="2" />
        {/* VU bars */}
        {bars.map((h, i) => (
          <rect key={i} x={40 + i * 10} y={110 - h} width="6" height={h} fill={playing ? 'var(--green)' : '#2a3a30'} opacity={playing ? 0.85 : 0.6} />
        ))}
        <circle cx="300" cy="18" r="4" fill={playing ? 'var(--red)' : '#2a1414'} stroke="#3a2020" />
        <text x="292" y="30" fontSize="6" fill="var(--dim)" textAnchor="middle">PLAY</text>
      </svg>
      <div style={{ marginTop: 10 }}>
        <button onClick={play} disabled={playing}>{playing ? t.quarters.playing : t.quarters.play}</button>
      </div>
      {noSpeech && <p className="status-dim">{t.quarters.noSpeech}</p>}
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
  const t = useStrings();
  return (
    <div className="scene">
      <div className="panel">
        <h2>{t.quarters.title}</h2>
        <p>{t.quarters.intro}</p>
      </div>
      <Safe />
      <Recorder />
      <div className="panel">
        <h2>{t.quarters.wallTitle}</h2>
        <p className="status-dim">{t.quarters.wallDesc}</p>
      </div>
    </div>
  );
}
