# Admin Management Module — Design Spec

## Goal
Add a protected admin panel that lets a super-admin create users manually, view all users, and deactivate/reactivate accounts. Bootstrap an initial admin account (`roman.p` / `Romari0s`).

## Architecture

### Schema changes (`User` model)
| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `isAdmin` | `Boolean` | `false` | Gates access to admin routes and UI |
| `isActive` | `Boolean` | `true` | Deactivated users cannot log in |

A Prisma migration adds both fields. All existing rows default to `isAdmin=false`, `isActive=true`.

### Server

**Middleware — `server/src/middleware/adminAuth.ts`**
- Calls `requireAuth` (validates JWT, sets `req.userId`)
- Fetches `user.isAdmin` from DB; returns `403 FORBIDDEN` if false
- Exported as `requireAdmin`

**Service — `server/src/services/admin.service.ts`**
- `listUsers()` → `UserAdminDTO[]` (id, name, email, isAdmin, isActive, createdAt, avatarUrl)
- `createUser(name, email, password)` → `UserAdminDTO` — hashes password with bcrypt (same cost as auth.service), throws `CONFLICT` if email taken
- `setUserActive(userId, active: boolean)` → `UserAdminDTO` — toggles `isActive`; throws `NOT_FOUND` if user missing; prevents deactivating yourself

**Routes — `server/src/routes/admin.ts`** (mounted at `/api/admin`)
| Method | Path | Body | Response |
|--------|------|------|----------|
| `GET` | `/users` | — | `UserAdminDTO[]` |
| `POST` | `/users` | `{ name, email, password }` | `UserAdminDTO` (201) |
| `PATCH` | `/users/:id/deactivate` | — | `UserAdminDTO` |
| `PATCH` | `/users/:id/activate` | — | `UserAdminDTO` |

All routes protected by `requireAdmin`.

**Auth service change — `server/src/services/auth.service.ts`**
- `login()` checks `isActive`; if `false` returns `403` with code `ACCOUNT_DISABLED`.

**Seed script — `server/src/scripts/seedAdmin.ts`**
- Creates one admin user: name `Roman P`, email `roman.p@split.local`, password `Romari0s`, `isAdmin=true`, `isActive=true`, `emailVerified=true`
- Idempotent: skips if email already exists
- Run via `npx ts-node src/scripts/seedAdmin.ts`

### Client

**Hook — `client/src/hooks/useAdmin.ts`**
- `useAdminUsers()` → `useQuery(['admin', 'users'], GET /api/admin/users)`
- `useCreateUser()` → `useMutation(POST /api/admin/users)`, invalidates `['admin','users']`
- `useToggleUserActive(userId)` → `useMutation(PATCH /api/admin/users/:id/deactivate|activate)`, invalidates `['admin','users']`

**Page — `client/src/pages/admin/AdminPage.tsx`**
- Table columns: Name, Email, Status badge (`Active` green / `Inactive` red), Admin badge, Created date, Action button
- "Add User" button → modal with fields: Full Name, Email, Password (shown, not masked — admin context)
- Submit calls `useCreateUser`; shows inline error on conflict
- Deactivate/Activate button per row; disabled for the currently-logged-in user (can't self-deactivate)

**Route guard — `client/src/components/AdminRoute.tsx`**
- Reads `user.isAdmin` from auth store
- If false (or not logged in): redirects to `/dashboard`

**Auth store — `client/src/stores/auth.store.ts`**
- Add `isAdmin: boolean` to the `User` interface
- `/api/auth/me` response must include `isAdmin`

**Me route — `server/src/routes/me.ts`** (existing)
- `GET /api/me` (or equivalent "me" endpoint) must return `isAdmin` in the user payload

**Sidebar — `client/src/components/layout/Sidebar.tsx`**
- Shows 🛡️ Admin nav item only when `user.isAdmin === true`

**App.tsx**
- Add route: `<Route path="admin" element={<AdminRoute><AdminPage /></AdminRoute>} />`

### i18n — keys added to EN / HE / RU
```
admin.title           "Admin Panel"
admin.users           "Users"
admin.addUser         "Add User"
admin.name            "Full Name"
admin.email           "Email"
admin.password        "Password"
admin.create          "Create User"
admin.creating        "Creating…"
admin.statusActive    "Active"
admin.statusInactive  "Inactive"
admin.deactivate      "Deactivate"
admin.activate        "Activate"
admin.adminBadge      "Admin"
admin.createdAt       "Joined"
admin.failedCreate    "Failed to create user. Email may already exist."
admin.failedToggle    "Failed to update user status."
nav.admin             "Admin"
```

## Data Flow
1. Admin logs in → receives JWT; auth store saves `isAdmin=true`
2. Sidebar shows Admin link
3. Admin navigates to `/admin` → `AdminRoute` checks store → renders `AdminPage`
4. Page fetches `GET /api/admin/users` (JWT in header) → `requireAdmin` validates → returns list
5. Admin fills "Add User" form → `POST /api/admin/users` → server hashes password, creates user, returns DTO
6. Admin clicks Deactivate → `PATCH /api/admin/users/:id/deactivate` → `isActive=false`; row updates inline

## Error Handling
- Duplicate email on create → `409 CONFLICT` → show inline error in modal
- Deactivating self → server returns `400 CANNOT_DEACTIVATE_SELF` → show toast
- Non-admin hitting `/api/admin/*` → `403 FORBIDDEN`
- Non-admin navigating to `/admin` → redirect to `/dashboard`

## Security
- `requireAdmin` is a separate middleware from `requireAuth`; admin status is always re-fetched from DB (not trusted from JWT payload)
- Admin password shown in create form (intentional: admin is entering it for someone else)
- No admin can be deactivated by another admin (future: consider allowing, but out of scope for now — admins can only deactivate non-admin users in v1)
