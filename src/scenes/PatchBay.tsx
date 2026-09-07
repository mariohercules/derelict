import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useGame } from '../ui/useGame';
import { useStrings } from '../ui/useLocale';
import { energize, plugCable } from '../game/store';
import { playRelayTrip } from '../audio/sound';

const CABLE_COLOURS = ['#c95b50', '#66a878', '#639da9'];
const Y = [24, 80, 136];
type Cable = 0 | 1 | 2;

export function PatchBay() {
  const sockets = useGame((s) => s.chapter1v.sockets);
  const auxPower = useGame((s) => s.auxPower);
  const t = useStrings();
  const [selected, setSelected] = useState<Cable | null>(null);
  const [error, setError] = useState<'wrong' | 'incomplete' | null>(null);
  const connect = (bus: number | null) => {
    if (selected === null) return;
    if (plugCable(selected, bus).ok) setError(null);
  };
  const press = () => {
    const result = energize();
    if (result.ok) setSelected(null);
    setError(result.ok ? null : sockets.some((b) => b === null) ? 'incomplete' : 'wrong');
    if (!result.ok) playRelayTrip();
  };

  return (
    <div className="panel patch-panel">
      <h2>{t.cryo.pbTitle}</h2>
      <p className="instrument-instructions">{t.cryo.pbChoose}</p>
      <div className="patch-board" role="group" aria-label={t.cryo.pbAria}>
        <svg viewBox="0 0 320 176" preserveAspectRatio="none" aria-hidden="true">
          <rect x="2" y="2" width="316" height="172" rx="5" fill="var(--face-deep)" stroke="var(--steel)" />
          {[0, 1, 2].map((i) => {
            const bus = sockets[i];
            const endY = bus === null ? Y[i] + 14 : Y[bus - 1];
            const endX = bus === null ? 145 : 274;
            const d = 'M46 ' + Y[i] + ' C125 ' + (Y[i] + 20) + ',185 ' + (endY + 22) + ',' + endX + ' ' + endY;
            return <g key={i} opacity={selected === null || selected === i || auxPower ? 1 : .4}>
              <path d={d} fill="none" stroke="var(--hull)" strokeWidth="9" transform="translate(1 3)" />
              <path className="patch-cable" d={d} fill="none" stroke={CABLE_COLOURS[i]} strokeWidth="5" strokeLinecap="round" />
              <circle cx={endX} cy={endY} r="5" fill="var(--brass)" stroke="var(--brass-lo)" strokeWidth="2" />
              <path d={d} fill="none" stroke="var(--text)" strokeWidth="1" opacity=".18" />
            </g>;
          })}
        </svg>
        <div className="patch-leads">
          {t.cryo.pbColours.map((colour, i) => (
            <button key={colour} className="patch-lead" style={{ '--cable': CABLE_COLOURS[i] } as CSSProperties}
              onClick={() => { setSelected(i as Cable); setError(null); }} disabled={auxPower}
              aria-label={t.cryo.pbSelect(colour)} aria-pressed={selected === i}>
              <span className="patch-plug" aria-hidden="true" /><span>{colour}</span>
            </button>
          ))}
        </div>
        <div className="patch-buses">
          {[1, 2, 3].map((bus) => {
            const occupied = sockets.findIndex((b) => b === bus);
            return (
              <button key={bus} className={'patch-socket' + (occupied !== -1 ? ' is-seated' : '')}
                onClick={() => connect(bus)} aria-label={t.cryo.pbConnect(bus)}
                disabled={auxPower || selected === null || (occupied !== -1 && occupied !== selected)}>
                <span className="patch-jack" aria-hidden="true" style={occupied === -1 ? undefined : { '--cable': CABLE_COLOURS[occupied] } as CSSProperties} />
                <span>{t.cryo.pbBus} {bus}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="patch-actions">
        <button className="patch-unplug" onClick={() => connect(null)} disabled={auxPower || selected === null || sockets[selected] === null}>{t.cryo.pbDisconnect}</button>
        <button className="energize-button" onClick={press} disabled={auxPower}><span aria-hidden="true">⏻</span> {t.cryo.pbEnergize}</button>
      </div>
      <p className={'instrument-status ' + (auxPower ? 'status-ok' : error ? 'status-bad' : 'status-dim')} role="status">
        {auxPower ? t.cryo.auxOnline : error === 'wrong' ? t.cryo.pbWrong : error === 'incomplete' ? t.cryo.pbIncomplete
          : selected === null ? t.cryo.pbColours.map((c, i) => c + ': ' + (sockets[i] ?? t.cryo.pbEmpty)).join(' · ')
          : t.cryo.pbColours[selected] + ' → ' + t.cryo.pbBus + ' ' + (sockets[selected] ?? t.cryo.pbEmpty)}
      </p>
    </div>
  );
}
