import { setLocale } from '../game/i18n';
import { useLocale } from './useLocale';

export function LocaleToggle() {
  const locale = useLocale();
  const next = locale === 'en' ? 'pt-BR' : 'en';
  return (
    <button
      onClick={() => setLocale(next)}
      aria-label={locale === 'en' ? 'Mudar idioma para português' : 'Switch language to English'}
      style={{ padding: '4px 10px', fontSize: 11 }}
    >
      {locale === 'en' ? 'PT-BR' : 'EN'}
    </button>
  );
}
