import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { useEffect } from 'react';
import ru from '../locales/ru.json';
import uz from '../locales/uz.json';
import { STORAGE_KEYS } from '../theme/appearance';

export const LANGUAGES = ['uz', 'ru'] as const;
export type Language = (typeof LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = 'uz';

const saved = (typeof window !== 'undefined'
  ? localStorage.getItem(STORAGE_KEYS.lang)
  : null) as Language | null;

const initial: Language = saved && LANGUAGES.includes(saved) ? saved : DEFAULT_LANGUAGE;

void i18n.use(initReactI18next).init({
  resources: {
    uz: { translation: uz },
    ru: { translation: ru },
  },
  lng: initial,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
});

/**
 * ⚠️ Bu qatlamga dizayn tizimi UMUMAN tegmaydi (TZ §9.1).
 * Bu yerda birorta rang yoki shrift yo'q — faqat til.
 */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const apply = (lng: string) => {
      document.documentElement.setAttribute('lang', lng);
      localStorage.setItem(STORAGE_KEYS.lang, lng);
    };
    apply(i18n.language);
    i18n.on('languageChanged', apply);
    return () => i18n.off('languageChanged', apply);
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

export default i18n;
