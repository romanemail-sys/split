# Admin Management Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a protected admin panel where a super-admin can create users manually, view all users, and deactivate/activate accounts; bootstrap the initial admin account `roman.p / Romari0s`.

**Architecture:** Two new fields (`isAdmin`, `isActive`) on the `User` Prisma model gate both server routes (via `requireAdmin` middleware that re-checks DB) and the client UI (via `AdminRoute` guard and sidebar conditional). The admin panel is a React page at `/admin` with a user table and "Add User" modal.

**Tech Stack:** Node/Express/Prisma (server), React/TanStack Query/Zustand (client), Zod validation, bcrypt, i18next (EN/HE/RU).

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Modify | `server/prisma/schema.prisma` | Add `isAdmin`, `isActive` to User |
| Create | `server/prisma/migrations/<ts>_add_admin_fields/migration.sql` | Prisma migration |
| Modify | `server/src/services/auth.service.ts` | `toUserDTO` includes `isAdmin`; `login` checks `isActive` |
| Create | `server/src/services/admin.service.ts` | `listUsers`, `createUser`, `setUserActive` |
| Create | `server/src/middleware/adminAuth.ts` | `requireAdmin` middleware |
| Create | `server/src/routes/admin.ts` | GET /users, POST /users, PATCH /:id/deactivate|activate |
| Modify | `server/src/app.ts` | Mount `/api/admin` router |
| Create | `server/src/scripts/seedAdmin.ts` | Create roman.p admin user idempotently |
| Modify | `shared/src/types/user.ts` | Add `isAdmin: boolean` |
| Modify | `client/src/hooks/useAdmin.ts` | `useAdminUsers`, `useCreateUser`, `useToggleUserActive` |
| Create | `client/src/components/AdminRoute.tsx` | Redirect non-admins to /dashboard |
| Create | `client/src/pages/admin/AdminPage.tsx` | User table + Add User modal |
| Modify | `client/src/components/layout/Sidebar.tsx` | Show Admin link when `user.isAdmin` |
| Modify | `client/src/App.tsx` | Add `/admin` route |
| Modify | `client/src/i18n/locales/en.json` | Admin i18n keys |
| Modify | `client/src/i18n/locales/he.json` | Admin i18n keys (Hebrew) |
| Modify | `client/src/i18n/locales/ru.json` | Admin i18n keys (Russian) |

---

## Task 1: Prisma schema migration

**Files:**
- Modify: `server/prisma/schema.prisma`
- Run: `npx prisma migrate dev`

- [ ] **Step 1: Add fields to schema**

Open `server/prisma/schema.prisma`. In the `User` model, add these two lines after `createdAt`:

```prisma
isAdmin   Boolean  @default(false)
isActive  Boolean  @default(true)
```

The User model should now look like:
```prisma
model User {
  id                   String    @id @default(uuid())
  name                 String
  email                String    @unique
  passwordHash         String?
  googleId             String?   @unique
  avatarUrl            String?
  defaultCurrency      String    @default("ILS")
  emailVerified        Boolean   @default(false)
  verifyEmailToken     String?   @unique
  resetPasswordToken   String?   @unique
  resetPasswordExpiry  DateTime?
  createdAt            DateTime  @default(now())
  isAdmin              Boolean   @default(false)
  isActive             Boolean   @default(true)

  groupsCreated   Group[]         @relation("GroupCreator")
  groupMembers    GroupMember[]
  expensesPaid    Expense[]       @relation("ExpensePaidBy")
  expenseSplits   ExpenseSplit[]
  settlementsFrom Settlement[]    @relation("SettlementFrom")
  settlementsTo   Settlement[]    @relation("SettlementTo")
  notifications   Notification[]
}
```

- [ ] **Step 2: Run migration**

```bash
cd /Users/romanp/Desktop/split/server
npx prisma migrate dev --name add_admin_fields
```

Expected output:
```
Applying migration `..._add_admin_fields`
The following migration(s) have been created and applied from new schema changes:
migrations/..._add_admin_fields/migration.sql
```

- [ ] **Step 3: Regenerate Prisma client**

```bash
npx prisma generate
```

Expected: `✔ Generated Prisma Client`

- [ ] **Step 4: Verify TypeScript still compiles**

```bash
npx tsc --noEmit
```

Expected: no output (zero errors)

- [ ] **Step 5: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "feat: add isAdmin and isActive fields to User model"
```

---

## Task 2: Update shared User type

**Files:**
- Modify: `shared/src/types/user.ts`

- [ ] **Step 1: Add `isAdmin` to the User interface**

Replace the entire contents of `shared/src/types/user.ts` with:

```typescript
export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  defaultCurrency: string;
  emailVerified: boolean;
  isAdmin: boolean;
  createdAt: string;
}
```

- [ ] **Step 2: Verify client still compiles**

```bash
cd /Users/romanp/Desktop/split/client
npx tsc --noEmit
```

Expected: no output (zero errors).

- [ ] **Step 3: Commit**

```bash
git add shared/src/types/user.ts
git commit -m "feat: add isAdmin to shared User type"
```

---

## Task 3: Update auth service — isAdmin in DTO + isActive login check

**Files:**
- Modify: `server/src/services/auth.service.ts`

- [ ] **Step 1: Update `toUserDTO` to include `isAdmin`**

In `server/src/services/auth.service.ts`, update the `AuthResponse` interface and `toUserDTO` function. Replace these two blocks:

Replace:
```typescript
interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    defaultCurrency: string;
    emailVerified: boolean;
    createdAt: string;
  };
  accessToken: string;
}

function toUserDTO(user: PrismaUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    defaultCurrency: user.defaultCurrency,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
  };
}
```

With:
```typescript
interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    defaultCurrency: string;
    emailVerified: boolean;
    isAdmin: boolean;
    createdAt: string;
  };
  accessToken: string;
}

function toUserDTO(user: PrismaUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    defaultCurrency: user.defaultCurrency,
    emailVerified: user.emailVerified,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt.toISOString(),
  };
}
```

- [ ] **Step 2: Add `isActive` check to `login()`**

In the `login` function, find the credentials check block and add the active check after the password check:

Replace:
```typescript
  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) throw new Error('INVALID_CREDENTIALS');

  const accessToken = generateAccessToken(user.id);
```

With:
```typescript
  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) throw new Error('INVALID_CREDENTIALS');

  if (!user.isActive) throw new Error('ACCOUNT_DISABLED');

  const accessToken = generateAccessToken(user.id);
```

- [ ] **Step 3: Handle ACCOUNT_DISABLED in the auth route**

In `server/src/routes/auth.ts`, find the login route error handler and add the new case:

Replace:
```typescript
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'INVALID_CREDENTIALS') {
      res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Server error' } });
  }
```

With:
```typescript
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'INVALID_CREDENTIALS') {
      res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
      return;
    }
    if (err instanceof Error && err.message === 'ACCOUNT_DISABLED') {
      res.status(403).json({ error: { code: 'ACCOUNT_DISABLED', message: 'This account has been deactivated' } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Server error' } });
  }
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/romanp/Desktop/split/server
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add server/src/services/auth.service.ts server/src/routes/auth.ts
git commit -m "feat: include isAdmin in user DTO; block login for inactive accounts"
```

---

## Task 4: Admin service

**Files:**
- Create: `server/src/services/admin.service.ts`

- [ ] **Step 1: Create the admin service**

Create `server/src/services/admin.service.ts` with this content:

```typescript
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';

const BCRYPT_ROUNDS = 12;

export interface UserAdminDTO {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  isActive: boolean;
  avatarUrl: string | null;
  createdAt: string;
}

function toAdminDTO(user: {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  isActive: boolean;
  avatarUrl: string | null;
  createdAt: Date;
}): UserAdminDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
    isActive: user.isActive,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISOString(),
  };
}

const SELECT = {
  id: true,
  name: true,
  email: true,
  isAdmin: true,
  isActive: true,
  avatarUrl: true,
  createdAt: true,
} as const;

export async function listUsers(): Promise<UserAdminDTO[]> {
  const users = await prisma.user.findMany({
    select: SELECT,
    orderBy: { createdAt: 'asc' },
  });
  return users.map(toAdminDTO);
}

export async function createUser(
  name: string,
  email: string,
  password: string
): Promise<UserAdminDTO> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error('EMAIL_IN_USE');

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, emailVerified: true },
    select: SELECT,
  });
  return toAdminDTO(user);
}

export async function setUserActive(
  userId: string,
  active: boolean,
  requestingUserId: string
): Promise<UserAdminDTO> {
  if (userId === requestingUserId) throw new Error('CANNOT_DEACTIVATE_SELF');

  const user = await prisma.user.findUnique({ where: { id: userId }, select: SELECT });
  if (!user) throw new Error('USER_NOT_FOUND');

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive: active },
    select: SELECT,
  });
  return toAdminDTO(updated);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/romanp/Desktop/split/server
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add server/src/services/admin.service.ts
git commit -m "feat: add admin service (listUsers, createUser, setUserActive)"
```

---

## Task 5: requireAdmin middleware

**Files:**
- Create: `server/src/middleware/adminAuth.ts`

- [ ] **Step 1: Create the middleware**

Create `server/src/middleware/adminAuth.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/token.service';
import { prisma } from '../lib/prisma';

export interface AdminRequest extends Request {
  userId: string;
}

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing token' } });
    return;
  }

  let userId: string;
  try {
    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);
    userId = payload.userId;
  } catch {
    res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true, isActive: true },
  });

  if (!user || !user.isActive || !user.isAdmin) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Admin access required' } });
    return;
  }

  (req as AdminRequest).userId = userId;
  next();
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/romanp/Desktop/split/server
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add server/src/middleware/adminAuth.ts
git commit -m "feat: add requireAdmin middleware (re-checks DB for isAdmin)"
```

---

## Task 6: Admin routes + mount in app

**Files:**
- Create: `server/src/routes/admin.ts`
- Modify: `server/src/app.ts`

- [ ] **Step 1: Create admin routes**

Create `server/src/routes/admin.ts`:

```typescript
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAdmin, AdminRequest } from '../middleware/adminAuth';
import { listUsers, createUser, setUserActive } from '../services/admin.service';

const router = Router();

router.use(requireAdmin);

const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6),
});

// GET /api/admin/users
router.get('/users', async (_req: Request, res: Response) => {
  const users = await listUsers();
  res.json(users);
});

// POST /api/admin/users
router.post('/users', validate(createUserSchema), async (req: Request, res: Response) => {
  try {
    const user = await createUser(req.body.name, req.body.email, req.body.password);
    res.status(201).json(user);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'EMAIL_IN_USE') {
      res.status(409).json({ error: { code: 'EMAIL_IN_USE', message: 'Email already in use' } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Server error' } });
  }
});

// PATCH /api/admin/users/:id/deactivate
router.patch('/users/:id/deactivate', async (req: Request, res: Response) => {
  try {
    const requestingUserId = (req as AdminRequest).userId;
    const user = await setUserActive(req.params.id, false, requestingUserId);
    res.json(user);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'CANNOT_DEACTIVATE_SELF') {
      res.status(400).json({ error: { code: 'CANNOT_DEACTIVATE_SELF', message: 'You cannot deactivate your own account' } });
      return;
    }
    if (err instanceof Error && err.message === 'USER_NOT_FOUND') {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Server error' } });
  }
});

// PATCH /api/admin/users/:id/activate
router.patch('/users/:id/activate', async (req: Request, res: Response) => {
  try {
    const requestingUserId = (req as AdminRequest).userId;
    const user = await setUserActive(req.params.id, true, requestingUserId);
    res.json(user);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'USER_NOT_FOUND') {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Server error' } });
  }
});

export default router;
```

- [ ] **Step 2: Mount in app.ts**

In `server/src/app.ts`, add the import and mount. After the existing imports, add:

```typescript
import adminRouter from './routes/admin';
```

After the line `app.use('/api/me', meRouter);`, add:

```typescript
app.use('/api/admin', adminRouter);
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/romanp/Desktop/split/server
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/admin.ts server/src/app.ts
git commit -m "feat: add admin routes (list/create/deactivate/activate users)"
```

---

## Task 7: Seed admin user

**Files:**
- Create: `server/src/scripts/seedAdmin.ts`
- Modify: `server/package.json` (add script)

- [ ] **Step 1: Create seed script**

Create `server/src/scripts/seedAdmin.ts`:

```typescript
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'roman.p@split.local';
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    console.log(`Admin user already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash('Romari0s', 12);
  const user = await prisma.user.create({
    data: {
      name: 'Roman P',
      email,
      passwordHash,
      isAdmin: true,
      isActive: true,
      emailVerified: true,
    },
  });

  console.log(`Admin user created: ${user.email} (id: ${user.id})`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Add npm script to server/package.json**

Open `server/package.json`. In the `"scripts"` object, add:

```json
"seed:admin": "ts-node src/scripts/seedAdmin.ts"
```

- [ ] **Step 3: Run the seed**

```bash
cd /Users/romanp/Desktop/split/server
npm run seed:admin
```

Expected output:
```
Admin user created: roman.p@split.local (id: <some-uuid>)
```

(If run again: `Admin user already exists: roman.p@split.local`)

- [ ] **Step 4: Commit**

```bash
git add server/src/scripts/seedAdmin.ts server/package.json
git commit -m "feat: add seedAdmin script; create roman.p admin account"
```

---

## Task 8: Client — useAdmin hook

**Files:**
- Create: `client/src/hooks/useAdmin.ts`

- [ ] **Step 1: Create the hook file**

Create `client/src/hooks/useAdmin.ts`:

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface UserAdminDTO {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  isActive: boolean;
  avatarUrl: string | null;
  createdAt: string;
}

export function useAdminUsers() {
  return useQuery<UserAdminDTO[]>({
    queryKey: ['admin', 'users'],
    queryFn: () => api.get('/admin/users').then((r) => r.data),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation<UserAdminDTO, Error, { name: string; email: string; password: string }>({
    mutationFn: (body) => api.post('/admin/users', body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useToggleUserActive() {
  const qc = useQueryClient();
  return useMutation<UserAdminDTO, Error, { userId: string; active: boolean }>({
    mutationFn: ({ userId, active }) =>
      api.patch(`/admin/users/${userId}/${active ? 'activate' : 'deactivate'}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/romanp/Desktop/split/client
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/useAdmin.ts
git commit -m "feat: add useAdmin hooks (list, create, toggle active)"
```

---

## Task 9: AdminRoute guard component

**Files:**
- Create: `client/src/components/AdminRoute.tsx`

- [ ] **Step 1: Create AdminRoute**

Create `client/src/components/AdminRoute.tsx`:

```typescript
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!user.isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/romanp/Desktop/split/client
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/AdminRoute.tsx
git commit -m "feat: add AdminRoute guard (redirects non-admins to dashboard)"
```

---

## Task 10: AdminPage component

**Files:**
- Create: `client/src/pages/admin/AdminPage.tsx`

- [ ] **Step 1: Create the page**

Create `client/src/pages/admin/AdminPage.tsx`:

```typescript
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/auth.store';
import { useAdminUsers, useCreateUser, useToggleUserActive, UserAdminDTO } from '../../hooks/useAdmin';

function StatusBadge({ isActive }: { isActive: boolean }) {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}
    >
      {isActive ? t('admin.statusActive') : t('admin.statusInactive')}
    </span>
  );
}

function AddUserModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const createUser = useCreateUser();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await createUser.mutateAsync(form);
      onClose();
    } catch {
      setError(t('admin.failedCreate'));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">{t('admin.addUser')}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.name')}</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.email')}</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.password')}</label>
            <input
              type="text"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              {t('expense.cancel')}
            </button>
            <button
              type="submit"
              disabled={createUser.isPending}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {createUser.isPending ? t('admin.creating') : t('admin.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UserRow({ user }: { user: UserAdminDTO }) {
  const { t } = useTranslation();
  const currentUser = useAuthStore((s) => s.user);
  const toggle = useToggleUserActive();
  const isSelf = currentUser?.id === user.id;

  const date = new Date(user.createdAt).toLocaleDateString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <tr className="border-t border-slate-100 hover:bg-slate-50">
      <td className="px-4 py-3 text-sm text-slate-900">
        {user.name}
        {user.isAdmin && (
          <span className="ms-2 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">
            {t('admin.adminBadge')}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">{user.email}</td>
      <td className="px-4 py-3"><StatusBadge isActive={user.isActive} /></td>
      <td className="px-4 py-3 text-xs text-slate-400">{date}</td>
      <td className="px-4 py-3 text-end">
        <button
          disabled={isSelf || toggle.isPending}
          onClick={() => toggle.mutate({ userId: user.id, active: !user.isActive })}
          className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            user.isActive
              ? 'bg-red-50 text-red-600 hover:bg-red-100'
              : 'bg-green-50 text-green-600 hover:bg-green-100'
          }`}
        >
          {user.isActive ? t('admin.deactivate') : t('admin.activate')}
        </button>
      </td>
    </tr>
  );
}

export function AdminPage() {
  const { t } = useTranslation();
  const { data: users, isLoading } = useAdminUsers();
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t('admin.title')}</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          + {t('admin.addUser')}
        </button>
      </div>

      {isLoading && <p className="text-slate-400 text-sm">{t('common.loading')}</p>}

      {!isLoading && users && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-start">{t('admin.name')}</th>
                <th className="px-4 py-3 text-start">{t('admin.email')}</th>
                <th className="px-4 py-3 text-start">{t('admin.users')}</th>
                <th className="px-4 py-3 text-start">{t('admin.createdAt')}</th>
                <th className="px-4 py-3 text-end"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => <UserRow key={u.id} user={u} />)}
            </tbody>
          </table>
        </div>
      )}

      {showModal && <AddUserModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/romanp/Desktop/split/client
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/admin/AdminPage.tsx
git commit -m "feat: add AdminPage (user table + Add User modal)"
```

---

## Task 11: Wire Sidebar + App.tsx

**Files:**
- Modify: `client/src/components/layout/Sidebar.tsx`
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Add Admin link to Sidebar (conditional on isAdmin)**

In `client/src/components/layout/Sidebar.tsx`, replace the existing `navItems` array:

Replace:
```typescript
  const navItems = [
    { to: '/dashboard', icon: '🏠', label: t('nav.dashboard') },
    { to: '/groups', icon: '👥', label: t('nav.groups') },
    { to: '/expenses', icon: '💸', label: t('nav.expenses') },
    { to: '/analytics', icon: '📊', label: t('nav.analytics') },
    { to: '/notifications', icon: '🔔', label: t('nav.notifications') },
  ];
```

With:
```typescript
  const user = useAuthStore((s) => s.user);

  const navItems = [
    { to: '/dashboard', icon: '🏠', label: t('nav.dashboard') },
    { to: '/groups', icon: '👥', label: t('nav.groups') },
    { to: '/expenses', icon: '💸', label: t('nav.expenses') },
    { to: '/analytics', icon: '📊', label: t('nav.analytics') },
    { to: '/notifications', icon: '🔔', label: t('nav.notifications') },
    ...(user?.isAdmin ? [{ to: '/admin', icon: '🛡️', label: t('nav.admin') }] : []),
  ];
```

Also add the import for `useAuthStore` at the top of Sidebar.tsx (it doesn't have it yet):

```typescript
import { useAuthStore } from '../../stores/auth.store';
```

- [ ] **Step 2: Add /admin route to App.tsx**

In `client/src/App.tsx`, add the import for `AdminRoute` and `AdminPage`:

```typescript
import AdminRoute from './components/AdminRoute';
import { AdminPage } from './pages/admin/AdminPage';
```

Inside the nested routes (after `notifications`), add:

```typescript
<Route path="admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/romanp/Desktop/split/client
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/layout/Sidebar.tsx client/src/App.tsx
git commit -m "feat: wire admin route and sidebar link"
```

---

## Task 12: i18n keys (EN / HE / RU)

**Files:**
- Modify: `client/src/i18n/locales/en.json`
- Modify: `client/src/i18n/locales/he.json`
- Modify: `client/src/i18n/locales/ru.json`

- [ ] **Step 1: Add keys to en.json**

In `client/src/i18n/locales/en.json`, add a new top-level `"admin"` key before `"common"`, and add `"admin"` to the `"nav"` section.

In the `"nav"` object, add:
```json
"admin": "Admin"
```

Add this new top-level block before `"common"`:
```json
"admin": {
  "title": "Admin Panel",
  "users": "Users",
  "addUser": "Add User",
  "name": "Full Name",
  "email": "Email",
  "password": "Password",
  "create": "Create User",
  "creating": "Creating…",
  "statusActive": "Active",
  "statusInactive": "Inactive",
  "deactivate": "Deactivate",
  "activate": "Activate",
  "adminBadge": "Admin",
  "createdAt": "Joined",
  "failedCreate": "Failed to create user. Email may already be in use.",
  "failedToggle": "Failed to update user status."
},
```

- [ ] **Step 2: Add keys to he.json**

In `client/src/i18n/locales/he.json`, add `"admin": "ניהול"` to `"nav"` and add before `"common"`:
```json
"admin": {
  "title": "פאנל ניהול",
  "users": "משתמשים",
  "addUser": "הוסף משתמש",
  "name": "שם מלא",
  "email": "אימייל",
  "password": "סיסמה",
  "create": "צור משתמש",
  "creating": "יוצר…",
  "statusActive": "פעיל",
  "statusInactive": "מושבת",
  "deactivate": "השבת",
  "activate": "הפעל",
  "adminBadge": "מנהל",
  "createdAt": "הצטרף",
  "failedCreate": "לא ניתן ליצור משתמש. כתובת האימייל אולי כבר בשימוש.",
  "failedToggle": "עדכון סטטוס המשתמש נכשל."
},
```

- [ ] **Step 3: Add keys to ru.json**

In `client/src/i18n/locales/ru.json`, add `"admin": "Админ"` to `"nav"` and add before `"common"`:
```json
"admin": {
  "title": "Панель администратора",
  "users": "Пользователи",
  "addUser": "Добавить пользователя",
  "name": "Полное имя",
  "email": "Email",
  "password": "Пароль",
  "create": "Создать пользователя",
  "creating": "Создание…",
  "statusActive": "Активен",
  "statusInactive": "Отключён",
  "deactivate": "Отключить",
  "activate": "Активировать",
  "adminBadge": "Админ",
  "createdAt": "Дата регистрации",
  "failedCreate": "Не удалось создать пользователя. Email уже может быть занят.",
  "failedToggle": "Не удалось обновить статус пользователя."
},
```

- [ ] **Step 4: Verify JSON is valid**

```bash
python3 -c "
import json
for lang in ['en', 'he', 'ru']:
    path = f'client/src/i18n/locales/{lang}.json'
    with open(path) as f: json.load(f)
    print(f'{lang}.json: valid')
" 
```

Expected:
```
en.json: valid
he.json: valid
ru.json: valid
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/romanp/Desktop/split/client
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add client/src/i18n/locales/
git commit -m "feat: add admin i18n keys for EN, HE, RU"
```

---

## Task 13: End-to-end smoke test

- [ ] **Step 1: Restart both servers**

```bash
# Kill existing processes
lsof -ti :3001 | xargs kill -9 2>/dev/null
lsof -ti :5173,5174 | xargs kill -9 2>/dev/null

# Start server
cd /Users/romanp/Desktop/split/server && npm run dev &
sleep 3

# Start client
cd /Users/romanp/Desktop/split/client && npm run dev &
sleep 3
```

- [ ] **Step 2: Verify admin endpoint is protected**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/admin/users
```

Expected: `401`

- [ ] **Step 3: Log in as admin and call the endpoint**

```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"roman.p@split.local","password":"Romari0s"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/admin/users | python3 -m json.tool | head -20
```

Expected: JSON array with at least the `roman.p@split.local` user, `isAdmin: true`.

- [ ] **Step 4: Open browser and log in**

Navigate to `http://localhost:5173/login` (or 5174 if 5173 is taken).
Log in with `roman.p@split.local` / `Romari0s`.

Expected: Dashboard loads, sidebar shows 🛡️ Admin link.

- [ ] **Step 5: Verify admin panel works**

Navigate to `/admin`. Expected:
- User table loads
- "Add User" button visible
- Roman P row has "Admin" badge
- Deactivate button is disabled for own row

- [ ] **Step 6: Create a test user via admin panel**

Click "Add User", fill in name/email/password, click "Create User".
Expected: Modal closes, user appears in table with "Active" badge.

- [ ] **Step 7: Deactivate and verify blocked login**

Click Deactivate on the test user. Expected: badge changes to "Inactive".

```bash
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<test-email>","password":"<test-password>"}' | python3 -m json.tool
```

Expected: `{"error": {"code": "ACCOUNT_DISABLED", ...}}`

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "feat: admin module complete — smoke test passed"
```
