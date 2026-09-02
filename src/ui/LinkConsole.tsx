import { BUSES } from '../game/content';
import { setPref } from '../game/prefs';
import type { LinkEvent } from '../game/link';
import { toolAvailability } from '../mcp/tools';
import type { ToolLamp } from '../mcp/tools';
import { useGame } from './useGame';
import { useLink } from './useLink';
import { usePrefs } from './usePrefs';
import { useStrings } from './useLocale';

type LampState = 'lit' | 'dark' | 'silenced';
const lampOf = (l: ToolLamp): LampState => (l.online ? 'lit' : l.silenced ? 'silenced' : 'dark');
const LAMP_FILL: Record<LampState, string> = { lit: 'var(--green)', dark: 'var(--steel-lo)', silenced: 'var(--red)' };
const LAMP_CLASS: Record<LampState, string> = { lit: 'status-ok', dark: 'status-dim', silenced: 'status-bad' };

export function Lamp({ fill, lit, blink = false }: { fill: string; lit: boolean; blink?: boolean }) {
  return (
    <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true" className={blink ? 'klaxon-lamp' : undefined} style={{ flexShrink: 0 }}>
      <circle cx="6" cy="6" r="4.5" fill={fill} stroke="var(--steel)" strokeWidth="1.2" />
      {lit && <circle cx="4.5" cy="4.5" r="1.4" fill="var(--text)" opacity="0.35" />}
    </svg>
  );
}

const clock = (at: number) => new Date(at).toTimeString().slice(0, 8);

function TickerLine({ e }: { e: LinkEvent }) {
  const t = useStrings();
  const word =
    e.kind === 'call'
      ? e.status === 'ok' ? t.link.ok : e.status === 'refused' ? t.link.refused : t.link.error
      : e.online.length > 0 && e.offline.length > 0 ? `${t.link.onlineWord}/${t.link.offlineWord}` : e.online.length > 0 ? t.link.onlineWord : t.link.offlineWord;
  const fill = e.kind === 'link' ? 'var(--dim)' : e.status === 'ok' ? 'var(--green)' : e.status === 'refused' ? 'var(--amber)' : 'var(--red)';
  const body =
    e.kind === 'call'
      ? `${e.tool}  ${e.input}`
      : `${t.link.linkWord}  ${[...e.online.map((n) => `+${n}`), ...e.offline.map((n) => `−${n}`)].join(' ')}`;
  return (
    <div className="line">
      <span className="status-dim">{clock(e.at)}</span>
      <span className="status-dim">›</span>
      <span className="body">{body}</span>
      <span className="word" style={{ color: fill }}><Lamp fill={fill} lit /> {word}</span>
    </div>
  );
}

export function LinkConsole({ linked }: { linked: boolean }) {
  const state = useGame((s) => s);
  const events = useLink();
  const collapsed = usePrefs((p) => p.linkCollapsed);
  const t = useStrings();
  const lamps = toolAvailability(state);
  const onlineCount = lamps.filter((l) => l.online).length;
  const recent = [...events].reverse().slice(0, 3);
  const last = recent[0];
  return (
    <section className="linkconsole" aria-label={t.link.region} title={t.hud.ailinkTitle}>
      <div className="bezel">
        <div className="row">
          <span className="engraved">{t.link.title}</span>
          <span className={`tool ${linked ? 'status-ok' : 'status-bad blink'}`}>
            <Lamp fill={linked ? 'var(--green)' : 'var(--red)'} lit /> {linked ? t.link.linked : t.link.severed}
          </span>
          <span className="status-dim">{t.link.online(onlineCount, lamps.length)}</span>
          {collapsed && last && (
            <span className="status-dim tool">
              {t.link.last} {last.kind === 'call' ? last.tool : t.link.linkWord}
            </span>
          )}
          <button className="fold" onClick={() => setPref('linkCollapsed', !collapsed)} aria-label={collapsed ? t.link.expand : t.link.collapse} aria-expanded={!collapsed}>
            {collapsed ? '▸' : '▾'}
          </button>
        </div>
        {!collapsed && (
          <>
            {BUSES.map((bus) => (
              <div className="row" key={bus}>
                <span className="engraved">{t.reactor.bus[bus]}</span>
                {state.chapter3.shielded.includes(bus) && <span className="tag">{t.link.shielded}</span>}
                {lamps.filter((l) => l.bus === bus).map((l) => {
                  const s = lampOf(l);
                  return (
                    <span key={l.name} className={`tool ${LAMP_CLASS[s]}`} aria-label={t.link.lamp(l.name, s)}>
                      <Lamp fill={LAMP_FILL[s]} lit={s !== 'dark'} blink={s === 'silenced'} /> {l.name}
                    </span>
                  );
                })}
              </div>
            ))}
            <div className="ticker" aria-live="polite">
              {recent.length === 0 ? (
                <div className="line status-dim">{t.link.empty}</div>
              ) : (
                recent.map((e, i) => <TickerLine key={`${e.at}-${i}`} e={e} />)
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
