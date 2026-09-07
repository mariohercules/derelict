import { useEffect, useRef, useState } from 'react';
import { useGame } from '../ui/useGame';
import { useStrings } from '../ui/useLocale';
import { gameStore, removeGrate, flipBreaker, enterRoom } from '../game/store';
import { getPhotoCaption } from '../game/narrative';
import { variantFor } from '../game/variants';
import { reducedMotion } from '../ui/motion';
import type { BreakerId } from '../game/types';
import photoStill from '../assets/family-photo.jpg';
import photoLoop from '../assets/family-photo.mp4';
import cabinet from '../assets/cryo-cabinet.webp';
import { usePrefs } from '../ui/usePrefs';
import { PatchBay } from './PatchBay';
import { CryoChamber } from './CryoChamber';

function FamilyPhoto() {
  const t = useStrings();
  const seed = useGame((s) => s.seed);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [zoomed, setZoomed] = useState(false);
  const close = () => { dialog.current?.close(); setZoomed(false); trigger.current?.focus(); };
  useEffect(() => {
    if (zoomed) dialog.current?.showModal();
  }, [zoomed]);
  return (
    <>
      <button ref={trigger} className="cryo-object cryo-memory" onClick={() => setZoomed(true)} aria-label={t.cryo.lookCloser} aria-haspopup="dialog">
        <span className="cryo-memory-print" aria-hidden="true"><img src={photoStill} alt="" /></span>
        <span className="cryo-object-copy">
          <span className="cryo-object-code">01 / OKAFOR</span>
          <strong>{t.cryo.memoryObject}</strong>
          <span>{t.cryo.lookCloser} <span aria-hidden="true">↗</span></span>
        </span>
      </button>
      <dialog ref={dialog} className="memory-dialog" aria-labelledby="memory-title" onCancel={(e) => { e.preventDefault(); close(); }} onClose={() => setZoomed(false)}
        onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
        <div className="memory-dialog-content">
          <div className="memory-dialog-heading"><h2 id="memory-title">{t.cryo.crewBunk}</h2><button onClick={close} autoFocus>{t.cryo.putBack} ×</button></div>
          <p className="status-dim">{t.cryo.photoPinned}</p>
          {zoomed && (
            <figure className="memory-photo" role="img" aria-label={t.cryo.photoAria}>
              {reducedMotion() ? <img src={photoStill} alt="" /> : <video src={photoLoop} poster={photoStill} autoPlay muted loop playsInline />}
              <figcaption>{getPhotoCaption(seed)}</figcaption>
            </figure>
          )}
        </div>
      </dialog>
    </>
  );
}

function AuxBreakers() {
  const flipped = useGame((s) => s.breakersFlipped);
  const auxPower = useGame((s) => s.auxPower);
  const t = useStrings();
  const [tripped, setTripped] = useState(false);
  return (
    <div className="panel breaker-panel">
      <h2>{t.cryo.auxPanel}</h2>
      <p className="instrument-instructions">{t.cryo.breakersDesc}</p>
      <div className="breaker-bank">
        {(['A', 'B', 'C'] as BreakerId[]).map((id) => {
          const on = flipped.includes(id);
          return (
            <button key={id} className={'physical-breaker' + (on ? ' is-on' : '')} aria-label={t.cryo.breaker + ' ' + id} aria-pressed={on}
              disabled={on || auxPower} onClick={() => { flipBreaker(id); setTripped(gameStore.getState().breakersFlipped.length === 0); }}>
              <span className="breaker-id">{id}</span>
              <span className="breaker-track" aria-hidden="true"><span className="breaker-handle" /></span>
              <span className="breaker-position">{on ? 'ON' : 'OFF'}</span>
            </button>
          );
        })}
      </div>
      <p className={'instrument-status ' + (auxPower ? 'status-ok' : tripped ? 'status-bad' : 'status-dim')} role="status">
        {auxPower ? t.cryo.auxOnline : tripped ? t.cryo.breakerReset : flipped.length === 0 ? t.cryo.allDown : flipped.join(' · ')}
      </p>
    </div>
  );
}

function PowerStation() {
  const t = useStrings();
  const seed = useGame((s) => s.seed);
  const removed = useGame((s) => s.grateRemoved);
  const previouslyRemoved = useRef(removed);
  const station = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (removed && !previouslyRemoved.current) station.current?.focus({ preventScroll: true });
    previouslyRemoved.current = removed;
  }, [removed]);
  return (
    <div className={'cryo-workstation' + (removed ? ' grate-removed' : '')} ref={station} tabIndex={-1} role="group" aria-label={t.cryo.auxPanel}>
      <div className="workstation-serial"><span>P-7 / AUX</span><span aria-hidden="true">▥</span></div>
      {removed && (variantFor(seed, 'cryo_bay') === 1 ? <PatchBay /> : <AuxBreakers />)}
      <div className="grate-cover" aria-hidden={removed} inert={removed}>
        <div className="grate-copy"><h2>{t.cryo.ventGrate}</h2><p>{t.cryo.ventHum}</p></div>
        <button className="physical-grate" onClick={removeGrate} disabled={removed} aria-label={t.cryo.pullGrate}>
          <span className="grate-slats" aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <i key={i} />)}</span>
          <span className="grate-grip" aria-hidden="true" />
          <span className="grate-action">{t.cryo.pullGrate} <span aria-hidden="true">↓</span></span>
        </button>
      </div>
    </div>
  );
}

function PowerInspection({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const t = useStrings();
  const auxPower = useGame((s) => s.auxPower);
  const reduced = usePrefs((p) => p.effectsReduced === true);
  useEffect(() => {
    const element = ref.current!;
    const opener = document.activeElement as HTMLElement | null;
    element.showModal();
    return () => {
      element.close();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog ref={ref} className="cryo-inspection" data-powered={auxPower} data-reduced={reduced}
      aria-label={t.cryo.inspectPanel} onCancel={(e) => { e.preventDefault(); onClose(); }}>
      <div className="cryo-inspection-chrome">
        <span>{t.cryo.inspectionLabel} / P-7</span>
        <button onClick={onClose} aria-label={t.cryo.backToRoom}>×</button>
      </div>
      <div className="cryo-inspection-body" style={{ backgroundImage: `url(${cabinet})` }}><PowerStation /></div>
      <footer>
        <span className={auxPower ? 'status-ok' : 'status-dim'}>{auxPower ? t.cryo.powerLive : t.cryo.powerOff}</span>
        <button onClick={onClose}>{t.cryo.backToRoom} <span aria-hidden="true">↗</span></button>
      </footer>
    </dialog>
  );
}

function ExitDoor() {
  const unlocked = useGame((s) => s.doors.cryo_exit);
  const auxPower = useGame((s) => s.auxPower);
  const t = useStrings();
  return (
    <div className={'cryo-door-object' + (unlocked ? ' is-unlocked' : '')}>
      <button className="cryo-object cryo-exit-object" onClick={() => enterRoom('engineering')} disabled={!unlocked}
        aria-label={t.cryo.stepThrough} aria-describedby="cryo-door-status cryo-door-help">
        <span className="cryo-object-marker" aria-hidden="true">{unlocked ? '↗' : '02'}</span>
        <span className="cryo-object-copy">
          <span className="cryo-object-code">02 / {t.cryo.exitLabel}</span>
          <strong>{t.hud.rooms.engineering}</strong>
          <span>{unlocked ? t.cryo.doorReleased : auxPower ? t.cryo.doorWaiting : t.cryo.powerOff}</span>
        </span>
      </button>
      <span id="cryo-door-status" className="cryo-door-announcement" role="status">
        {unlocked ? t.cryo.doorReleased : auxPower ? t.cryo.doorWaiting : t.cryo.powerOff}
      </span>
      <p id="cryo-door-help" className="cryo-object-help">{unlocked ? t.cryo.stepThrough : auxPower ? t.cryo.doorAuthHint : t.cryo.darkDead}</p>
    </div>
  );
}

export function CryoBay() {
  const t = useStrings();
  const ngPlus = useGame((s) => s.ngPlus);
  const auxPower = useGame((s) => s.auxPower);
  const unlocked = useGame((s) => s.doors.cryo_exit);
  const removed = useGame((s) => s.grateRemoved);
  const reduced = usePrefs((p) => p.effectsReduced === true);
  const [inspecting, setInspecting] = useState(false);
  return (
    <div className={'scene cryo-scene cinematic-cryo' + (auxPower ? ' cryo-powered' : '')} data-reduced={reduced}>
      <header className="cryo-heading">
        <div><span className="scene-eyebrow">{t.cryo.sector}</span><h1>{t.cryo.title}</h1></div>
        <span className={'cryo-power-label ' + (auxPower ? 'status-ok' : 'status-dim')}>{auxPower ? t.cryo.powerLive : t.cryo.powerOff}</span>
      </header>
      <div className="cryo-room">
        <CryoChamber auxPower={auxPower} unlocked={unlocked} />
        <div className="cryo-room-caption" aria-hidden="true"><span>CRYO / 03</span><span>{t.cryo.podLabel}</span></div>
        <div className="cryo-room-objects">
          <div className="cryo-power-object">
            <button className={'cryo-object cryo-panel-object' + (auxPower ? ' is-powered' : '')}
              onClick={() => setInspecting(true)} aria-haspopup="dialog" aria-label={t.cryo.inspectPanel}>
              <span className="cryo-object-marker" aria-hidden="true">⏻</span>
              <span className="cryo-object-copy">
                <span className="cryo-object-code">P-7 / AUX</span>
                <strong>{t.cryo.panelObject}</strong>
                <span>{auxPower ? t.cryo.inspectLive : removed ? t.cryo.operatePanel : t.cryo.inspectGrate}</span>
              </span>
              <span className="cryo-object-arrow" aria-hidden="true">↗</span>
            </button>
          </div>
          <FamilyPhoto />
          <ExitDoor />
        </div>
      </div>
      <div className="cryo-brief"><p>{t.cryo.sceneLead}</p><p className="status-dim">{t.cryo.askAI}</p></div>
      <details className="cryo-log"><summary>{t.cryo.cabinLog}</summary><p>{t.cryo.introA}<em>{t.cryo.introEm}</em>{t.cryo.introB}</p></details>
      {ngPlus && <p className="status-dim">{t.cryo.again}</p>}
      {inspecting && <PowerInspection onClose={() => setInspecting(false)} />}
    </div>
  );
}
