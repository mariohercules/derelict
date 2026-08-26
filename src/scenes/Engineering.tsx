import { useGame } from '../ui/useGame';
import { useStrings } from '../ui/useLocale';
import { installFuse, setValve, enterRoom } from '../game/store';
import { doorsPowered, enginesOnline, valvesCorrect } from '../game/derived';
import { GAUGE_PRESSURES } from '../game/content';
import type { FuseRating, SubsystemId } from '../game/types';

function Gauge({ label, pressure, ariaLabel }: { label: string; pressure: number; ariaLabel: string }) {
  // 0–120 PSI sweep mapped to -120°..+120°; the number itself is never rendered as text
  const angle = (pressure / 120) * 240 - 120;
  return (
    <svg viewBox="0 0 100 85" width="120" role="img" aria-label={ariaLabel}>
      <path d="M 10 60 A 45 45 0 1 1 90 60" fill="none" stroke="var(--line)" strokeWidth="4" />
      {[0, 30, 60, 90, 120].map((tick) => {
        const a = ((tick / 120) * 240 - 210) * (Math.PI / 180);
        return (
          <g key={tick}>
            <line
              x1={50 + 38 * Math.cos(a)} y1={60 + 38 * Math.sin(a)}
              x2={50 + 45 * Math.cos(a)} y2={60 + 45 * Math.sin(a)}
              stroke="var(--dim)" strokeWidth="2"
            />
            <text x={50 + 30 * Math.cos(a)} y={60 + 30 * Math.sin(a)} fill="var(--dim)" fontSize="7" textAnchor="middle">
              {tick}
            </text>
          </g>
        );
      })}
      <line
        x1="50" y1="60"
        x2={50 + 40 * Math.cos((angle - 90) * (Math.PI / 180))}
        y2={60 + 40 * Math.sin((angle - 90) * (Math.PI / 180))}
        stroke="var(--amber)" strokeWidth="3"
      />
      <text x="50" y="68" fill="var(--text)" fontSize="8" textAnchor="middle">{label}</text>
    </svg>
  );
}

const FUSES: { rating: FuseRating; bands: string[] }[] = [
  { rating: '5A', bands: ['#c0392b'] },
  { rating: '10A', bands: ['#ffb454', '#ffb454'] },
  { rating: '15A', bands: ['#27ae60', '#27ae60', '#27ae60'] },
];

function FuseBox() {
  const installed = useGame((s) => s.fuseInstalled);
  const t = useStrings();
  return (
    <div className="panel">
      <h2>{t.eng.fuseTitle}</h2>
      <p className="status-dim">{t.eng.fuseDesc}</p>
      <div style={{ display: 'flex', gap: 16 }}>
        {FUSES.map((f) => (
          <button key={f.rating} onClick={() => installFuse(f.rating)} disabled={installed === f.rating}
            aria-label={t.eng.fuseAria(f.bands.length)}>
            <svg viewBox="0 0 60 24" width="60">
              <rect x="2" y="4" width="56" height="16" rx="8" fill="#1d2620" stroke="var(--line)" />
              {f.bands.map((c, i) => (
                <rect key={i} x={14 + i * 12} y="4" width="7" height="16" fill={c} />
              ))}
            </svg>
            {installed === f.rating ? t.eng.seated : t.eng.seatIt}
          </button>
        ))}
      </div>
    </div>
  );
}

function CoolantManifold() {
  const valves = useGame((s) => s.valveSettings);
  const ok = useGame(valvesCorrect);
  const t = useStrings();
  return (
    <div className="panel">
      <h2>{t.eng.coolant}</h2>
      <p className="status-dim">{t.eng.coolantDesc}</p>
      <div style={{ display: 'flex', gap: 24 }}>
        {GAUGE_PRESSURES.map((p, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <Gauge label={t.eng.line(i + 1)} pressure={p} ariaLabel={t.eng.gaugeAria(t.eng.line(i + 1))} />
            <input
              type="range" min={0} max={9} value={valves[i]}
              onChange={(e) => setValve(i as 0 | 1 | 2, Number(e.target.value))}
              aria-label={t.eng.valveAria(i + 1)}
            />
            <div>{t.eng.valve} {valves[i]}</div>
          </div>
        ))}
      </div>
      {ok && <p className="status-ok">{t.eng.flowSteadies}</p>}
    </div>
  );
}

function PowerBoard() {
  const alloc = useGame((s) => s.powerAllocation);
  const t = useStrings();
  const order: SubsystemId[] = ['life_support', 'doors', 'medbay', 'engines', 'comms'];
  return (
    <div className="panel">
      <h2>{t.eng.powerBoard}</h2>
      <p className="status-dim">{t.eng.readOnly}</p>
      {order.map((id) => (
        <div key={id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ width: 110 }}>{t.eng.subsystems[id]}</span>
          <span style={{ color: 'var(--amber)' }}>{'█'.repeat(alloc[id])}</span>
          <span className="status-dim">{alloc[id]}u</span>
        </div>
      ))}
    </div>
  );
}

function BridgeDoor() {
  const unlocked = useGame((s) => s.doors.engineering_exit);
  const powered = useGame(doorsPowered);
  const engines = useGame(enginesOnline);
  const t = useStrings();
  return (
    <div className="panel">
      <h2>{t.eng.ladderUp}</h2>
      {engines && <p className="status-ok">{t.eng.enginesHum}</p>}
      {unlocked ? (
        <button onClick={() => enterRoom('bridge')}>{t.eng.climbUp}</button>
      ) : (
        <p className={powered ? 'status-bad' : 'status-dim'}>
          {powered ? t.eng.servosPowered : t.eng.servosUnpowered}
        </p>
      )}
    </div>
  );
}

export function Engineering() {
  const t = useStrings();
  return (
    <div className="scene">
      <div className="panel">
        <h2>{t.eng.title}</h2>
        <p>{t.eng.intro}</p>
      </div>
      <PowerBoard />
      <FuseBox />
      <CoolantManifold />
      <BridgeDoor />
    </div>
  );
}
