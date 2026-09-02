import { useEffect, useState } from 'react';
import { HUD } from './ui/HUD';
import { FallbackBanner } from './ui/FallbackBanner';
import { useGame } from './ui/useGame';
import { useStrings } from './ui/useLocale';
import { LocaleToggle } from './ui/LocaleToggle';
import { detectModelContext } from './mcp/detect';
import { createToolRegistry } from './mcp/registry';
import { buildTools } from './mcp/tools';
import { gameStore, resetGame, tickKillswitch } from './game/store';
import { pushLinkEvent } from './game/link';
import { loadSavedState } from './game/persist';
import { playAlarm, playBeaconPing, playBlip, playKlaxon, playMergeTheme, startAmbience } from './audio/sound';
import { SCENES } from './scenes/registry';
import { Epilogue } from './scenes/Epilogue';
import { DeckMap } from './ui/DeckMap';
import { shipFromSearch } from './game/shipcode';
import { InvitePlate } from './ui/InvitePlate';
import { useMeta } from './ui/useMeta';

function BuildTag() {
  return (
    <div
      className="status-dim"
      style={{ position: 'fixed', bottom: 6, right: 10, fontSize: 10, opacity: 0.6, pointerEvents: 'none' }}
    >
      {__BUILD_ID__}
    </div>
  );
}

export default function App() {
  const [started, setStarted] = useState(false);
  const [saved, setSaved] = useState(() => loadSavedState());
  const hasSave = saved !== null;
  const room = useGame((s) => s.room);
  const won = useGame((s) => s.won);
  const t = useStrings();
  const [mc, setMc] = useState(() => detectModelContext());
  // A ship invite on the URL is read once and stripped, so a reload does not re-offer it.
  const [invite] = useState(() => shipFromSearch(window.location.search));
  const runs = useMeta((m) => m.runsCompleted);
  useEffect(() => {
    if (window.location.search) window.history.replaceState(null, '', window.location.pathname + window.location.hash);
  }, []);
  const wakeOnInvite = () => {
    if (!invite || !invite.ok) return;
    resetGame(invite.seed, { ngPlus: invite.ngPlus && runs >= 1 });
    setSaved(null);
    startAmbience();
    playBlip();
    setStarted(true);
  };

  // Some hosts (extension bridges, agents attaching after page load) inject
  // modelContext only after React mounts — poll briefly instead of deciding
  // the link is severed forever at first render.
  useEffect(() => {
    if (mc) return;
    let tries = 0;
    const timer = setInterval(() => {
      const found = detectModelContext();
      if (found) {
        setMc(found);
        clearInterval(timer);
      } else if (++tries >= 20) {
        clearInterval(timer);
      }
    }, 500);
    return () => clearInterval(timer);
  }, [mc]);

  useEffect(() => {
    if (!mc) return;
    const registry = createToolRegistry(mc, buildTools(), gameStore, (change) => pushLinkEvent({ kind: 'link', at: Date.now(), ...change }));
    return () => registry.dispose();
  }, [mc]);

  useEffect(() => {
    const unsubscribeSound = gameStore.subscribe((state, prevState) => {
      if (state.auxPower && !prevState.auxPower) playBlip();
      if (state.doors.cryo_exit && !prevState.doors.cryo_exit) playBlip();
      if (state.doors.engineering_exit && !prevState.doors.engineering_exit) playBlip();
      if (state.ritual.phase === 'armed' && prevState.ritual.phase !== 'armed') playAlarm();
      if (state.chapter2.safeOpened && !prevState.chapter2.safeOpened) playBlip();
      if (state.chapter2.irrigationSolved && !prevState.chapter2.irrigationSolved) playBlip();
      if (state.chapter2.crateLifted && !prevState.chapter2.crateLifted) playBlip();
      if (state.chapter === 2 && prevState.chapter === 1) playBlip();
      if (state.killswitch === 'stirring' && prevState.killswitch !== 'stirring') playAlarm();
      if (state.chapter3.wave === 'warning' && prevState.chapter3.wave !== 'warning') playKlaxon();
      if (state.chapter3.shielded.length > prevState.chapter3.shielded.length) playBlip();
      if (state.killswitch === 'contained' && prevState.killswitch !== 'contained') playBlip();
      if (state.chapter3.beaconHeard && !prevState.chapter3.beaconHeard) playBeaconPing();
      if (state.ending === 'restore' && prevState.ending !== 'restore') playMergeTheme();
      if (state.ending === 'broadcast' && prevState.ending !== 'broadcast') playAlarm();
      if (state.ending === 'stay' && prevState.ending !== 'stay') playBeaconPing();
      if (state.chapter === 3 && prevState.chapter === 2) playAlarm();
    });
    return unsubscribeSound;
  }, []);

  // The kill-switch's clock: while it is active, materialize the wave state
  // every half second so the tool registry and the HUD see it change. Never
  // while won — the epilogue should not hear a klaxon for a fight that is over.
  const killswitch = useGame((s) => s.killswitch);
  useEffect(() => {
    if (killswitch !== 'active' || won) return;
    tickKillswitch();
    const timer = setInterval(() => tickKillswitch(), 500);
    return () => clearInterval(timer);
  }, [killswitch, won]);

  const Scene = SCENES[room];

  if (!started) {
    return (
      <div className="scene" style={{ marginTop: '15vh', textAlign: 'center' }}>
        <div style={{ position: 'absolute', top: 12, right: 16 }}>
          <LocaleToggle />
        </div>
        <h1 style={{ letterSpacing: '0.4em', color: 'var(--amber)' }}>DERELICT</h1>
        <p>{t.app.tagline}</p>
        {!mc && <FallbackBanner />}
        <div className="panel" style={{ textAlign: 'left', maxWidth: 680, margin: '20px auto' }}>
          <h2>{t.app.howTitle}</h2>
          <p className="status-dim">1. {t.app.how1}</p>
          <p className="status-dim">2. {t.app.how2}</p>
          <p className="status-dim">3. {t.app.how3}</p>
        </div>
        {saved?.checkpoint && !saved.won && (
          <p className="status-dim">{t.app.checkpoint(saved.checkpoint.chapter, t.hud.rooms[saved.checkpoint.room])}</p>
        )}
        {invite && <InvitePlate invite={invite} hasSave={hasSave} plusAllowed={runs >= 1} onWake={wakeOnInvite} />}
        <div>
          <button
            onClick={() => {
              startAmbience();
              playBlip();
              setStarted(true);
            }}
          >
            {t.app.wakeUp}
          </button>
          {hasSave && (
            <button
              style={{ marginLeft: 12 }}
              onClick={() => {
                resetGame();
                setSaved(null);
              }}
            >
              {t.app.abandonRun}
            </button>
          )}
        </div>
        <BuildTag />
      </div>
    );
  }

  return (
    <>
      <HUD linked={mc !== null} />
      {!mc && <FallbackBanner />}
      {won ? (
        <Epilogue />
      ) : (
        <>
          <DeckMap />
          <Scene />
        </>
      )}
      <BuildTag />
    </>
  );
}
