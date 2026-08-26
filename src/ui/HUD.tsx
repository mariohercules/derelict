import { useGame } from './useGame';
import { toolAvailability } from '../mcp/tools';
import { enginesOnline } from '../game/derived';
import { useStrings } from './useLocale';
import { LocaleToggle } from './LocaleToggle';

export function HUD({ linked }: { linked: boolean }) {
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
      <div className="ailink" title={linked ? t.hud.ailinkTitle : undefined}>
        {linked ? (
          <>
            <span className="status-dim">AI LINK {onlineCount}/{tools.length} · status:</span>
            {tools.map((tool) => (
              <span key={tool.name} className={`tool ${tool.online ? 'status-ok' : 'status-dim'}`}>
                {tool.online ? '●' : '○'} {tool.name}
              </span>
            ))}
          </>
        ) : (
          <span className="status-bad">AI LINK · {t.hud.severed}</span>
        )}
      </div>
      <LocaleToggle />
    </header>
  );
}
