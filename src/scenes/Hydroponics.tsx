import { useGame } from '../ui/useGame';
import { useStrings } from '../ui/useLocale';
import { retrieveSpike, setIrrigation } from '../game/store';
import { irrigationReport } from '../game/derived';
import { secretsFor } from '../game/secrets';
import { SPIKE_BED, WATER_BUDGET } from '../game/content';

function Vine({ x, y, size }: { x: number; y: number; size: number }) {
  // deterministic vine: three bezier stems with leaf ellipses; `size` 0..1 scales it
  const stems = [
    `M ${x} ${y} C ${x - 8} ${y - 14 * size}, ${x - 22} ${y - 18 * size}, ${x - 26} ${y - 34 * size}`,
    `M ${x} ${y} C ${x + 6} ${y - 16 * size}, ${x + 18} ${y - 22 * size}, ${x + 24} ${y - 38 * size}`,
    `M ${x} ${y} C ${x - 2} ${y - 20 * size}, ${x + 4} ${y - 30 * size}, ${x - 6} ${y - 44 * size}`,
  ];
  return (
    <g opacity={0.35 + 0.65 * size}>
      {stems.map((d, i) => <path key={i} d={d} fill="none" stroke="#3f7a4a" strokeWidth={1.6} />)}
      {[[-26, -34], [24, -38], [-6, -44], [-14, -20], [12, -24]].map(([dx, dy], i) => (
        <ellipse key={i} cx={x + dx * size} cy={y + dy * size} rx={5 * size} ry={2.6 * size} fill="#4f9a5c" transform={`rotate(${i * 37} ${x + dx * size} ${y + dy * size})`} />
      ))}
    </g>
  );
}

function Beds() {
  const seed = useGame((s) => s.seed);
  const irrigation = useGame((s) => s.chapter2.irrigation);
  const solved = useGame((s) => s.chapter2.irrigationSolved);
  const state = useGame((s) => s);
  const t = useStrings();
  const needs = secretsFor(seed).waterNeeds;
  const report = irrigationReport(state);
  const total = report.total;
  const bedsAria = `${t.hydro.bedsTitle} — ${needs.map((n, i) => `${t.hydro.bed(i + 1)}: ${t.hydro.needTag(n)}`).join('; ')}`;
  return (
    <div className="panel">
      <h2>{t.hydro.bedsTitle}</h2>
      <p className="status-dim">{t.hydro.bedsDesc}</p>
      <svg viewBox="0 0 360 150" width="100%" style={{ maxWidth: 540, display: 'block' }} role="img" aria-label={bedsAria}>
        <defs>
          <linearGradient id="hy-soil" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a2a1a" />
            <stop offset="100%" stopColor="#1a1410" />
          </linearGradient>
          <linearGradient id="hy-water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a7a8a" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#1a3a4a" stopOpacity="0.75" />
          </linearGradient>
        </defs>
        {/* steel trough */}
        <rect x="6" y="40" width="348" height="96" rx="6" fill="#131a16" stroke="#3a4a40" strokeWidth="2" />
        {[0, 1, 2].map((i) => {
          const x = 24 + i * 112;
          const level = irrigation[i] / 9; // 0..1
          const vineSize = i === SPIKE_BED ? (solved ? 0.35 : 1) : 0.6;
          return (
            <g key={i}>
              <rect x={x} y="56" width="96" height="70" rx="4" fill="url(#hy-soil)" stroke="#2a3a30" />
              <rect x={x + 2} y={124 - 66 * level} width="92" height={66 * level} fill="url(#hy-water)" style={{ transition: 'all 0.4s' }} />
              <Vine x={x + 48} y={120} size={vineSize} />
              {/* brass need tag */}
              <rect x={x + 30} y="132" width="36" height="12" rx="2" fill="#6a5630" stroke="#c9a55a" strokeWidth="0.75" />
              <text x={x + 48} y="141" textAnchor="middle" fontSize="7.5" fill="#f0dfb0" letterSpacing="1">{t.hydro.needTag(needs[i])}</text>
              <text x={x + 48} y="50" textAnchor="middle" fontSize="7" fill="var(--dim)" letterSpacing="1">{t.hydro.bed(i + 1)}</text>
              {/* bed state lamp */}
              <circle cx={x + 88} cy="62" r="3" fill={report.beds[i] === 'ok' ? 'var(--green)' : report.beds[i] === 'dry' ? '#7a5a28' : '#3a6a8a'} opacity={0.9} />
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 8 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <input type="range" min={0} max={9} value={irrigation[i]} style={{ width: 116 }}
              onChange={(e) => setIrrigation(i as 0 | 1 | 2, Number(e.target.value))} aria-label={t.hydro.valveAria(i + 1)} />
            <div>{t.hydro.bed(i + 1)}: <strong style={{ color: 'var(--amber)' }}>{irrigation[i]}u</strong></div>
          </div>
        ))}
      </div>
      {/* budget tank meter */}
      <div style={{ marginTop: 12, maxWidth: 360 }}>
        <div className="status-dim" style={{ fontSize: 12 }}>{t.hydro.budget}: {total}/{WATER_BUDGET}u</div>
        <div style={{ position: 'relative', height: 12, background: '#0c110e', border: '1px solid var(--line)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 1, width: `${Math.min(100, (total / WATER_BUDGET) * 100)}%`, background: report.overBudget ? 'var(--red)' : 'linear-gradient(180deg, #7ac8d8, #3a7a8a)', transition: 'width 0.3s' }} />
        </div>
        {report.overBudget ? <p className="status-bad">{t.hydro.over}</p> : <p className="status-dim">{t.hydro.cycleHint}</p>}
      </div>
    </div>
  );
}

function SpikeBed() {
  const solved = useGame((s) => s.chapter2.irrigationSolved);
  const pulled = useGame((s) => s.chapter2.spikeRetrieved);
  const t = useStrings();
  return (
    <div className="panel">
      <h2>{t.hydro.spikeTitle}</h2>
      {pulled ? (
        <p className="status-ok">{t.hydro.spikePulled}</p>
      ) : solved ? (
        <>
          <p className="status-ok blink">{t.hydro.spikeRevealed}</p>
          <button onClick={() => retrieveSpike()}>{t.hydro.pullSpike}</button>
        </>
      ) : (
        <p className="status-dim">{t.hydro.spikeHidden}</p>
      )}
    </div>
  );
}

export function Hydroponics() {
  const t = useStrings();
  return (
    <div className="scene">
      <div className="panel">
        <h2>{t.hydro.title}</h2>
        <p>{t.hydro.intro}</p>
      </div>
      <Beds />
      <SpikeBed />
    </div>
  );
}
