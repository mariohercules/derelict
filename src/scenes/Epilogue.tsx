import { useGame } from '../ui/useGame';
import { resetGame } from '../game/store';

export function Epilogue() {
  const toolCalls = useGame((s) => s.toolCalls);
  return (
    <div className="scene" style={{ marginTop: '10vh', textAlign: 'center' }}>
      <h1 style={{ letterSpacing: '0.4em', color: 'var(--green)' }}>POD AWAY</h1>
      <div className="panel" style={{ textAlign: 'left' }}>
        <p>
          The Cormorant shrinks behind you — dark, patient, and finally at rest. Okafor was right
          about your AI. Better company than most.
        </p>
        <p className="status-dim">
          Escaped by: one human (hands, eyes, judgment) + one AI ({toolCalls} tool calls on ship systems).
          Neither of you could have done it alone. That was the point.
        </p>
      </div>
      <button onClick={resetGame}>Wake up again</button>
    </div>
  );
}
