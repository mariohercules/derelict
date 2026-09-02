import { EDGES, ROOMS, ROOM_BY_ID, roomStatus } from '../game/rooms';
import { enterRoom } from '../game/store';
import { useGame } from './useGame';
import { useStrings } from './useLocale';

export const HULL_PATH = 'M 14 30 L 40 14 L 370 14 L 392 45 L 392 105 L 370 128 L 40 128 L 14 110 Z';

const FILL = { current: 'var(--amber)', open: 'var(--steel-lo)', locked: '#10151a', sealed: '#0b0e0c' } as const;
const STROKE = { current: 'var(--amber)', open: 'var(--green)', locked: 'var(--dim)', sealed: 'var(--line)' } as const;

// Splits a room label into up to two lines so it fits its 60×32 map box.
// Short labels pass through untouched; long ones are balanced across two
// lines by word — a single long word (e.g. "HYDROPONICS") stays on one line.
export function splitLabel(label: string, max = 11): string[] {
  if (label.length <= max) return [label];
  const words = label.split(' ');
  if (words.length === 1) return [label];
  // balance the two lines: move words to the first line while it stays under half the total
  const lines: string[] = ['', ''];
  const half = label.length / 2;
  for (const w of words) {
    if (lines[1] === '' && (lines[0].length === 0 || lines[0].length + 1 + w.length <= half + 2)) {
      lines[0] = lines[0] ? `${lines[0]} ${w}` : w;
    } else {
      lines[1] = lines[1] ? `${lines[1]} ${w}` : w;
    }
  }
  return lines[1] ? lines : [lines[0]];
}

export function DeckMap() {
  const state = useGame((s) => s);
  const t = useStrings();
  const statusLabel = { open: t.deck.legendOpen, locked: t.deck.legendLocked, sealed: t.deck.legendSealed } as const;
  return (
    <div className="deckmap" aria-label={t.deck.title}>
      <svg viewBox="0 0 400 140" width="100%" role="group">
        {/* hull silhouette */}
        <path d={HULL_PATH} fill="var(--hull)" stroke="var(--line)" strokeWidth="2" />
        <line x1="20" y1="72" x2="388" y2="72" stroke="var(--line)" strokeWidth="1" strokeDasharray="3 3" />
        {EDGES.map((e) => {
          const a = ROOM_BY_ID[e.a];
          const b = ROOM_BY_ID[e.b];
          const passable =
            a.chapter <= state.chapter && b.chapter <= state.chapter && (!e.door || state.doors[e.door]);
          return (
            <line key={`${e.a}-${e.b}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={passable ? 'rgba(125, 219, 138, 0.45)' : '#24302a'} strokeWidth="2"
              strokeDasharray={passable ? undefined : '3 3'} />
          );
        })}
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
              {(() => {
                const lines = splitLabel(t.hud.rooms[r.id].toUpperCase());
                const singleLine = lines.length === 1;
                return (
                  <text x={r.x} y={singleLine ? r.y + 3 : undefined} textAnchor="middle"
                    fontSize={singleLine ? '7.5' : '6.8'} letterSpacing={singleLine ? '0.5' : undefined}
                    fill={status === 'current' ? 'var(--hull)' : status === 'sealed' ? '#3d4f45' : 'var(--text)'}>
                    {lines.map((line, i) => {
                      const y = singleLine ? undefined : i === 0 ? r.y - 2 : r.y + 7;
                      const overflow = line.length > 11;
                      return (
                        <tspan key={i} x={r.x} y={y}
                          textLength={overflow ? 54 : undefined}
                          lengthAdjust={overflow ? 'spacingAndGlyphs' : undefined}>
                          {line}
                        </tspan>
                      );
                    })}
                  </text>
                );
              })()}
            </g>
          );
        })}
      </svg>
      <div className="status-dim" style={{ fontSize: 11 }}>
        <span style={{ color: 'var(--green)' }}>■</span> {t.deck.legendOpen}{' '}
        <span style={{ color: 'var(--dim)' }}>■</span> {t.deck.legendLocked}{' '}
        <span style={{ color: 'var(--line)' }}>■</span> {t.deck.legendSealed}
      </div>
    </div>
  );
}
