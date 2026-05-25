# Mobile Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a responsive mobile navigation bar that hides the sidebar on small screens and shows a compact top icon bar with a hamburger drawer.

**Architecture:** The existing `Sidebar` is hidden on mobile via `hidden md:flex`. A new `MobileNav` component renders only on mobile (`md:hidden`) as a fixed top bar with two rows: a title/hamburger row and an icon-only nav row. A local `open` state controls the hamburger drawer which contains the language selector and logout button.

**Tech Stack:** React, TypeScript, Tailwind CSS, react-router-dom `NavLink`/`useLocation`, react-i18next, Zustand auth store.

---

## File Map

| File | Action |
|------|--------|
| `client/src/components/layout/MobileNav.tsx` | **Create** — full mobile nav component |
| `client/src/components/layout/Sidebar.tsx` | **Modify** — add `hidden md:flex` to `<aside>` |
| `client/src/components/layout/AppLayout.tsx` | **Modify** — include `<MobileNav />`, add `pt-[88px] md:pt-0` to `<main>` |

---

### Task 1: Hide sidebar on mobile

**Files:**
- Modify: `client/src/components/layout/Sidebar.tsx:22`

- [ ] **Step 1: Edit Sidebar.tsx**

Change line 22 from:
```tsx
<aside className="w-56 bg-slate-800 border-e border-slate-700 flex flex-col h-screen sticky top-0 shrink-0">
```
to:
```tsx
<aside className="hidden md:flex w-56 bg-slate-800 border-e border-slate-700 flex-col h-screen sticky top-0 shrink-0">
```

- [ ] **Step 2: Verify visually**

Run `npm run dev` from `client/` (or the repo root with `npm run dev --workspace=client`). Resize the browser window below 768px — sidebar should disappear. Above 768px it should look unchanged.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/layout/Sidebar.tsx
git commit -m "feat: hide sidebar on mobile breakpoint"
```

---

### Task 2: Create MobileNav component

**Files:**
- Create: `client/src/components/layout/MobileNav.tsx`

- [ ] **Step 1: Create the file**

```tsx
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
        {/* Row 1: hamburger | title | active page */}
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
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/layout/MobileNav.tsx
git commit -m "feat: add MobileNav component with icon bar and hamburger drawer"
```

---

### Task 3: Wire MobileNav into AppLayout

**Files:**
- Modify: `client/src/components/layout/AppLayout.tsx`

- [ ] **Step 1: Update AppLayout.tsx**

Replace the entire file content with:

```tsx
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-slate-900">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <MobileNav />
        <main className="flex-1 bg-white text-slate-900 overflow-y-auto min-h-screen pt-[88px] md:pt-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify on mobile**

Run the dev server. At <768px width:
- Top bar shows with `☰` button, `💸 Split` title, and active page icon
- Icon row shows all nav icons; active one is highlighted blue
- Tapping `☰` opens the drawer with language selector and logout
- Tapping outside the drawer closes it
- Navigating to a page closes the drawer
- Content is not hidden behind the top bar (padding works)

At ≥768px width:
- Sidebar is visible, `MobileNav` is hidden (`md:hidden`)
- Layout looks exactly as before

- [ ] **Step 3: Commit**

```bash
git add client/src/components/layout/AppLayout.tsx
git commit -m "feat: wire MobileNav into AppLayout with mobile padding"
```

---

### Task 4: Deploy

- [ ] **Step 1: Push to trigger Render redeploy**

```bash
git push
```

- [ ] **Step 2: Verify on real device**

Open `https://split-client.onrender.com` on your phone. Check:
- Icon nav row is visible and tappable
- Active page is highlighted
- Hamburger drawer opens/closes
- Logout works from drawer
- Desktop view unchanged
