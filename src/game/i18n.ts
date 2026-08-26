import { createStore } from 'zustand/vanilla';

export type Locale = 'en' | 'pt-BR';

export const LOCALE_KEY = 'derelict-locale';

export function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(LOCALE_KEY);
    if (saved === 'en' || saved === 'pt-BR') return saved;
  } catch {
    // No storage available; fall through to browser language.
  }
  try {
    if (navigator.language.toLowerCase().startsWith('pt')) return 'pt-BR';
  } catch {
    // No navigator (tests, exotic hosts).
  }
  return 'en';
}

export const localeStore = createStore<{ locale: Locale }>(() => ({ locale: detectLocale() }));

export function getLocale(): Locale {
  return localeStore.getState().locale;
}

export function setLocale(locale: Locale): void {
  localeStore.setState({ locale });
  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch {
    // Private mode: the choice just doesn't survive a reload.
  }
}
