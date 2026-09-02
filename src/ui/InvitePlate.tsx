import type { ShipInvite } from '../game/shipcode';
import { encodeShipCode } from '../game/shipcode';
import { useStrings } from './useLocale';

export function InvitePlate({ invite, hasSave, plusAllowed, onWake }: { invite: ShipInvite; hasSave: boolean; plusAllowed: boolean; onWake: () => void }) {
  const t = useStrings();
  if (!invite.ok) return <p className="status-dim">{t.ship.unreadable}</p>;
  const code = encodeShipCode(invite.seed, invite.ngPlus);
  return (
    <div className="plate" role="group" aria-label={t.ship.received(code)}>
      <div className="plate-engraved">{t.ship.received(code)}</div>
      {invite.ngPlus && !plusAllowed && <p className="status-dim" style={{ margin: '4px 0' }}>{t.ship.plusNeedsRun}</p>}
      {hasSave && <p className="status-dim" style={{ margin: '4px 0' }}>{t.ship.abandons}</p>}
      <button onClick={onWake} style={{ borderColor: 'var(--brass)', color: 'var(--brass-hi)' }}>{t.ship.wakeOn(code)}</button>
    </div>
  );
}
