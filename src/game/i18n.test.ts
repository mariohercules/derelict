import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { detectLocale, getLocale, setLocale, LOCALE_KEY } from './i18n';
import {
  getCrewLogs, getCrewManifest, getEmergencyBulletin, getMaintenanceLog, getPhotoCaption, getSchematics,
} from './narrative';
import { AUTH_CODE, EMERGENCY_BULLETIN, LAUNCH_AUTH } from './content';
import { secretsFor } from './secrets';

const storage = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => void storage.set(k, v),
  removeItem: (k: string) => void storage.delete(k),
});

beforeEach(() => {
  storage.clear();
  setLocale('en');
  storage.clear(); // setLocale persists; tests start with no saved override
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => void storage.set(k, v),
    removeItem: (k: string) => void storage.delete(k),
  });
});

describe('detectLocale', () => {
  it('picks pt-BR for Portuguese browsers', () => {
    vi.stubGlobal('navigator', { language: 'pt-BR' });
    expect(detectLocale()).toBe('pt-BR');
  });

  it('falls back to en for anything else', () => {
    vi.stubGlobal('navigator', { language: 'en-US' });
    expect(detectLocale()).toBe('en');
  });

  it('prefers a saved override to the browser language', () => {
    vi.stubGlobal('navigator', { language: 'en-US' });
    storage.set(LOCALE_KEY, 'pt-BR');
    expect(detectLocale()).toBe('pt-BR');
  });
});

describe('setLocale', () => {
  it('updates the current locale and persists the choice', () => {
    setLocale('pt-BR');
    expect(getLocale()).toBe('pt-BR');
    expect(storage.get(LOCALE_KEY)).toBe('pt-BR');
  });
});

describe('localized narrative', () => {
  it('serves English content by default', () => {
    expect(getEmergencyBulletin()).toBe(EMERGENCY_BULLETIN);
  });

  it('serves pt-BR content when the locale is pt-BR', () => {
    setLocale('pt-BR');
    expect(getEmergencyBulletin()).not.toBe(EMERGENCY_BULLETIN);
    expect(getEmergencyBulletin()).toContain('ISV CORMORANT');
  });

  it('keeps machine codes intact in pt-BR', () => {
    setLocale('pt-BR');
    expect(getCrewLogs(0)[4].text).toContain(LAUNCH_AUTH);
    expect(getMaintenanceLog(0)).toMatch(/C.*A.*B/);
    expect(getSchematics().coolant).toContain('12');
    expect(getSchematics().engine_feed).toContain('10A');
    expect(getCrewManifest()).toContain('DDMM');
  });

  it('keeps the photo date consistent with the auth code in both locales', () => {
    // AUTH_CODE is DDMM: day 04, month 07 (July/julho)
    expect(AUTH_CODE).toBe('0407');
    setLocale('en');
    expect(getPhotoCaption(0)).toContain('04 July');
    setLocale('pt-BR');
    expect(getPhotoCaption(0)).toContain('04 de julho');
  });

  it('renders a seeded ship\'s birthday and launch phrase into the narrative', () => {
    const seed = 777;
    const s = secretsFor(seed);
    setLocale('pt-BR');
    expect(getPhotoCaption(seed)).toContain(String(s.birthday.day).padStart(2, '0'));
    expect(getCrewLogs(seed)[4].text).toContain(s.launchAuth);
    expect(getMaintenanceLog(seed)).toContain(`${s.breakerSequence[0]} (suporte de vida)`);
  });
});
