import { useGame } from './useGame';
import { toolAvailability } from '../mcp/tools';
import { enginesOnline } from '../game/derived';
import { useStrings } from './useLocale';
import { LocaleToggle } from './LocaleToggle';

export function HUD() {
  const state = useGame((s) => s);
  const t = useStrings();
  const tools = toolAvailability(state);
  const onlineCount = tools.filter((tool) => tool.online).length;
  return (
    <header className="hud">
      <div>
        <strong>ISV CORMORANT</strong>{' '}
        <span className="status-dim">// {t.hud.rooms[state.room]}</span>{' '}
        <span className={state.auxPower ? 'status-ok' : 'status-bad blink'}>
          AUX {state.auxPower ? 'ON' : 'OFF'}
        </span>{' '}
        <span className={enginesOnline(state) ? 'status-ok' : 'status-dim'}>
          {t.hud.engines} {enginesOnline(state) ? 'ONLINE' : 'OFFLINE'}
        </span>
      </div>
      <div className="ailink" title={t.hud.ailinkTitle}>
        <span className="status-dim">AI LINK {onlineCount}/{tools.length}:</span>
        {tools.map((tool) => (
          <span key={tool.name} className={`tool ${tool.online ? 'status-ok' : 'status-dim'}`}>
            {tool.online ? '●' : '○'} {tool.name}
          </span>
        ))}
      </div>
      <LocaleToggle />
    </header>
  );
}
