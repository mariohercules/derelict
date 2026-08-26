import { useGame } from '../ui/useGame';
import { installFuse, setValve, enterRoom } from '../game/store';
import { doorsPowered, enginesOnline, valvesCorrect } from '../game/derived';
import { GAUGE_PRESSURES } from '../game/content';
import type { FuseRating, SubsystemId } from '../game/types';

function Gauge({ label, pressure }: { label: string; pressure: number }) {
  // 0–120 PSI sweep mapped to -120°..+120°; the number itself is never rendered as text
  const angle = (pressure / 120) * 240 - 120;
  return (
    <svg viewBox="0 0 100 70" width="120" role="img" aria-label={`${label} analog gauge`}>
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
  return (
    <div className="panel">
      <h2>Engine feed — fuse socket</h2>
      <p className="status-dim">
        The old fuse is a blackened husk. Three spare cartridges sit in a tray, identical except for
        their color bands. No ratings printed anywhere, because the Cormorant respects tradition.
      </p>
      <div style={{ display: 'flex', gap: 16 }}>
        {FUSES.map((f) => (
          <button key={f.rating} onClick={() => installFuse(f.rating)} disabled={installed === f.rating}
            aria-label={`fuse cartridge with ${f.bands.length} bands`}>
            <svg viewBox="0 0 60 24" width="60">
              <rect x="2" y="4" width="56" height="16" rx="8" fill="#1d2620" stroke="var(--line)" />
              {f.bands.map((c, i) => (
                <rect key={i} x={14 + i * 12} y="4" width="7" height="16" fill={c} />
              ))}
            </svg>
            {installed === f.rating ? ' seated' : ' seat it'}
          </button>
        ))}
      </div>
    </div>
  );
}

function CoolantManifold() {
  const valves = useGame((s) => s.valveSettings);
  const ok = useGame(valvesCorrect);
  return (
    <div className="panel">
      <h2>Coolant manifold</h2>
      <p className="status-dim">
        Three analog gauges, still honest after everything. Below each, a numbered valve dial (0–9).
        The digital sensor for this manifold is dead — your AI will have to take your word for the readings.
      </p>
      <div style={{ display: 'flex', gap: 24 }}>
        {GAUGE_PRESSURES.map((p, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <Gauge label={`LINE ${i + 1}`} pressure={p} />
            <input
              type="range" min={0} max={9} value={valves[i]}
              onChange={(e) => setValve(i as 0 | 1 | 2, Number(e.target.value))}
              aria-label={`valve ${i + 1}`}
            />
            <div>valve: {valves[i]}</div>
          </div>
        ))}
      </div>
      {ok && <p className="status-ok">Coolant flow steadies. The pipes stop their complaining.</p>}
    </div>
  );
}

function PowerBoard() {
  const alloc = useGame((s) => s.powerAllocation);
  const order: SubsystemId[] = ['life_support', 'doors', 'medbay', 'engines', 'comms'];
  return (
    <div className="panel">
      <h2>Power distribution board</h2>
      <p className="status-dim">
        Read-only from this side of the glass — routing is done from the ship's side. That means your AI.
      </p>
      {order.map((id) => (
        <div key={id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ width: 110 }}>{id.replace('_', ' ')}</span>
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
  return (
    <div className="panel">
      <h2>Ladder up — to the bridge</h2>
      {engines && <p className="status-ok">Deep below, the engines settle into a healthy hum.</p>}
      {unlocked ? (
        <button onClick={() => enterRoom('bridge')}>Climb to the bridge →</button>
      ) : (
        <p className={powered ? 'status-bad' : 'status-dim'}>
          {powered
            ? 'Servos have power now — the lock still needs a release from the ship side.'
            : 'The hatch servos are unpowered. Doors need juice before they need manners.'}
        </p>
      )}
    </div>
  );
}

export function Engineering() {
  return (
    <div className="scene">
      <div className="panel">
        <h2>Engineering</h2>
        <p>
          The heart of the ship, running on a fraction of one. Whatever happened here, someone fought
          hard to keep this deck alive — and left notes only the ship can read.
        </p>
      </div>
      <PowerBoard />
      <FuseBox />
      <CoolantManifold />
      <BridgeDoor />
    </div>
  );
}
