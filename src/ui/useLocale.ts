import { useStore } from 'zustand';
import type { Locale } from '../game/i18n';
import { localeStore } from '../game/i18n';
import type { UIStrings } from './strings';
import { STRINGS } from './strings';

export function useLocale(): Locale {
  return useStore(localeStore, (s) => s.locale);
}

export function useStrings(): UIStrings {
  return STRINGS[useLocale()];
}
