import { describe, it, expect } from 'vitest';
import { splitLabel } from './DeckMap';
import { STRINGS } from './strings';

describe('splitLabel', () => {
  it('leaves short labels on one line', () => {
    expect(splitLabel('CRYO BAY')).toEqual(['CRYO BAY']);
  });

  it('splits a pt-BR two-word label', () => {
    expect(splitLabel('BAIA CRIOGÊNICA')).toEqual(['BAIA', 'CRIOGÊNICA']);
  });

  it('splits a pt-BR three-word label, balancing toward the first line', () => {
    expect(splitLabel('ARRANJO DE COMMS')).toEqual(['ARRANJO DE', 'COMMS']);
  });

  it('splits another pt-BR three-word label', () => {
    expect(splitLabel('SALA DO REATOR')).toEqual(['SALA DO', 'REATOR']);
  });

  it('keeps a single long word on one line', () => {
    expect(splitLabel('HYDROPONICS')).toEqual(['HYDROPONICS']);
  });

  it('every room label, in every locale, wraps into lines that each fit the box', () => {
    for (const locale of Object.keys(STRINGS) as (keyof typeof STRINGS)[]) {
      const rooms = STRINGS[locale].hud.rooms;
      for (const [roomId, label] of Object.entries(rooms)) {
        const lines = splitLabel(label.toUpperCase());
        for (const line of lines) {
          const isSingleWord = !line.includes(' ');
          expect(
            line.length <= 11 || isSingleWord,
            `${locale}/${roomId} line "${line}" (${line.length} chars) is neither ≤11 chars nor a single word`,
          ).toBe(true);
        }
      }
    }
  });
});
