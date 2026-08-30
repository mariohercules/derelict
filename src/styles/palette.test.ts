import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// The instrument palette lives in theme.css. These literals were the recurring
// bezel/face/brass colours across every scene; once tokenized they must not
// creep back as hex, or the scenes drift apart again.
const TOKENIZED = ['#3a4a40', '#7a8f82', '#4a5a50', '#1d2620', '#0c110e', '#080b09', '#0a0e0c', '#2a3a30', '#131a16', '#c9a55a', '#e2c27a', '#b8893e', '#6e4f1e', '#c9c1a5'];

const scenes = readdirSync(join(__dirname, '../scenes')).filter((f) => f.endsWith('.tsx')).map((f) => join(__dirname, '../scenes', f));
const files = [...scenes, join(__dirname, '../ui/DeckMap.tsx')];

describe('instrument palette', () => {
  it('defines every instrument token in theme.css with its original value', () => {
    const css = readFileSync(join(__dirname, 'theme.css'), 'utf8');
    for (const [token, value] of [
      ['--steel', '#3a4a40'], ['--steel-hi', '#7a8f82'], ['--steel-mid', '#4a5a50'], ['--steel-lo', '#1d2620'],
      ['--face', '#0c110e'], ['--face-deep', '#080b09'],
      ['--brass', '#c9a55a'], ['--brass-hi', '#e2c27a'], ['--brass-mid', '#b8893e'], ['--brass-lo', '#6e4f1e'],
      ['--parchment', '#c9c1a5'],
    ]) {
      expect(css).toMatch(new RegExp(`${token}:\\s*${value};`, 'i'));
    }
  });

  it('scenes and the deck map reference the tokens, never the literals', () => {
    for (const file of files) {
      const src = readFileSync(file, 'utf8').toLowerCase();
      for (const hex of TOKENIZED) {
        expect(src.includes(hex), `${file} still contains ${hex}`).toBe(false);
      }
    }
  });
});
