import { jsx as _jsx } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
const LANGS = [
    { code: 'en', label: 'EN' },
    { code: 'he', label: 'עב' },
    { code: 'ru', label: 'RU' },
];
export function LanguageSelector() {
    const { i18n } = useTranslation();
    return (_jsx("div", { className: "flex gap-1", children: LANGS.map(({ code, label }) => (_jsx("button", { onClick: () => i18n.changeLanguage(code), className: `px-2 py-1 rounded text-xs font-medium transition-colors ${i18n.language === code
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`, children: label }, code))) }));
}
