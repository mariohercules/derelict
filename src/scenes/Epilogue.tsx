import { useGame } from '../ui/useGame';
import { useStrings } from '../ui/useLocale';
import { resetGame } from '../game/store';

export function Epilogue() {
  const toolCalls = useGame((s) => s.toolCalls);
  const t = useStrings();
  return (
    <div className="scene" style={{ marginTop: '10vh', textAlign: 'center' }}>
      <h1 style={{ letterSpacing: '0.4em', color: 'var(--green)' }}>{t.epilogue.podAway}</h1>
      <div className="panel" style={{ textAlign: 'left' }}>
        <p>{t.epilogue.outro}</p>
        <p className="status-dim">{t.epilogue.stats(toolCalls)}</p>
      </div>
      <button onClick={resetGame}>{t.epilogue.wakeAgain}</button>
    </div>
  );
}
