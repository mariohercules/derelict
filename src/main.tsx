import { createRoot } from 'react-dom/client';
import App from './App';
import { gameStore } from './game/store';
import { loadSavedState, startPersisting } from './game/persist';
import { hydrateMeta, startRecordingRuns } from './game/meta';
import { hydratePrefs, prefsStore } from './game/prefs';
import { setMuted } from './audio/sound';
import './styles/theme.css';

// Hydrate the store before startPersisting() and before App mounts: the sound
// subscription and the WebMCP tool registry both react to store changes, and
// if either were already listening, a loaded save would fire them as if it
// were a live transition instead of a silent resume.
// The meta is hydrated first so a resumed run already knows what the crew has
// seen; the recorder subscribes after hydration so a loaded `won` save is not
// counted twice.
hydrateMeta();
hydratePrefs();
// Arms the mute before the first gesture: with no AudioContext yet, setMuted()
// only sets the flag that ensureCtx() later reads into master.gain — no context
// is created outside the gesture, and a muted player hears no WAKE UP blip.
setMuted(prefsStore.getState().muted);
const saved = loadSavedState();
if (saved) gameStore.setState(saved, true);
startPersisting();
startRecordingRuns(gameStore);

createRoot(document.getElementById('root')!).render(<App />);
