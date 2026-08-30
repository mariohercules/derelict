import { describe, expect, it } from 'vitest';

// The instrument palette lives in theme.css. These literals were the recurring
// bezel/face/brass colours across every scene; once tokenized they must not
// creep back as hex, or the scenes drift apart again.
const TOKENIZED = ['#3a4a40', '#7a8f82', '#4a5a50', '#1d2620', '#0c110e', '#080b09', '#0a0e0c', '#2a3a30', '#131a16', '#c9a55a', '#e2c27a', '#b8893e', '#6e4f1e', '#c9c1a5'];

// Raw sources, resolved at build time by Vite — no Node fs needed.
const sources: Record<string, string> = {
  ...import.meta.glob('../scenes/*.tsx', { query: '?raw', import: 'default', eager: true }),
  ...import.meta.glob('../ui/DeckMap.tsx', { query: '?raw', import: 'default', eager: true }),
} as Record<string, string>;
const css = (import.meta.glob('./theme.css', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)['./theme.css'];

describe('instrument palette', () => {
  it('defines every instrument token in theme.css with its original value', () => {
    expect(css, 'theme.css must load as raw text (see vite.config.ts test.css.include)').toBeTruthy();
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
    for (const [file, src] of Object.entries(sources)) {
      const lower = src.toLowerCase();
      for (const hex of TOKENIZED) {
        expect(lower.includes(hex), `${file} still contains ${hex}`).toBe(false);
      }
    }
  });
});
