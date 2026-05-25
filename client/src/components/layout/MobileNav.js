import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLogout } from '../../hooks/useAuth';
import { useAuthStore } from '../../stores/auth.store';
import { LanguageSelector } from '../LanguageSelector';
export default function MobileNav() {
    const { t } = useTranslation();
    const logout = useLogout();
    const user = useAuthStore((s) => s.user);
    const location = useLocation();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const navItems = [
        { to: '/dashboard', icon: '🏠', label: t('nav.dashboard') },
        { to: '/groups', icon: '👥', label: t('nav.groups') },
        { to: '/expenses', icon: '💸', label: t('nav.expenses') },
        { to: '/analytics', icon: '📊', label: t('nav.analytics') },
        { to: '/notifications', icon: '🔔', label: t('nav.notifications') },
        ...(user?.isAdmin ? [{ to: '/admin', icon: '🛡️', label: t('nav.admin') }] : []),
    ];
    const activeItem = navItems.find((item) => location.pathname.startsWith(item.to));
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "md:hidden fixed top-0 left-0 right-0 z-50 bg-slate-800 border-b border-slate-700", children: [_jsxs("div", { className: "flex items-center justify-between px-4 py-2 border-b border-slate-700", children: [_jsx("button", { onClick: () => setDrawerOpen((o) => !o), className: "text-slate-300 hover:text-white p-1 text-xl", "aria-label": "Menu", children: drawerOpen ? '✕' : '☰' }), _jsx("span", { className: "text-white font-bold", children: "\uD83D\uDCB8 Split" }), _jsx("span", { className: "text-slate-400 text-sm", children: activeItem?.icon ?? '' })] }), _jsx("div", { className: "flex items-center justify-around px-2 py-1", children: navItems.map(({ to, icon, label }) => (_jsx(NavLink, { to: to, onClick: () => setDrawerOpen(false), className: ({ isActive }) => `flex items-center justify-center w-9 h-9 rounded-lg text-lg transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`, "aria-label": label, children: icon }, to))) }), drawerOpen && (_jsxs("div", { className: "border-t border-slate-700 px-4 py-3 space-y-3 bg-slate-800", children: [_jsx(LanguageSelector, {}), user?.isAdmin && (_jsxs(NavLink, { to: "/admin", onClick: () => setDrawerOpen(false), className: "flex items-center gap-2 text-sm text-slate-300 hover:text-white", children: [_jsx("span", { children: "\uD83D\uDEE1\uFE0F" }), _jsx("span", { children: t('nav.admin') })] })), _jsxs("button", { onClick: () => { setDrawerOpen(false); logout.mutate(); }, className: "flex items-center gap-2 text-sm text-slate-300 hover:text-white", children: [_jsx("span", { children: "\uD83D\uDEAA" }), _jsx("span", { children: t('nav.logout') })] })] }))] }), drawerOpen && (_jsx("div", { className: "md:hidden fixed inset-0 z-40", onClick: () => setDrawerOpen(false) }))] }));
}
