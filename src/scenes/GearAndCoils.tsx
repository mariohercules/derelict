import { useGame } from '../ui/useGame';
import { useStrings } from '../ui/useLocale';
import { seatGear, setPhase } from '../game/store';
import { enginesOnline } from '../game/derived';
import { variantSecretsFor } from '../game/variants';

function GearGlyph({ cx, cy, r, teeth, seated }: { cx: number; cy: number; r: number; teeth: number; seated: boolean }) {
  // real, countable teeth: one triangular tooth per count around the rim
  const pts: string[] = [];
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * 2 * Math.PI;
    const a1 = ((i + 0.5) / teeth) * 2 * Math.PI;
    const a2 = ((i + 1) / teeth) * 2 * Math.PI;
    pts.push(`${cx + r * Math.cos(a0)},${cy + r * Math.sin(a0)}`);
    pts.push(`${cx + (r + 6) * Math.cos(a1)},${cy + (r + 6) * Math.sin(a1)}`);
    pts.push(`${cx + r * Math.cos(a2)},${cy + r * Math.sin(a2)}`);
  }
  return (
    <g>
      <polygon points={pts.join(' ')} fill="url(#gc-steel)" stroke={seated ? 'var(--amber)' : 'var(--steel)'} strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r={r - 8} fill="var(--face)" stroke="var(--line)" />
      <circle cx={cx} cy={cy} r="5" fill="url(#gc-brass)" stroke="var(--brass-lo)" />
    </g>
  );
}

function PhaseDial({ label, value, onChange, aria }: { label: string; value: number; onChange: (v: number) => void; aria: string }) {
  const a = (value / 12) * 2 * Math.PI - Math.PI / 2;
  return (
    <div style={{ textAlign: 'center' }}>
      <svg viewBox="0 0 80 92" width="88" role="img" aria-label={`${aria}: ${value}`}>
        <circle cx="40" cy="40" r="34" fill="var(--face)" stroke="var(--steel)" strokeWidth="3" />
        <circle cx="40" cy="40" r="29" fill="var(--face-deep)" stroke="var(--line)" />
        {Array.from({ length: 12 }, (_, i) => {
          const t = (i / 12) * 2 * Math.PI - Math.PI / 2;
          const major = i % 3 === 0;
          return <line key={i} x1={40 + 24 * Math.cos(t)} y1={40 + 24 * Math.sin(t)} x2={40 + (major ? 18 : 21) * Math.cos(t)} y2={40 + (major ? 18 : 21) * Math.sin(t)} stroke={major ? 'var(--steel-hi)' : 'var(--steel-mid)'} strokeWidth={major ? 2 : 1} />;
        })}
        <line x1="40" y1="40" x2={40 + 20 * Math.cos(a)} y2={40 + 20 * Math.sin(a)} stroke="var(--amber)" strokeWidth="2.5" style={{ transition: 'x2 0.2s, y2 0.2s' }} />
        <circle cx="40" cy="40" r="3.5" fill="var(--steel-lo)" stroke="var(--steel)" />
        <rect x="22" y="76" width="36" height="13" rx="2" fill="var(--panel-solid)" stroke="var(--line)" />
        <text x="40" y="85.5" textAnchor="middle" fontSize="7" fill="var(--text)" letterSpacing="1">{label}</text>
      </svg>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
        <button onClick={() => onChange((value + 11) % 12)} aria-label={`${aria} −`} style={{ padding: '2px 10px' }}>▼</button>
        <button onClick={() => onChange((value + 1) % 12)} aria-label={`${aria} +`} style={{ padding: '2px 10px' }}>▲</button>
      </div>
    </div>
  );
}

export function GearAndCoils() {
  const seed = useGame((s) => s.seed);
  const gear = useGame((s) => s.chapter1v.gear);
  const phases = useGame((s) => s.chapter1v.phases);
  const online = useGame((s) => enginesOnline(s));
  const t = useStrings();
  const v = variantSecretsFor(seed);
  const tray = [v.gearTeeth.target, ...v.gearTeeth.decoys];
  // the engraved plates lie: each gear wears a neighbour's count
  const plates = [tray[1], tray[2], tray[0]];
  return (
    <>
      <div className="panel">
        <h2>{t.eng.gcTitle}</h2>
        <p className="status-dim">{t.eng.gcDesc}</p>
        <svg viewBox="0 0 320 110" width="100%" style={{ maxWidth: 520, display: 'block' }} role="img" aria-label={t.eng.gcTrayAria}>
          <defs>
            <linearGradient id="gc-steel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--steel-hi)" />
              <stop offset="100%" stopColor="var(--steel-lo)" />
            </linearGradient>
            <linearGradient id="gc-brass" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--brass-hi)" />
              <stop offset="100%" stopColor="var(--brass-lo)" />
            </linearGradient>
          </defs>
          <rect x="4" y="4" width="312" height="102" rx="6" fill="var(--face)" stroke="var(--steel)" strokeWidth="3" />
          {tray.map((teeth, i) => (
            <g key={teeth}>
              <GearGlyph cx={62 + i * 98} cy={48} r={24} teeth={teeth} seated={gear === teeth} />
              <rect x={44 + i * 98} y="84" width="36" height="13" rx="2" fill="var(--panel-solid)" stroke="var(--line)" />
              <text x={62 + i * 98} y="93.5" textAnchor="middle" fontSize="7" fill="var(--dim)" letterSpacing="1">{plates[i]}T</text>
            </g>
          ))}
        </svg>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
          {tray.map((teeth) => (
            <button key={teeth} onClick={() => seatGear(teeth)} disabled={gear === teeth} aria-label={t.eng.gcGearAria(teeth)}>
              {gear === teeth ? t.eng.gcSeated : t.eng.gcSeat}
            </button>
          ))}
        </div>
      </div>
      <div className="panel">
        <h2>{t.eng.gcCoilsTitle}</h2>
        <p className="status-dim">{t.eng.gcCoilsDesc}</p>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          {(['A', 'B', 'C'] as const).map((label, i) => (
            <PhaseDial key={label} label={t.eng.gcCoil(label)} value={phases[i]} aria={t.eng.gcPhaseAria(label)}
              onChange={(val) => setPhase(i as 0 | 1 | 2, val)} />
          ))}
        </div>
        {online && <p className="status-ok">{t.eng.enginesHum}</p>}
      </div>
    </>
  );
}
