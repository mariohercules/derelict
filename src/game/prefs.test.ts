import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_PREFS, PREFS_KEY, hydratePrefs, loadPrefs, prefsStore, setPref, validPrefs } from './prefs';

const storage = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => void storage.set(k, v),
  removeItem: (k: string) => void storage.delete(k),
});

beforeEach(() => {
  storage.clear();
  prefsStore.setState(EMPTY_PREFS, true);
});

describe('prefs', () => {
  it('validates shape, version and types', () => {
    expect(validPrefs(EMPTY_PREFS)).toBe(true);
    expect(validPrefs({ version: 2, muted: false, linkCollapsed: false })).toBe(false);
    expect(validPrefs({ version: 1, muted: 'yes', linkCollapsed: false })).toBe(false);
    expect(validPrefs(null)).toBe(false);
  });

  it('loads the empty prefs for nothing, garbage, or an invalid record', () => {
    expect(loadPrefs()).toEqual(EMPTY_PREFS);
    storage.set(PREFS_KEY, '{nope');
    expect(loadPrefs()).toEqual(EMPTY_PREFS);
    storage.set(PREFS_KEY, JSON.stringify({ version: 1, muted: 1, linkCollapsed: false }));
    expect(loadPrefs()).toEqual(EMPTY_PREFS);
  });

  it('setPref updates the store and persists; hydratePrefs reads it back', () => {
    setPref('muted', true);
    expect(prefsStore.getState()).toEqual({ version: 1, muted: true, linkCollapsed: false });
    expect(JSON.parse(storage.get(PREFS_KEY)!)).toEqual({ version: 1, muted: true, linkCollapsed: false });
    prefsStore.setState(EMPTY_PREFS, true);
    hydratePrefs();
    expect(prefsStore.getState().muted).toBe(true);
  });
});
