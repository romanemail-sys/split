import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLogout } from '../../hooks/useAuth';
import { useAuthStore } from '../../stores/auth.store';
import { LanguageSelector } from '../LanguageSelector';

interface NavItem {
  to: string;
  icon: string;
  label: string;
}

export default function MobileNav() {
  const { t } = useTranslation();
  const logout = useLogout();
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navItems: NavItem[] = [
    { to: '/dashboard', icon: '🏠', label: t('nav.dashboard') },
    { to: '/groups', icon: '👥', label: t('nav.groups') },
    { to: '/expenses', icon: '💸', label: t('nav.expenses') },
    { to: '/analytics', icon: '📊', label: t('nav.analytics') },
    { to: '/notifications', icon: '🔔', label: t('nav.notifications') },
    ...(user?.isAdmin ? [{ to: '/admin', icon: '🛡️', label: t('nav.admin') }] : []),
  ];

  const activeItem = navItems.find((item) => location.pathname.startsWith(item.to));

  return (
    <>
      {/* Fixed top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-slate-800 border-b border-slate-700">
        {/* Row 1: hamburger | title | active page icon */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
          <button
            onClick={() => setDrawerOpen((o) => !o)}
            className="text-slate-300 hover:text-white p-1 text-xl"
            aria-label="Menu"
          >
            {drawerOpen ? '✕' : '☰'}
          </button>
          <span className="text-white font-bold">💸 Split</span>
          <span className="text-slate-400 text-sm">{activeItem?.icon ?? ''}</span>
        </div>

        {/* Row 2: icon nav */}
        <div className="flex items-center justify-around px-2 py-1">
          {navItems.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setDrawerOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-center w-9 h-9 rounded-lg text-lg transition-colors ${
                  isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'
                }`
              }
              aria-label={label}
            >
              {icon}
            </NavLink>
          ))}
        </div>

        {/* Drawer */}
        {drawerOpen && (
          <div className="border-t border-slate-700 px-4 py-3 space-y-3 bg-slate-800">
            <LanguageSelector />
            {user?.isAdmin && (
              <NavLink
                to="/admin"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-2 text-sm text-slate-300 hover:text-white"
              >
                <span>🛡️</span>
                <span>{t('nav.admin')}</span>
              </NavLink>
            )}
            <button
              onClick={() => { setDrawerOpen(false); logout.mutate(); }}
              className="flex items-center gap-2 text-sm text-slate-300 hover:text-white"
            >
              <span>🚪</span>
              <span>{t('nav.logout')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Overlay to close drawer on outside tap */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-40"
          onClick={() => setDrawerOpen(false)}
        />
      )}
    </>
  );
}
