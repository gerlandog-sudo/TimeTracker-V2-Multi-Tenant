import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import es_AR from './locales/es_AR.json';
import en_US from './locales/en_US.json';
import es_ES from './locales/es_ES.json';
import en_GB from './locales/en_GB.json';
import pt_BR from './locales/pt_BR.json';
import pt_PT from './locales/pt_PT.json';

const resources = {
  es_AR: { translation: es_AR },
  es_ES: { translation: es_ES },
  en_US: { translation: en_US },
  en_GB: { translation: en_GB },
  pt_BR: { translation: pt_BR },
  pt_PT: { translation: pt_PT }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'es_AR',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    }
  });

export default i18n;
