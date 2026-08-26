import { createRoot } from 'react-dom/client';
import App from './App';
import { gameStore } from './game/store';
import { loadSavedState, startPersisting } from './game/persist';
import './styles/theme.css';

const saved = loadSavedState();
if (saved) gameStore.setState(saved, true);
startPersisting();

createRoot(document.getElementById('root')!).render(<App />);
