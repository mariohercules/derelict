// Decorative geometry only: puzzle readings stay in the real instruments.
export function MachineryWalls() {
  return <div className="machine-walls" aria-hidden="true">
    <div className="machine-ceiling"><i /><i /><i /></div>
    <div className="machine-pipes"><i /><i /><i /></div>
    <div className="machine-grating" />
  </div>;
}

export function ReactorVessel() {
  return <svg className="reactor-vessel" viewBox="0 0 360 340" aria-hidden="true">
    <defs>
      <radialGradient id="reactor-glow"><stop stopColor="var(--reactor-light)" stopOpacity=".6" /><stop offset=".6" stopColor="var(--reactor-light)" stopOpacity=".06" /><stop offset="1" stopColor="var(--reactor-light)" stopOpacity="0" /></radialGradient>
      <linearGradient id="reactor-steel"><stop stopColor="var(--face-deep)" /><stop offset=".5" stopColor="var(--steel-mid)" /><stop offset="1" stopColor="var(--steel-lo)" /></linearGradient>
    </defs>
    <path d="M44 15V298H316V15M20 120H340M20 260H340" stroke="var(--steel)" fill="none" strokeWidth="9" />
    <path d="M60 310H300L326 333H34Z" fill="var(--steel-lo)" stroke="var(--steel)" />
    <circle className="reactor-aura" cx="180" cy="167" r="156" fill="url(#reactor-glow)" />
    <path d="M130 24H230V309H130Z" fill="url(#reactor-steel)" stroke="var(--steel)" strokeWidth="3" />
    <rect x="150" y="40" width="60" height="251" rx="20" fill="var(--face-deep)" stroke="var(--brass-lo)" strokeWidth="3" />
    <rect className="reactor-column" x="169" y="49" width="22" height="233" rx="11" fill="var(--reactor-light)" />
    {[78,167,256].map((y,i)=><g key={y}>
      <ellipse cx="180" cy={y} rx={102-i*3} ry="37" fill="none" stroke="var(--face-deep)" strokeWidth="24" />
      <ellipse cx="180" cy={y} rx={102-i*3} ry="37" fill="none" stroke="var(--steel-mid)" strokeWidth="18" />
      <ellipse cx="180" cy={y} rx={102-i*3} ry="37" fill="none" stroke="var(--brass-lo)" strokeWidth="3" />
      <path d={`M77 ${y}H102M258 ${y}H283`} stroke="var(--steel-hi)" strokeWidth="13" />
    </g>)}
    {[108,252].map(x=><g key={x}><path d={`M${x} 41V291`} stroke="var(--steel-hi)" strokeWidth="7" /><path d={`M${x-3} 41V291`} stroke="var(--face-deep)" strokeWidth="2" /></g>)}
    <path d="M74 320H286" stroke="var(--brass)" strokeWidth="5" strokeDasharray="14 7" />
  </svg>;
}
