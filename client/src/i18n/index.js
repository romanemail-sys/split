import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import he from './locales/he.json';
import ru from './locales/ru.json';
const RTL_LANGS = ['he'];
function applyDirection(lang) {
    document.documentElement.dir = RTL_LANGS.includes(lang) ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
}
i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
    resources: {
        en: { translation: en },
        he: { translation: he },
        ru: { translation: ru },
    },
    fallbackLng: 'he',
    supportedLngs: ['en', 'he', 'ru'],
    detection: {
        order: ['localStorage', 'navigator'],
        caches: ['localStorage'],
        lookupLocalStorage: 'i18n_lang',
    },
    interpolation: { escapeValue: false },
});
applyDirection(i18n.language);
i18n.on('languageChanged', applyDirection);
export default i18n;
