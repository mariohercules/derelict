import { lazy, Suspense, useEffect, useState } from 'react';
import { HUD } from './ui/HUD';
import { FallbackBanner } from './ui/FallbackBanner';
import { useGame } from './ui/useGame';
import { detectModelContext } from './mcp/detect';
import { createToolRegistry } from './mcp/registry';
import { buildTools } from './mcp/tools';
import { gameStore, resetGame, tickKillswitch } from './game/store';
import { pushLinkEvent } from './game/link';
import { loadSavedState } from './game/persist';
import { playAlarm, playAuxPowerUp, playBeaconPing, playBlip, playCableSeat, playDoorRelease, playGratePull, playMergeTheme, playRelayTrip, playSwitchClick, playDirectedCue } from './audio/sound';
import { startMixer } from './audio/mixer';
import { useStrings } from './ui/useLocale';
import { DeckMap } from './ui/DeckMap';
import { shipFromSearch } from './game/shipcode';
import { useMeta } from './ui/useMeta';
import { Bulkhead } from './ui/Bulkhead';
import { ColdOpen } from './ui/ColdOpen';
import { shouldThaw } from './ui/thaw';
import { machineryCue } from './ui/machinery';
import { playMachineryCue } from './audio/sound';
import { startDirector } from './presentation/runtime';
import { Atmosphere } from './ui/Atmosphere';
import { OpeningScreen } from './ui/OpeningScreen';
import { SceneBoundary } from './ui/SceneBoundary';

const Epilogue = lazy(() => import('./scenes/Epilogue').then(module => ({ default: module.Epilogue })));

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
  const t = useStrings();
  const [started, setStarted] = useState(false);
  const [saved, setSaved] = useState(() => loadSavedState());
  const room = useGame((s) => s.room);
  const won = useGame((s) => s.won);
  const seed = useGame((s) => s.seed);
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
    setThawing(shouldThaw(gameStore.getState(), null));
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
      if (state.seed !== prevState.seed) return; // Loading a new hull is not a physical action.
      const materialCue = machineryCue(state, prevState);
      if (materialCue) playMachineryCue(materialCue);
      if (state.grateRemoved && !prevState.grateRemoved) playGratePull();
      if (state.grateRemoved && state.breakersFlipped !== prevState.breakersFlipped && !state.auxPower) {
        if (state.breakersFlipped.length === 0) playRelayTrip();
        else playSwitchClick();
      }
      if (state.grateRemoved && state.chapter1v.sockets !== prevState.chapter1v.sockets) playCableSeat();
      if (state.auxPower && !prevState.auxPower) playAuxPowerUp();
      if (state.doors.cryo_exit && !prevState.doors.cryo_exit) playDoorRelease();
      if (state.doors.engineering_exit && !prevState.doors.engineering_exit) playDoorRelease();
      if (state.chapter2.safeOpened && !prevState.chapter2.safeOpened) playBlip();
      if (state.chapter2.irrigationSolved && !prevState.chapter2.irrigationSolved) playBlip();
      if (state.chapter2.crateLifted && !prevState.chapter2.crateLifted) playBlip();
      if (state.chapter === 2 && prevState.chapter === 1) playBlip();
      // The inciting escalation is an alarm, not a swell: the Kestrel is named and
      // the kill-switch stirs in the same update, so one alarm covers both.
      if ((state.killswitch === 'stirring' && prevState.killswitch !== 'stirring') || (state.chapter === 3 && prevState.chapter === 2)) playAlarm();
      if (state.chapter3.shielded.length > prevState.chapter3.shielded.length && !materialCue) playBlip();
      if (state.chapter3.beaconHeard && !prevState.chapter3.beaconHeard) playBeaconPing();
      if (state.ending === 'restore' && prevState.ending !== 'restore') playMergeTheme();
      if (state.ending === 'broadcast' && prevState.ending !== 'broadcast') playAlarm();
      if (state.ending === 'stay' && prevState.ending !== 'stay') playBeaconPing();
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

  // The thaw is decided once, when a run starts or a new ship wakes — never by
  // a live subscription, so the agent's own calls cannot cut it short — and
  // only for a ship drawn now: a resumed save, even one still in the pod, is a
  // resume, not a new run.
  const resumedSeed = saved?.seed ?? null;
  const [thawing, setThawing] = useState(false);
  useEffect(() => {
    if (started) setThawing(shouldThaw(gameStore.getState(), resumedSeed));
  }, [started, seed, resumedSeed]);

  useEffect(() => {
    if (!started || thawing) return;
    return startDirector(gameStore, playDirectedCue);
  }, [started, thawing]);

  if (!started) {
    return <OpeningScreen saved={saved} linked={mc !== null} invite={invite} plusAllowed={runs >= 1}
      onEngage={() => { startMixer(gameStore); playDoorRelease(); }}
      onWake={() => {
        setThawing(shouldThaw(gameStore.getState(), resumedSeed));
        setStarted(true);
      }}
      onNew={() => {
        resetGame(); setSaved(null);
        setThawing(shouldThaw(gameStore.getState(), null));
        setStarted(true);
      }}
      onInvite={wakeOnInvite} />;
  }

  const showColdOpen = !won && thawing;
  return (
    <>
      <HUD linked={mc !== null} />
      {!mc && <FallbackBanner />}
      <Atmosphere>
        {won ? (
          <SceneBoundary><Suspense fallback={<p className="scene" role="status">{t.app.accessing}</p>}><Epilogue /></Suspense></SceneBoundary>
        ) : (
          <>
            <DeckMap />
            <Bulkhead room={room} />
          </>
        )}
      </Atmosphere>
      {showColdOpen && <ColdOpen onDone={() => {
        setThawing(false);
        requestAnimationFrame(() => document.getElementById('room-view')?.focus({ preventScroll: true }));
      }} />}
      <BuildTag />
    </>
  );
}
