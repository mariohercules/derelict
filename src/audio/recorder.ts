import { prefsStore } from '../game/prefs';
import { holdNarration } from './narration';
import { routeVoice } from './sound';

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'unavailable' | 'muted';
export interface RecorderEnvironment {
  route: typeof routeVoice;
  speech: SpeechSynthesis | undefined;
  utterance: (text: string) => SpeechSynthesisUtterance;
}

// One session owns its media handlers, fallback, deadlines and focus lease.
// Pending play() failures and speech callbacks cannot resurrect a stopped tape.
export function startRecorderPlayback(audio: HTMLAudioElement, text: string, lang: string,
  onStatus: (status: PlaybackStatus) => void, environment?: RecorderEnvironment) {
  const env = environment ?? {
    route: routeVoice, speech: window.speechSynthesis,
    utterance: (body: string) => new SpeechSynthesisUtterance(body),
  };
  let live = true;
  let fallbackStarted = false;
  let utterance: SpeechSynthesisUtterance | null = null;
  let releaseRoute = () => {};
  let releaseFocus = () => {};
  let unsubscribe = () => {};
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  let capTimer: ReturnType<typeof setTimeout> | undefined;

  const finish = (status: PlaybackStatus = 'idle', notify = true) => {
    if (!live) return;
    live = false;
    clearTimeout(idleTimer); clearTimeout(capTimer);
    unsubscribe();
    detach();
    audio.pause();
    if (utterance) {
      utterance.onstart = utterance.onboundary = utterance.onend = utterance.onerror = null;
      try { env.speech?.cancel(); } catch { /* voice provider disappeared */ }
      utterance = null;
    }
    releaseRoute(); releaseFocus();
    if (notify) onStatus(status);
  };
  const armIdle = () => {
    if (!live) return;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => finish('unavailable'), 10_000);
  };
  const started = () => { if (live) { onStatus('playing'); armIdle(); } };
  const ended = () => finish();
  const detach = () => {
    audio.removeEventListener('playing', started);
    audio.removeEventListener('timeupdate', armIdle);
    audio.removeEventListener('ended', ended);
    audio.removeEventListener('error', fallback);
  };
  const fallback = () => {
    if (!live || fallbackStarted) return;
    fallbackStarted = true;
    detach(); audio.pause(); releaseRoute(); releaseRoute = () => {};
    if (prefsStore.getState().muted) { finish('muted'); return; }
    try {
      if (!env.speech) throw new Error('No speech provider');
      utterance = env.utterance(text);
      utterance.lang = lang;
      utterance.rate = .92;
      // Some voice providers never emit word boundaries. Once speech starts,
      // only the overall deadline should guard against a missing end event.
      utterance.onstart = () => {
        if (live) { onStatus('playing'); clearTimeout(idleTimer); }
      };
      utterance.onend = ended;
      utterance.onerror = () => finish('unavailable');
      armIdle();
      env.speech.speak(utterance);
    } catch { finish('unavailable'); }
  };

  const controls = { stop: () => finish(), dispose: () => finish('idle', false) };
  if (prefsStore.getState().muted) { onStatus('muted'); live = false; return controls; }
  releaseFocus = holdNarration();
  onStatus('loading');
  unsubscribe = prefsStore.subscribe(p => {
    if (p.muted) { audio.muted = true; finish('muted'); }
  });
  armIdle();
  capTimer = setTimeout(() => finish('unavailable'), Math.min(120_000, 3000 + text.length * 150));
  audio.addEventListener('playing', started);
  audio.addEventListener('timeupdate', armIdle);
  audio.addEventListener('ended', ended);
  audio.addEventListener('error', fallback);
  try {
    audio.muted = false;
    audio.currentTime = 0;
    releaseRoute = env.route(audio);
    void audio.play().then(() => { if (live && !fallbackStarted) started(); }).catch(fallback);
  } catch { fallback(); }
  return controls;
}
