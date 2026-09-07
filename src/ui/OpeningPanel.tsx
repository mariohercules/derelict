import { useEffect, useId, useRef, type ReactNode } from 'react';
import type { ShipInvite } from '../game/shipcode';
import { useStrings } from './useLocale';
import { FallbackBanner } from './FallbackBanner';
import { FlightRecord } from './FlightRecord';
import { InvitePlate } from './InvitePlate';

export type OpeningPanelId = 'how' | 'record' | 'restart' | 'link' | 'invite';

function OpeningDialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const t = useStrings();
  useEffect(() => {
    const dialog = ref.current!;
    const opener = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => { dialog.close(); if (opener?.isConnected) opener.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={ref} className="opening-dialog" aria-labelledby={id}
    onCancel={e => { e.preventDefault(); onClose(); }}
    onClick={e => {
      if (e.target !== e.currentTarget) return;
      const bounds = e.currentTarget.getBoundingClientRect();
      if (e.clientX < bounds.left || e.clientX > bounds.right || e.clientY < bounds.top || e.clientY > bounds.bottom) onClose();
    }}>
    <header><h2 id={id}>{title}</h2><button onClick={onClose} aria-label={t.app.close}>×</button></header>
    <div className="opening-dialog-content">{children}</div>
  </dialog>;
}
interface PanelProps {
  panel: OpeningPanelId; linked: boolean; invite: ShipInvite | null;
  hasSave: boolean; plusAllowed: boolean;
  onClose: () => void; onNew: () => void; onInvite: () => void;
}

export default function OpeningPanel({ panel, linked, invite, hasSave, plusAllowed, onClose, onNew, onInvite }: PanelProps) {
  const t = useStrings();
  const panelTitle = panel === 'how' ? t.app.howTitle : panel === 'record' ? t.app.flightRecord
    : panel === 'restart' ? t.app.newJourney : panel === 'invite' ? t.app.inviteTitle : t.app.connection;
  return <OpeningDialog title={panelTitle} onClose={onClose}>
      {panel === 'how' && <><p className="opening-dialog-lead">{t.app.tagline}</p><ol>
        <li>{t.app.how1}</li><li>{t.app.how2}</li><li>{t.app.how3}</li>
      </ol>{!linked && <FallbackBanner />}</>}
      {panel === 'record' && <FlightRecord compact />}
      {panel === 'link' && <FallbackBanner />}
      {panel === 'restart' && <><p>{t.app.newJourneyWarning}</p><div className="opening-dialog-actions">
        <button onClick={onClose}>{t.app.keepJourney}</button>
        <button className="opening-confirm" onClick={onNew}>{t.app.startNew}</button>
      </div></>}
      {panel === 'invite' && invite && <InvitePlate invite={invite} hasSave={hasSave} plusAllowed={plusAllowed} onWake={onInvite} />}
    </OpeningDialog>;
}
