# Mobile Navigation Design

## Goal
Replace the always-visible sidebar with a responsive layout: full sidebar on desktop, compact top icon bar on mobile.

## Behaviour by breakpoint

### Desktop (md and above, ≥768px)
- No change. Existing `Sidebar` component renders as-is: `w-56`, sticky, full height.

### Mobile (below md, <768px)
- Sidebar is hidden (`hidden md:flex`).
- A `MobileNav` component renders at the top of the screen, fixed, full width.
- Structure of `MobileNav`:
  - **Top row:** `☰` hamburger button (left) · `💸 Split` title (center) · current page name (right, derived from active route)
  - **Icon row:** one icon button per nav item — 🏠 👥 💸 📊 🔔 (and 🛡️ if admin). No text labels. Active item highlighted in blue (`bg-blue-600`).
  - **Drawer:** tapping `☰` toggles a slide-down panel containing: `LanguageSelector`, logout button, and admin link if `user.isAdmin`. Tapping anywhere outside closes it.

## Nav items
Same as current sidebar:
- 🏠 Dashboard → `/dashboard`
- 👥 Groups → `/groups`
- 💸 Expenses → `/expenses`
- 📊 Analytics → `/analytics`
- 🔔 Notifications → `/notifications`
- 🛡️ Admin → `/admin` (admin only)

## Files

| File | Action |
|------|--------|
| `client/src/components/layout/MobileNav.tsx` | Create — top bar + icon row + drawer |
| `client/src/components/layout/Sidebar.tsx` | Modify — add `hidden md:flex` to `<aside>` |
| `client/src/components/layout/AppLayout.tsx` | Modify — render `<MobileNav />` above `<main>` on mobile; add top padding on mobile so content isn't obscured by the fixed bar |

## Styling
- Same dark palette as sidebar: `bg-slate-800`, `border-slate-700`, `text-slate-300`
- Active icon: `bg-blue-600 text-white rounded-lg`
- Fixed top bar height: ~88px total (two rows). Main content gets `pt-[88px] md:pt-0`.
- Drawer animates open with a simple CSS transition (`max-height` or `translate-y`).

## Out of scope
- No swipe gestures
- No animated page transitions
- Desktop layout is untouched
