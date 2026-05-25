import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
export function GroupCard({ group }) {
    const { t } = useTranslation();
    return (_jsxs(Link, { to: `/groups/${group.id}`, className: "block rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow", children: [_jsxs("div", { className: "flex items-center gap-3 mb-3", children: [group.imageUrl ? (_jsx("img", { src: group.imageUrl, alt: group.name, className: "w-10 h-10 rounded-full object-cover" })) : (_jsx("div", { className: "w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-lg", children: group.name[0].toUpperCase() })), _jsxs("div", { children: [_jsx("h3", { className: "font-semibold text-slate-900", children: group.name }), _jsxs("p", { className: "text-xs text-slate-500", children: [t('groups.members_other', { count: group.members.length }), " \u00B7 ", group.defaultCurrency] })] })] }), group.description && (_jsx("p", { className: "text-sm text-slate-500 line-clamp-2", children: group.description }))] }));
}
