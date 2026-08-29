import { ROOMS, roomStatus } from '../game/rooms';
import { enterRoom } from '../game/store';
import { useGame } from './useGame';
import { useStrings } from './useLocale';

const FILL = { current: 'var(--amber)', open: '#1d2620', locked: '#10151a', sealed: '#0b0e0c' } as const;
const STROKE = { current: 'var(--amber)', open: 'var(--green)', locked: 'var(--dim)', sealed: '#2a3a30' } as const;

export function DeckMap() {
  const state = useGame((s) => s);
  const t = useStrings();
  const statusLabel = { open: t.deck.legendOpen, locked: t.deck.legendLocked, sealed: t.deck.legendSealed } as const;
  return (
    <div className="deckmap" aria-label={t.deck.title}>
      <svg viewBox="0 0 400 140" width="100%" role="group">
        {/* hull silhouette */}
        <path d="M 14 30 L 40 14 L 370 14 L 392 45 L 392 105 L 370 128 L 40 128 L 14 110 Z" fill="#0a0e0c" stroke="#2a3a30" strokeWidth="2" />
        <line x1="20" y1="72" x2="388" y2="72" stroke="#2a3a30" strokeWidth="1" strokeDasharray="3 3" />
        {ROOMS.map((r) => {
          const status = roomStatus(state, r.id);
          const clickable = status === 'open';
          return (
            <g
              key={r.id}
              onClick={clickable ? () => enterRoom(r.id) : undefined}
              onKeyDown={
                clickable
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        if (e.key === ' ') e.preventDefault();
                        enterRoom(r.id);
                      }
                    }
                  : undefined
              }
              tabIndex={clickable ? 0 : undefined}
              style={{ cursor: clickable ? 'pointer' : 'default' }}
              role={clickable ? 'button' : undefined}
              aria-label={status === 'current' ? t.hud.rooms[r.id] : `${t.hud.rooms[r.id]} — ${statusLabel[status]}`}
            >
              <rect x={r.x - 30} y={r.y - 16} width="60" height="32" rx="3"
                fill={FILL[status]} stroke={STROKE[status]} strokeWidth={status === 'current' ? 2 : 1}
                strokeDasharray={status === 'sealed' ? '2 2' : undefined} />
              <text x={r.x} y={r.y + 3} textAnchor="middle" fontSize="7.5" letterSpacing="0.5"
                fill={status === 'current' ? '#0a0e0c' : status === 'sealed' ? '#3d4f45' : 'var(--text)'}>
                {t.hud.rooms[r.id].toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="status-dim" style={{ fontSize: 11 }}>
        <span style={{ color: 'var(--green)' }}>■</span> {t.deck.legendOpen}{' '}
        <span style={{ color: 'var(--dim)' }}>■</span> {t.deck.legendLocked}{' '}
        <span style={{ color: '#2a3a30' }}>■</span> {t.deck.legendSealed}
      </div>
    </div>
  );
}
