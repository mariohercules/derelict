import { useGame } from './useGame';
import { toolAvailability } from '../mcp/tools';
import { enginesOnline } from '../game/derived';

export function HUD() {
  const state = useGame((s) => s);
  const tools = toolAvailability(state);
  const onlineCount = tools.filter((t) => t.online).length;
  return (
    <header className="hud">
      <div>
        <strong>ISV CORMORANT</strong>{' '}
        <span className="status-dim">// {state.room.replace('_', ' ')}</span>{' '}
        <span className={state.auxPower ? 'status-ok' : 'status-bad blink'}>
          AUX {state.auxPower ? 'ON' : 'OFF'}
        </span>{' '}
        <span className={enginesOnline(state) ? 'status-ok' : 'status-dim'}>
          ENGINES {enginesOnline(state) ? 'ONLINE' : 'OFFLINE'}
        </span>
      </div>
      <div className="ailink" title="Ship systems currently exposed to your AI via WebMCP">
        <span className="status-dim">AI LINK {onlineCount}/{tools.length}:</span>
        {tools.map((t) => (
          <span key={t.name} className={`tool ${t.online ? 'status-ok' : 'status-dim'}`}>
            {t.online ? '●' : '○'} {t.name}
          </span>
        ))}
      </div>
    </header>
  );
}
