import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLogout } from '../../hooks/useAuth';
import { useAuthStore } from '../../stores/auth.store';
import { LanguageSelector } from '../LanguageSelector';
export default function Sidebar() {
    const { t } = useTranslation();
    const logout = useLogout();
    const user = useAuthStore((s) => s.user);
    const navItems = [
        { to: '/dashboard', icon: '🏠', label: t('nav.dashboard') },
        { to: '/groups', icon: '👥', label: t('nav.groups') },
        { to: '/expenses', icon: '💸', label: t('nav.expenses') },
        { to: '/analytics', icon: '📊', label: t('nav.analytics') },
        { to: '/notifications', icon: '🔔', label: t('nav.notifications') },
        ...(user?.isAdmin ? [{ to: '/admin', icon: '🛡️', label: t('nav.admin') }] : []),
    ];
    return (_jsxs("aside", { className: "hidden md:flex w-56 bg-slate-800 border-e border-slate-700 flex-col h-screen sticky top-0 shrink-0", children: [_jsx("div", { className: "p-5 border-b border-slate-700", children: _jsx("span", { className: "text-xl font-bold text-white", children: "\uD83D\uDCB8 Split" }) }), _jsx("nav", { className: "flex-1 p-3 space-y-1", children: navItems.map(({ to, icon, label }) => (_jsxs(NavLink, { to: to, className: ({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`, children: [_jsx("span", { children: icon }), _jsx("span", { children: label })] }, to))) }), _jsxs("div", { className: "p-3 border-t border-slate-700 space-y-2", children: [_jsx(LanguageSelector, {}), _jsxs("button", { onClick: () => logout.mutate(), className: "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-700 transition-colors", children: [_jsx("span", { children: "\uD83D\uDEAA" }), _jsx("span", { children: t('nav.logout') })] })] })] }));
}
