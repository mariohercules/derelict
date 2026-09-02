import { createRoot } from 'react-dom/client';
import App from './App';
import { gameStore } from './game/store';
import { loadSavedState, startPersisting } from './game/persist';
import { hydrateMeta, startRecordingRuns } from './game/meta';
import { hydratePrefs } from './game/prefs';
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
const saved = loadSavedState();
if (saved) gameStore.setState(saved, true);
startPersisting();
startRecordingRuns(gameStore);

createRoot(document.getElementById('root')!).render(<App />);
