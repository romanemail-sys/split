import { NavLink } from 'react-router-dom';
import { useLogout } from '../../hooks/useAuth';

const navItems = [
  { to: '/dashboard', icon: '🏠', label: 'דאשבורד' },
  { to: '/groups', icon: '👥', label: 'קבוצות' },
  { to: '/expenses', icon: '💸', label: 'הוצאות' },
  { to: '/analytics', icon: '📊', label: 'ניתוח' },
  { to: '/notifications', icon: '🔔', label: 'התראות' },
];

export default function Sidebar() {
  const logout = useLogout();

  return (
    <aside className="w-56 bg-slate-800 border-l border-slate-700 flex flex-col h-screen sticky top-0">
      <div className="p-5 border-b border-slate-700">
        <span className="text-xl font-bold">💸 Split</span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'
              }`
            }
          >
            <span>{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-slate-700">
        <button
          onClick={() => logout.mutate()}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-700 transition-colors"
        >
          <span>🚪</span>
          <span>התנתק</span>
        </button>
      </div>
    </aside>
  );
}
