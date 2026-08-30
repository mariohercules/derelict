import { useGame } from '../ui/useGame';
import { useStrings } from '../ui/useLocale';
import { examineMedband } from '../game/store';

// Deterministic ECG-like trace across a 300-wide strip: a flat baseline with
// periodic QRS spikes whose amplitude decays toward the induction band.
function tracePath(): string {
  const pts: string[] = [];
  for (let x = 0; x <= 230; x += 2) {
    const beat = x % 26;
    let y = 46;
    if (beat === 10) y = 40; // P
    if (beat === 14) y = 22; // R
    if (beat === 16) y = 58; // S
    if (beat === 20) y = 42; // T
    const decay = x > 170 ? (x - 170) / 60 : 0;
    y = 46 + (y - 46) * (1 - decay);
    pts.push(`${x === 0 ? 'M' : 'L'} ${x + 10} ${y.toFixed(1)}`);
  }
  return pts.join(' ');
}

function StripChart({ examined, aria }: { examined: boolean; aria: string }) {
  return (
    <svg viewBox="0 0 320 90" width="100%" style={{ maxWidth: 480, display: 'block' }} role="img" aria-label={aria}>
      <defs>
        <pattern id="mb-grid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#1f2b25" strokeWidth="0.5" />
        </pattern>
        <pattern id="mb-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#3a4a40" strokeWidth="1.5" />
        </pattern>
      </defs>
      {/* paper strip with sprocket holes */}
      <rect x="2" y="2" width="316" height="86" rx="3" fill="#0f1512" stroke="#2a3a30" />
      <rect x="10" y="10" width="300" height="70" fill="url(#mb-grid)" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <circle key={i} cx={20 + i * 40} cy="6" r="1.4" fill="#2a3a30" />
      ))}
      {/* induction band */}
      <rect x="240" y="10" width="70" height="70" fill="url(#mb-hatch)" opacity="0.7" />
      <text textAnchor="middle" fontSize="5.5" fill="var(--dim)" letterSpacing="1">
        <tspan x="275" y="69">CRYO</tspan>
        <tspan x="275" y="76">INDUCTION</tspan>
      </text>
      {/* trace */}
      <path d={tracePath()} fill="none" stroke="var(--green)" strokeWidth="1.4" opacity="0.9" />
      <path d="M 240 46 L 310 46" stroke="var(--green)" strokeWidth="1" opacity="0.35" strokeDasharray="2 2" />
      {/* the marker only resolves once the strip is examined */}
      {examined && (
        <g>
          <line x1="150" y1="12" x2="150" y2="78" stroke="var(--red)" strokeWidth="1" strokeDasharray="3 2" />
          <rect x="112" y="12" width="76" height="11" rx="2" fill="#1a0f0f" stroke="var(--red)" strokeWidth="0.75" />
          <text x="150" y="20" textAnchor="middle" fontSize="6.5" fill="var(--red)" letterSpacing="1">CONSCIOUS · T-06:12</text>
        </g>
      )}
      {/* engraved label plate */}
      <rect x="8" y="79" width="140" height="9" rx="1" fill="var(--hull)" stroke="var(--line)" />
      <text x="14" y="86" fontSize="5.5" fill="var(--dim)">MED-BAND 07 · STRIP 4/4</text>
    </svg>
  );
}

function BurnedTerminal({ burnIn, aria }: { burnIn: string; aria: string }) {
  return (
    <svg viewBox="0 0 320 120" width="100%" style={{ maxWidth: 480, display: 'block' }} role="img" aria-label={aria}>
      <defs>
        <pattern id="mb-scan" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="2" fill="#000" opacity="0.25" />
        </pattern>
        <radialGradient id="mb-glass" cx="0.5" cy="0.5" r="0.8">
          <stop offset="0%" stopColor="#0d1512" />
          <stop offset="100%" stopColor="#050807" />
        </radialGradient>
      </defs>
      {/* bezel */}
      <rect x="4" y="4" width="312" height="112" rx="10" fill="#131a16" stroke="#3a4a40" strokeWidth="3" />
      <rect x="18" y="16" width="284" height="88" rx="6" fill="url(#mb-glass)" stroke="#1f2b25" />
      {/* ghost text: the phosphor burn-in */}
      <text x="34" y="62" fontSize="16" fill="var(--green)" opacity="0.13" letterSpacing="2" fontFamily="ui-monospace, monospace">{burnIn}</text>
      <text x="34" y="62" fontSize="16" fill="var(--green)" opacity="0.06" letterSpacing="2" fontFamily="ui-monospace, monospace" transform="translate(1.5 0)">{burnIn}</text>
      <rect x="18" y="16" width="284" height="88" rx="6" fill="url(#mb-scan)" />
      {/* power LED, dead */}
      <circle cx="296" cy="110" r="2" fill="#2a1414" stroke="#3a2020" />
    </svg>
  );
}

export function Medbay() {
  const t = useStrings();
  const examined = useGame((s) => s.chapter2.medbandExamined);
  return (
    <div className="scene">
      <div className="panel">
        <h2>{t.medbay.title}</h2>
        <p>{t.medbay.intro}</p>
      </div>
      <div className="panel">
        <h2>{t.medbay.bandTitle}</h2>
        <p className="status-dim">{t.medbay.bandDesc}</p>
        <StripChart examined={examined} aria={t.medbay.bandAria} />
        {examined ? (
          <p className="status-bad" style={{ marginTop: 10 }}>{t.medbay.bandReading}</p>
        ) : (
          <button style={{ marginTop: 10 }} onClick={() => examineMedband()}>{t.medbay.examine}</button>
        )}
      </div>
      <div className="panel">
        <h2>{t.medbay.terminalTitle}</h2>
        <p className="status-dim">{t.medbay.terminalDesc}</p>
        <BurnedTerminal burnIn={t.medbay.burnIn} aria={`${t.medbay.terminalTitle}: ${t.medbay.burnIn}`} />
        <p className="status-dim" style={{ marginTop: 10 }}>{t.medbay.next}</p>
      </div>
    </div>
  );
}
