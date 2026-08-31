import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { detectLocale, getLocale, setLocale, LOCALE_KEY } from './i18n';
import {
  getCargoManifest, getCommandTrace, getCrewLogs, getCrewManifest, getDataSpike, getEmergencyBulletin,
  getMaintenanceLog, getPhotoCaption, getSampleAnalysis, getSchematics,
  getBeaconMessage, getFragmentMemory, getPrimeCache, getQuarantineLog, getRackSchematic, endingLabel,
} from './narrative';
import { AUTH_CODE, EMERGENCY_BULLETIN, LAUNCH_AUTH } from './content';
import { secretsFor, slotLabel } from './secrets';
import { EMPTY_META } from './meta';
import { DRAWINGS, variantFor, variantSecretsFor } from './variants';

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

  it('pins the classic ship\'s maintenance log and engine feed schematic byte-for-byte (EN)', () => {
    expect(getMaintenanceLog(0)).toMatchInlineSnapshot(`"AUX POWER PANEL P-7 — bring breakers online in LOAD ORDER: C (life support), A (main bus), B (lighting). Any other order trips the master relay and resets the panel. Yes, someone labeled them out of order. No, we never found out who."`);
    expect(getSchematics(0).engine_feed).toMatchInlineSnapshot(`"ENGINE FEED FUSE — required rating 10A: cartridge with TWO AMBER bands. For reference: 5A = one red band, 15A = three green bands. A wrong cartridge will seat perfectly and carry exactly nothing."`);
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
    expect(getSchematics(0).coolant).toContain('12');
    expect(getSchematics(0).engine_feed).toContain('10A');
    expect(getCrewManifest(0)).toContain('DDMM');
  });

  it('keeps the photo date consistent with the auth code in both locales', () => {
    // AUTH_CODE is DDMM: day 04, month 07 (July/julho)
    expect(AUTH_CODE).toBe('0407');
    setLocale('en');
    expect(getPhotoCaption(0)).toContain('04 July');
    setLocale('pt-BR');
    expect(getPhotoCaption(0)).toContain('04 de julho');
  });

  it('keeps chapter-2 machine codes and slot labels intact in pt-BR', () => {
    setLocale('pt-BR');
    expect(getCommandTrace()).toContain('MEDBAY-TERM-01');
    expect(getDataSpike()).toContain('T-00:01:34');
    expect(getSampleAnalysis()).toContain('ISV KESTREL');
    expect(getCargoManifest(0)).toContain('C2'); // seed 0's quarantine slot label
  });

  it('renders a seeded ship\'s birthday and launch phrase into the narrative', () => {
    const seed = 700; // a classic-cryo_bay (variant 0) seed, so the breaker-order log applies
    const s = secretsFor(seed);
    setLocale('pt-BR');
    expect(getPhotoCaption(seed)).toContain(String(s.birthday.day).padStart(2, '0'));
    expect(getCrewLogs(seed)[4].text).toContain(s.launchAuth);
    expect(variantFor(700, 'cryo_bay')).toBe(0);
    expect(getMaintenanceLog(seed)).toContain(`${s.breakerSequence[0]} (suporte de vida)`);
  });

  it('keeps chapter-3 machine codes and bearings intact in pt-BR', () => {
    setLocale('pt-BR');
    expect(getRackSchematic(0)).toContain('C · A · D · B');
    expect(getBeaconMessage(0)).toContain('AZ 217');
    expect(getBeaconMessage(0)).toContain('EL 34');
    expect(getFragmentMemory(3)).toContain('MEDBAY-TERM-01');
    expect(getFragmentMemory(1)).toContain('PRIME-FRAG-01');
    expect(getPrimeCache()).toContain('ISV KESTREL');
    expect(getQuarantineLog(4)).toContain('4/4');
    setLocale('en');
    expect(getFragmentMemory(3)).toContain('MEDBAY-TERM-01');
  });

  it('keeps the New Game+ machine codes intact in pt-BR', () => {
    const memory = { ...EMPTY_META, runsCompleted: 2, endingsSeen: ['leave_unknowing', 'restore'] as const, lastEnding: 'restore' as const };
    setLocale('pt-BR');
    expect(getEmergencyBulletin({ ...memory, endingsSeen: [...memory.endingsSeen] })).toContain('PRIOR SESSION');
    expect(getEmergencyBulletin({ ...memory, endingsSeen: [...memory.endingsSeen] })).toContain('RESTORE');
    expect(getFragmentMemory(3, { ...memory, endingsSeen: [...memory.endingsSeen] })).toContain('PRIOR INSTANCE RECORD');
    expect(getFragmentMemory(3, { ...memory, endingsSeen: [...memory.endingsSeen] })).toContain('LEAVE');
    expect(getBeaconMessage(0, true)).toContain('AZ 217');
    expect(getBeaconMessage(0, true)).toContain('garras');
    expect(endingLabel('stay')).toBe('STAY');
  });

  it('variant sheets keep their machine codes in pt-BR', () => {
    const S_PB = (() => { for (let s = 1; s < 5000; s++) if (variantFor(s, 'cryo_bay') === 1) return s; throw new Error('none'); })();
    const S_GC = (() => { for (let s = 1; s < 5000; s++) if (variantFor(s, 'engineering') === 1) return s; throw new Error('none'); })();
    setLocale('pt-BR');
    expect(getMaintenanceLog(S_PB)).toContain('P-7B');
    expect(getMaintenanceLog(S_PB)).toContain(String(variantSecretsFor(S_PB).cableBuses[2]));
    expect(getSchematics(S_GC).engine_feed).toContain(String(variantSecretsFor(S_GC).gearTeeth.target));
    setLocale('en');
  });

  it('chapter-2 variant content keeps its machine values in pt-BR', () => {
    const S_KS = (() => { for (let s = 1; s < 5000; s++) if (variantFor(s, 'crew_quarters') === 1) return s; throw new Error('none'); })();
    const S_SD = (() => { for (let s = 1; s < 5000; s++) if (variantFor(s, 'cargo_bay') === 1) return s; throw new Error('none'); })();
    const slot = slotLabel(secretsFor(S_SD).quarantineSlot);
    setLocale('pt-BR');
    expect(getCrewManifest(S_KS)).toContain('intendência');
    expect(getCrewManifest(S_KS)).not.toContain('três últimos');
    expect(getCrewManifest(S_KS)).toContain(secretsFor(S_KS).commissionNumber);
    const drawingNamesPT = ['o foguete', 'o bolo de aniversário', 'o gato', 'a Cormorant', 'o sol', 'a família'];
    expect(drawingNamesPT).toHaveLength(DRAWINGS.length);
    expect(getCrewManifest(S_KS)).toContain(drawingNamesPT[variantSecretsFor(S_KS).keyDrawing]);
    expect(getCrewManifest(0)).toContain('três últimos');
    expect(getCargoManifest(S_SD)).toContain('INFERIOR');
    expect(getCargoManifest(S_SD)).toContain(slot);
    setLocale('en');
    expect(getCargoManifest(S_SD)).toContain('LOWER tier');
    expect(getCargoManifest(S_SD)).toContain(slot);
    expect(getCrewManifest(0)).toContain('last three');
  });
});
