# Groups, Expenses & Currency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add groups, expenses with 4 split types, multi-currency support, receipt uploads, and the corresponding client UI pages.

**Architecture:** Server-side services handle business logic (group membership, split calculations, currency conversion with DB caching); Express routes with `requireAuth` middleware expose the API; React Query hooks on the client consume the API; shared types in `shared/src/types/` are used by the client only (server uses inline interfaces due to `rootDir: "./src"` tsconfig constraint).

**Tech Stack:** Express, Prisma, PostgreSQL, Zod, React Query v5, React Router v6, Tailwind CSS, shadcn/ui, Cloudinary (optional), open.er-api.com for currency rates.

---

## File Map

**Create:**
- `shared/src/types/group.ts` — Group, GroupMember, GroupWithMembers, request types, GroupBalance
- `shared/src/types/expense.ts` — Expense, ExpenseSplit, Category, SplitType, request types, ExpensesPage
- `server/src/services/currency.service.ts` — getExchangeRate with DB cache
- `server/src/services/group.service.ts` — CRUD + membership management
- `server/src/services/expense.service.ts` — calculateSplits, CRUD, listing
- `server/src/services/balance.service.ts` — computeGroupBalances
- `server/src/routes/groups.ts` — group + member routes
- `server/src/routes/expenses.ts` — expense routes
- `server/src/routes/categories.ts` — category listing
- `server/src/routes/uploads.ts` — receipt upload via Cloudinary
- `client/src/hooks/useGroups.ts` — React Query hooks for groups
- `client/src/hooks/useExpenses.ts` — React Query hooks for expenses
- `client/src/pages/GroupsPage.tsx` — groups grid + create modal
- `client/src/components/GroupCard.tsx` — group card component
- `client/src/pages/GroupDetailPage.tsx` — members, expenses, balances tabs
- `client/src/pages/expenses/ExpenseFormPage.tsx` — create/edit expense with split editor
- `client/src/components/expense/SplitEditor.tsx` — per-split-type UI
- `client/src/pages/expenses/ExpenseDetailPage.tsx` — expense view

**Modify:**
- `shared/src/index.ts` — export new types
- `server/src/config.ts` — add optional Cloudinary vars
- `server/src/app.ts` — mount new routers
- `client/src/App.tsx` — add new routes

---

### Task 1: Shared Types — Group & Expense

**Files:**
- Create: `shared/src/types/group.ts`
- Create: `shared/src/types/expense.ts`
- Modify: `shared/src/index.ts`

- [ ] **Step 1: Create `shared/src/types/group.ts`**

```typescript
export interface Group {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  defaultCurrency: string;
  createdById: string;
  createdAt: string;
}

export interface GroupMemberUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: 'ADMIN' | 'MEMBER';
  joinedAt: string;
  user: GroupMemberUser;
}

export interface GroupWithMembers extends Group {
  members: GroupMember[];
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  defaultCurrency?: string;
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string | null;
  defaultCurrency?: string;
}

export interface GroupBalance {
  userId: string;
  name: string;
  avatarUrl: string | null;
  balance: number;
}
```

- [ ] **Step 2: Create `shared/src/types/expense.ts`**

```typescript
export type SplitType = 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
}

export interface ExpenseSplit {
  id: string;
  expenseId: string;
  userId: string;
  amount: number;
  isSettled: boolean;
  settledAt: string | null;
  user?: { id: string; name: string; avatarUrl: string | null };
}

export interface Expense {
  id: string;
  groupId: string;
  paidById: string;
  description: string;
  amount: number;
  currency: string;
  amountBase: number;
  baseCurrency: string;
  categoryId: string | null;
  splitType: SplitType;
  date: string;
  receiptUrl: string | null;
  isRecurring: boolean;
  recurrenceRule: string | null;
  createdAt: string;
  paidBy: { id: string; name: string; avatarUrl: string | null };
  splits: ExpenseSplit[];
  category?: Category | null;
}

export interface SplitInput {
  userId: string;
  amount?: number;
  percentage?: number;
  shares?: number;
}

export interface CreateExpenseRequest {
  groupId: string;
  paidById: string;
  description: string;
  amount: number;
  currency: string;
  categoryId?: string;
  splitType: SplitType;
  date: string;
  receiptUrl?: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
  splits: SplitInput[];
}

export interface UpdateExpenseRequest {
  description?: string;
  amount?: number;
  currency?: string;
  categoryId?: string | null;
  splitType?: SplitType;
  date?: string;
  receiptUrl?: string | null;
  splits?: SplitInput[];
}

export interface ExpensesPage {
  expenses: Expense[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
```

- [ ] **Step 3: Export new types from `shared/src/index.ts`**

Append to the existing file:
```typescript
export * from './types/group';
export * from './types/expense';
```

- [ ] **Step 4: Verify TypeScript compiles in shared**

Run: `cd /Users/romanp/Desktop/split/shared && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
cd /Users/romanp/Desktop/split
git add shared/src/types/group.ts shared/src/types/expense.ts shared/src/index.ts
git commit -m "feat: add shared types for groups and expenses"
```

---

### Task 2: Currency Service

**Files:**
- Create: `server/src/services/currency.service.ts`

The service caches exchange rates in the `CurrencyRate` DB table and refreshes after 24 hours. It uses Node 18+ built-in `fetch` (no axios on server). Prisma compound unique key for `CurrencyRate` is `fromCurrency_toCurrency`.

- [ ] **Step 1: Create `server/src/services/currency.service.ts`**

```typescript
import { prisma } from '../lib/prisma';

const RATE_STALE_MS = 24 * 60 * 60 * 1000;

interface ERApiResponse {
  result: string;
  rates: Record<string, number>;
}

export async function getExchangeRate(from: string, to: string): Promise<number> {
  if (from === to) return 1;

  const cached = await prisma.currencyRate.findUnique({
    where: { fromCurrency_toCurrency: { fromCurrency: from, toCurrency: to } },
  });

  if (cached && Date.now() - cached.fetchedAt.getTime() < RATE_STALE_MS) {
    return Number(cached.rate);
  }

  const res = await fetch(`https://open.er-api.com/v6/latest/${from}`);
  const data = (await res.json()) as ERApiResponse;

  if (data.result !== 'success') throw new Error('CURRENCY_API_ERROR');

  const rate = data.rates[to];
  if (!rate) throw new Error(`UNSUPPORTED_CURRENCY:${to}`);

  await prisma.currencyRate.upsert({
    where: { fromCurrency_toCurrency: { fromCurrency: from, toCurrency: to } },
    update: { rate, fetchedAt: new Date() },
    create: { fromCurrency: from, toCurrency: to, rate },
  });

  return rate;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/romanp/Desktop/split/server && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
cd /Users/romanp/Desktop/split
git add server/src/services/currency.service.ts
git commit -m "feat: add currency service with 24h DB cache"
```

---

### Task 3: Group Service

**Files:**
- Create: `server/src/services/group.service.ts`

Private helpers `requireAdmin` and `requireMember` check `GroupMember` records and throw string error codes. All public functions use these helpers. The `createGroup` function creates the group and simultaneously adds the creator as ADMIN in a Prisma `$transaction`.

- [ ] **Step 1: Create `server/src/services/group.service.ts`**

```typescript
import { prisma } from '../lib/prisma';
import type { Group, GroupMember, Prisma } from '@prisma/client';

interface CreateGroupData {
  name: string;
  description?: string;
  defaultCurrency?: string;
}

interface UpdateGroupData {
  name?: string;
  description?: string | null;
  defaultCurrency?: string;
}

type GroupWithMembers = Group & {
  members: (GroupMember & {
    user: { id: string; name: string; email: string; avatarUrl: string | null };
  })[];
};

function toGroupDTO(group: Group) {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    imageUrl: group.imageUrl,
    defaultCurrency: group.defaultCurrency,
    createdById: group.createdById,
    createdAt: group.createdAt.toISOString(),
  };
}

function toMemberDTO(member: GroupMember & { user: { id: string; name: string; email: string; avatarUrl: string | null } }) {
  return {
    id: member.id,
    groupId: member.groupId,
    userId: member.userId,
    role: member.role as 'ADMIN' | 'MEMBER',
    joinedAt: member.joinedAt.toISOString(),
    user: member.user,
  };
}

async function requireAdmin(groupId: string, userId: string): Promise<void> {
  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!member) throw new Error('NOT_MEMBER');
  if (member.role !== 'ADMIN') throw new Error('FORBIDDEN');
}

async function requireMember(groupId: string, userId: string): Promise<void> {
  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!member) throw new Error('NOT_MEMBER');
}

export async function createGroup(userId: string, data: CreateGroupData) {
  const [group] = await prisma.$transaction([
    prisma.group.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        defaultCurrency: data.defaultCurrency ?? 'USD',
        createdById: userId,
        members: { create: { userId, role: 'ADMIN' } },
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
      },
    }),
  ]);
  return {
    ...toGroupDTO(group),
    members: (group as GroupWithMembers).members.map(toMemberDTO),
  };
}

export async function getGroup(groupId: string, userId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
    },
  });
  if (!group) throw new Error('GROUP_NOT_FOUND');
  const isMember = group.members.some((m) => m.userId === userId);
  if (!isMember) throw new Error('NOT_MEMBER');
  return {
    ...toGroupDTO(group),
    members: (group as GroupWithMembers).members.map(toMemberDTO),
  };
}

export async function listGroups(userId: string) {
  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    include: {
      group: {
        include: {
          members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
        },
      },
    },
    orderBy: { group: { createdAt: 'desc' } },
  });
  return memberships.map((m) => ({
    ...toGroupDTO(m.group),
    members: (m.group as GroupWithMembers).members.map(toMemberDTO),
  }));
}

export async function updateGroup(groupId: string, userId: string, data: UpdateGroupData) {
  await requireAdmin(groupId, userId);
  const group = await prisma.group.update({
    where: { id: groupId },
    data,
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
    },
  });
  return {
    ...toGroupDTO(group),
    members: (group as GroupWithMembers).members.map(toMemberDTO),
  };
}

export async function deleteGroup(groupId: string, userId: string): Promise<void> {
  await requireAdmin(groupId, userId);
  await prisma.group.delete({ where: { id: groupId } });
}

export async function addMember(groupId: string, requesterId: string, email: string) {
  await requireAdmin(groupId, requesterId);
  const target = await prisma.user.findUnique({ where: { email } });
  if (!target) throw new Error('USER_NOT_FOUND');
  const existing = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: target.id } },
  });
  if (existing) throw new Error('ALREADY_MEMBER');
  const member = await prisma.groupMember.create({
    data: { groupId, userId: target.id, role: 'MEMBER' },
    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
  });
  return toMemberDTO(member);
}

export async function removeMember(groupId: string, requesterId: string, targetUserId: string): Promise<void> {
  await requireAdmin(groupId, requesterId);
  await prisma.groupMember.delete({
    where: { groupId_userId: { groupId, userId: targetUserId } },
  });
}

export async function listMembers(groupId: string, userId: string) {
  await requireMember(groupId, userId);
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
  });
  return members.map(toMemberDTO);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/romanp/Desktop/split/server && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
cd /Users/romanp/Desktop/split
git add server/src/services/group.service.ts
git commit -m "feat: add group service with membership management"
```

---

### Task 4: Group Routes

**Files:**
- Create: `server/src/routes/groups.ts`
- Modify: `server/src/app.ts`

All routes use `router.use(requireAuth)`. Error codes map to HTTP statuses: `GROUP_NOT_FOUND` → 404, `NOT_MEMBER` → 403, `FORBIDDEN` → 403, `USER_NOT_FOUND` → 404, `ALREADY_MEMBER` → 409.

- [ ] **Step 1: Create `server/src/routes/groups.ts`**

```typescript
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import {
  createGroup, getGroup, listGroups, updateGroup, deleteGroup,
  addMember, removeMember, listMembers,
} from '../services/group.service';
import { computeGroupBalances } from '../services/balance.service';

const router = Router();
router.use(requireAuth);

const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  defaultCurrency: z.string().length(3).optional(),
});

const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  defaultCurrency: z.string().length(3).optional(),
});

const inviteSchema = z.object({ email: z.string().email() });

function userId(req: Request): string {
  return (req as AuthenticatedRequest).userId;
}

function handleError(res: Response, err: unknown) {
  if (err instanceof Error) {
    const map: Record<string, number> = {
      GROUP_NOT_FOUND: 404, NOT_MEMBER: 403, FORBIDDEN: 403,
      USER_NOT_FOUND: 404, ALREADY_MEMBER: 409,
    };
    const status = map[err.message];
    if (status) {
      res.status(status).json({ error: { code: err.message, message: err.message } });
      return;
    }
  }
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Server error' } });
}

router.get('/', async (req: Request, res: Response) => {
  const groups = await listGroups(userId(req));
  res.json(groups);
});

router.post('/', validate(createGroupSchema), async (req: Request, res: Response) => {
  try {
    const group = await createGroup(userId(req), req.body);
    res.status(201).json(group);
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const group = await getGroup(req.params.id, userId(req));
    res.json(group);
  } catch (err) {
    handleError(res, err);
  }
});

router.put('/:id', validate(updateGroupSchema), async (req: Request, res: Response) => {
  try {
    const group = await updateGroup(req.params.id, userId(req), req.body);
    res.json(group);
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await deleteGroup(req.params.id, userId(req));
    res.status(204).send();
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/:id/members', async (req: Request, res: Response) => {
  try {
    const members = await listMembers(req.params.id, userId(req));
    res.json(members);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/:id/invite', validate(inviteSchema), async (req: Request, res: Response) => {
  try {
    const member = await addMember(req.params.id, userId(req), req.body.email);
    res.status(201).json(member);
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/:id/members/:userId', async (req: Request, res: Response) => {
  try {
    await removeMember(req.params.id, userId(req), req.params.userId);
    res.status(204).send();
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/:id/balances', async (req: Request, res: Response) => {
  try {
    await getGroup(req.params.id, userId(req)); // verify membership
    const balances = await computeGroupBalances(req.params.id);
    res.json(balances);
  } catch (err) {
    handleError(res, err);
  }
});

export default router;
```

- [ ] **Step 2: Mount group router in `server/src/app.ts`**

Add after the existing router imports and mounts:
```typescript
import groupsRouter from './routes/groups';
// ...
app.use('/api/groups', groupsRouter);
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/romanp/Desktop/split/server && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
cd /Users/romanp/Desktop/split
git add server/src/routes/groups.ts server/src/app.ts
git commit -m "feat: add group routes"
```

---

### Task 5: Balance Service

**Files:**
- Create: `server/src/services/balance.service.ts`

Computes per-member balance: positive = owed money, negative = owes money. Uses Prisma aggregate on `ExpenseSplit`. All monetary values are stored as base-currency amounts so no conversion is needed here.

- [ ] **Step 1: Create `server/src/services/balance.service.ts`**

```typescript
import { prisma } from '../lib/prisma';

export async function computeGroupBalances(groupId: string) {
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  });

  return Promise.all(
    members.map(async (m) => {
      const isOwedResult = await prisma.expenseSplit.aggregate({
        where: {
          isSettled: false,
          userId: { not: m.userId },
          expense: { groupId, paidById: m.userId },
        },
        _sum: { amount: true },
      });

      const owesResult = await prisma.expenseSplit.aggregate({
        where: {
          isSettled: false,
          userId: m.userId,
          expense: { groupId, paidById: { not: m.userId } },
        },
        _sum: { amount: true },
      });

      const balance =
        Number(isOwedResult._sum.amount ?? 0) -
        Number(owesResult._sum.amount ?? 0);

      return {
        userId: m.userId,
        name: m.user.name,
        avatarUrl: m.user.avatarUrl,
        balance,
      };
    })
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/romanp/Desktop/split/server && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
cd /Users/romanp/Desktop/split
git add server/src/services/balance.service.ts
git commit -m "feat: add balance service for group member balances"
```

---

### Task 6: Expense Service

**Files:**
- Create: `server/src/services/expense.service.ts`

`calculateSplits` converts `SplitInput[]` → `{ userId, amount }[]` in base currency. The last person in the array absorbs rounding remainders so splits always sum exactly to `totalBase`. `createExpense` calls `getExchangeRate` to convert to base currency, then calls `calculateSplits`, then runs a Prisma `$transaction` to create the expense and all splits atomically.

- [ ] **Step 1: Create `server/src/services/expense.service.ts`**

```typescript
import { prisma } from '../lib/prisma';
import { getExchangeRate } from './currency.service';
import type { Expense as PrismaExpense, ExpenseSplit as PrismaSplit, Category, User, Prisma } from '@prisma/client';

type SplitType = 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES';

interface SplitInput {
  userId: string;
  amount?: number;
  percentage?: number;
  shares?: number;
}

interface CreateExpenseData {
  groupId: string;
  paidById: string;
  description: string;
  amount: number;
  currency: string;
  categoryId?: string;
  splitType: SplitType;
  date: string;
  receiptUrl?: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
  splits: SplitInput[];
}

interface UpdateExpenseData {
  description?: string;
  amount?: number;
  currency?: string;
  categoryId?: string | null;
  splitType?: SplitType;
  date?: string;
  receiptUrl?: string | null;
  splits?: SplitInput[];
}

type ExpenseWithRelations = PrismaExpense & {
  paidBy: { id: string; name: string; avatarUrl: string | null };
  splits: (PrismaSplit & { user: { id: string; name: string; avatarUrl: string | null } })[];
  category: Category | null;
};

function toExpenseDTO(e: ExpenseWithRelations) {
  return {
    id: e.id,
    groupId: e.groupId,
    paidById: e.paidById,
    description: e.description,
    amount: Number(e.amount),
    currency: e.currency,
    amountBase: Number(e.amountBase),
    baseCurrency: e.baseCurrency,
    categoryId: e.categoryId,
    splitType: e.splitType as SplitType,
    date: e.date.toISOString().split('T')[0],
    receiptUrl: e.receiptUrl,
    isRecurring: e.isRecurring,
    recurrenceRule: e.recurrenceRule,
    createdAt: e.createdAt.toISOString(),
    paidBy: e.paidBy,
    splits: e.splits.map((s) => ({
      id: s.id,
      expenseId: s.expenseId,
      userId: s.userId,
      amount: Number(s.amount),
      isSettled: s.isSettled,
      settledAt: s.settledAt?.toISOString() ?? null,
      user: s.user,
    })),
    category: e.category,
  };
}

export function calculateSplits(
  totalBase: number,
  splitType: SplitType,
  inputs: SplitInput[]
): { userId: string; amount: number }[] {
  const cents = Math.round(totalBase * 100);

  if (splitType === 'EQUAL') {
    const perPerson = Math.floor(cents / inputs.length);
    const remainder = cents - perPerson * inputs.length;
    return inputs.map((s, i) => ({
      userId: s.userId,
      amount: (perPerson + (i === inputs.length - 1 ? remainder : 0)) / 100,
    }));
  }

  if (splitType === 'EXACT') {
    return inputs.map((s) => ({ userId: s.userId, amount: s.amount! }));
  }

  if (splitType === 'PERCENTAGE') {
    const allocated = inputs.map((s) => Math.floor((cents * s.percentage!) / 100));
    const remainder = cents - allocated.reduce((a, b) => a + b, 0);
    return inputs.map((s, i) => ({
      userId: s.userId,
      amount: (allocated[i] + (i === inputs.length - 1 ? remainder : 0)) / 100,
    }));
  }

  // SHARES
  const totalShares = inputs.reduce((a, s) => a + (s.shares ?? 1), 0);
  const allocated = inputs.map((s) => Math.floor((cents * (s.shares ?? 1)) / totalShares));
  const remainder = cents - allocated.reduce((a, b) => a + b, 0);
  return inputs.map((s, i) => ({
    userId: s.userId,
    amount: (allocated[i] + (i === inputs.length - 1 ? remainder : 0)) / 100,
  }));
}

async function requireGroupMember(groupId: string, userId: string) {
  const m = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!m) throw new Error('NOT_MEMBER');
}

const expenseInclude = {
  paidBy: { select: { id: true, name: true, avatarUrl: true } },
  splits: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
  category: true,
} satisfies Prisma.ExpenseInclude;

export async function createExpense(requesterId: string, data: CreateExpenseData) {
  await requireGroupMember(data.groupId, requesterId);

  const group = await prisma.group.findUnique({ where: { id: data.groupId } });
  if (!group) throw new Error('GROUP_NOT_FOUND');

  const baseCurrency = group.defaultCurrency;
  const rate = await getExchangeRate(data.currency, baseCurrency);
  const amountBase = Math.round(data.amount * rate * 100) / 100;

  const splits = calculateSplits(amountBase, data.splitType, data.splits);

  const expense = await prisma.$transaction(async (tx) => {
    const e = await tx.expense.create({
      data: {
        groupId: data.groupId,
        paidById: data.paidById,
        description: data.description,
        amount: data.amount,
        currency: data.currency,
        amountBase,
        baseCurrency,
        categoryId: data.categoryId ?? null,
        splitType: data.splitType,
        date: new Date(data.date),
        receiptUrl: data.receiptUrl ?? null,
        isRecurring: data.isRecurring ?? false,
        recurrenceRule: data.recurrenceRule ?? null,
        splits: {
          create: splits.map((s) => ({
            userId: s.userId,
            amount: s.amount,
          })),
        },
      },
      include: expenseInclude,
    });
    return e;
  });

  return toExpenseDTO(expense as ExpenseWithRelations);
}

export async function getExpense(expenseId: string, userId: string) {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: expenseInclude,
  });
  if (!expense) throw new Error('EXPENSE_NOT_FOUND');
  await requireGroupMember(expense.groupId, userId);
  return toExpenseDTO(expense as ExpenseWithRelations);
}

export async function updateExpense(expenseId: string, userId: string, data: UpdateExpenseData) {
  const existing = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!existing) throw new Error('EXPENSE_NOT_FOUND');
  await requireGroupMember(existing.groupId, userId);

  const group = await prisma.group.findUnique({ where: { id: existing.groupId } });
  if (!group) throw new Error('GROUP_NOT_FOUND');

  const newAmount = data.amount ?? Number(existing.amount);
  const newCurrency = data.currency ?? existing.currency;
  const baseCurrency = group.defaultCurrency;
  const rate = await getExchangeRate(newCurrency, baseCurrency);
  const amountBase = Math.round(newAmount * rate * 100) / 100;

  const expense = await prisma.$transaction(async (tx) => {
    if (data.splits) {
      await tx.expenseSplit.deleteMany({ where: { expenseId } });
    }

    const newSplitType = (data.splitType ?? existing.splitType) as SplitType;
    const splits = data.splits ? calculateSplits(amountBase, newSplitType, data.splits) : null;

    const e = await tx.expense.update({
      where: { id: expenseId },
      data: {
        ...(data.description !== undefined && { description: data.description }),
        ...(data.amount !== undefined && { amount: data.amount, amountBase }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.splitType !== undefined && { splitType: data.splitType }),
        ...(data.date !== undefined && { date: new Date(data.date) }),
        ...(data.receiptUrl !== undefined && { receiptUrl: data.receiptUrl }),
        ...(splits && {
          splits: { create: splits.map((s) => ({ userId: s.userId, amount: s.amount })) },
        }),
      },
      include: expenseInclude,
    });
    return e;
  });

  return toExpenseDTO(expense as ExpenseWithRelations);
}

export async function deleteExpense(expenseId: string, userId: string): Promise<void> {
  const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!expense) throw new Error('EXPENSE_NOT_FOUND');

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: expense.groupId, userId } },
  });
  if (!member) throw new Error('NOT_MEMBER');
  if (expense.paidById !== userId && member.role !== 'ADMIN') throw new Error('FORBIDDEN');

  await prisma.expense.delete({ where: { id: expenseId } });
}

export async function listExpenses(
  userId: string,
  groupId: string,
  page: number,
  limit: number
) {
  await requireGroupMember(groupId, userId);

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where: { groupId },
      include: expenseInclude,
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.expense.count({ where: { groupId } }),
  ]);

  return {
    expenses: expenses.map((e) => toExpenseDTO(e as ExpenseWithRelations)),
    total,
    page,
    limit,
    hasMore: page * limit < total,
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/romanp/Desktop/split/server && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
cd /Users/romanp/Desktop/split
git add server/src/services/expense.service.ts
git commit -m "feat: add expense service with 4 split types and currency conversion"
```

---

### Task 7: Expense Routes & Categories Route

**Files:**
- Create: `server/src/routes/expenses.ts`
- Create: `server/src/routes/categories.ts`
- Modify: `server/src/app.ts`

The expenses router validates `groupId` query param for listing. Categories route returns all seeded categories.

- [ ] **Step 1: Create `server/src/routes/expenses.ts`**

```typescript
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import {
  createExpense, getExpense, updateExpense, deleteExpense, listExpenses,
} from '../services/expense.service';

const router = Router();
router.use(requireAuth);

function userId(req: Request): string {
  return (req as AuthenticatedRequest).userId;
}

const splitInputSchema = z.object({
  userId: z.string(),
  amount: z.number().positive().optional(),
  percentage: z.number().positive().optional(),
  shares: z.number().positive().optional(),
});

const createExpenseSchema = z.object({
  groupId: z.string(),
  paidById: z.string(),
  description: z.string().min(1).max(200),
  amount: z.number().positive(),
  currency: z.string().length(3),
  categoryId: z.string().optional(),
  splitType: z.enum(['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  receiptUrl: z.string().url().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceRule: z.string().optional(),
  splits: z.array(splitInputSchema).min(1),
});

const updateExpenseSchema = z.object({
  description: z.string().min(1).max(200).optional(),
  amount: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  categoryId: z.string().nullable().optional(),
  splitType: z.enum(['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES']).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  receiptUrl: z.string().url().nullable().optional(),
  splits: z.array(splitInputSchema).min(1).optional(),
});

function handleError(res: Response, err: unknown) {
  if (err instanceof Error) {
    const map: Record<string, number> = {
      EXPENSE_NOT_FOUND: 404,
      NOT_MEMBER: 403,
      FORBIDDEN: 403,
      GROUP_NOT_FOUND: 404,
      CURRENCY_API_ERROR: 502,
    };
    const status = map[err.message];
    if (status) {
      res.status(status).json({ error: { code: err.message, message: err.message } });
      return;
    }
    if (err.message.startsWith('UNSUPPORTED_CURRENCY:')) {
      res.status(400).json({ error: { code: 'UNSUPPORTED_CURRENCY', message: err.message } });
      return;
    }
  }
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Server error' } });
}

router.get('/', async (req: Request, res: Response) => {
  const parsed = z.object({
    groupId: z.string(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }).safeParse(req.query);

  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'groupId is required' } });
    return;
  }

  try {
    const result = await listExpenses(userId(req), parsed.data.groupId, parsed.data.page, parsed.data.limit);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/', validate(createExpenseSchema), async (req: Request, res: Response) => {
  try {
    const expense = await createExpense(userId(req), req.body);
    res.status(201).json(expense);
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const expense = await getExpense(req.params.id, userId(req));
    res.json(expense);
  } catch (err) {
    handleError(res, err);
  }
});

router.put('/:id', validate(updateExpenseSchema), async (req: Request, res: Response) => {
  try {
    const expense = await updateExpense(req.params.id, userId(req), req.body);
    res.json(expense);
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await deleteExpense(req.params.id, userId(req));
    res.status(204).send();
  } catch (err) {
    handleError(res, err);
  }
});

export default router;
```

- [ ] **Step 2: Create `server/src/routes/categories.ts`**

```typescript
import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  res.json(categories);
});

export default router;
```

- [ ] **Step 3: Mount new routers in `server/src/app.ts`**

Add imports and mounts:
```typescript
import expensesRouter from './routes/expenses';
import categoriesRouter from './routes/categories';
// ...
app.use('/api/expenses', expensesRouter);
app.use('/api/categories', categoriesRouter);
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd /Users/romanp/Desktop/split/server && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
cd /Users/romanp/Desktop/split
git add server/src/routes/expenses.ts server/src/routes/categories.ts server/src/app.ts
git commit -m "feat: add expense and category routes"
```

---

### Task 8: Receipt Upload Route (Cloudinary)

**Files:**
- Create: `server/src/routes/uploads.ts`
- Modify: `server/src/config.ts`
- Modify: `server/src/app.ts`

Cloudinary vars are optional — if not configured the endpoint returns 503. Uses `multer` for multipart parsing and `cloudinary` v2 SDK. Install both packages first.

- [ ] **Step 1: Install packages**

Run: `cd /Users/romanp/Desktop/split/server && npm install multer cloudinary && npm install --save-dev @types/multer`
Expected: packages added without errors

- [ ] **Step 2: Add optional Cloudinary vars to `server/src/config.ts`**

In the Zod schema object, add after the existing `NODE_ENV` line:
```typescript
CLOUDINARY_CLOUD_NAME: z.string().optional(),
CLOUDINARY_API_KEY: z.string().optional(),
CLOUDINARY_API_SECRET: z.string().optional(),
```

- [ ] **Step 3: Create `server/src/routes/uploads.ts`**

```typescript
import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { requireAuth } from '../middleware/auth';
import { config } from '../config';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function isCloudinaryConfigured(): boolean {
  return !!(config.CLOUDINARY_CLOUD_NAME && config.CLOUDINARY_API_KEY && config.CLOUDINARY_API_SECRET);
}

router.post('/receipt', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
  if (!isCloudinaryConfigured()) {
    res.status(503).json({ error: { code: 'UPLOAD_NOT_CONFIGURED', message: 'Receipt upload not configured' } });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: { code: 'NO_FILE', message: 'No file provided' } });
    return;
  }

  cloudinary.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET,
  });

  try {
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'split/receipts', resource_type: 'image' },
        (error, result) => {
          if (error || !result) reject(error ?? new Error('Upload failed'));
          else resolve(result as { secure_url: string });
        }
      );
      stream.end(req.file!.buffer);
    });

    res.json({ url: result.secure_url });
  } catch {
    res.status(500).json({ error: { code: 'UPLOAD_FAILED', message: 'Upload failed' } });
  }
});

export default router;
```

- [ ] **Step 4: Mount uploads router in `server/src/app.ts`**

```typescript
import uploadsRouter from './routes/uploads';
// ...
app.use('/api/uploads', uploadsRouter);
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd /Users/romanp/Desktop/split/server && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
cd /Users/romanp/Desktop/split
git add server/src/routes/uploads.ts server/src/config.ts server/src/app.ts server/package.json server/package-lock.json
git commit -m "feat: add receipt upload route via Cloudinary"
```

---

### Task 9: Client — Group Hooks

**Files:**
- Create: `client/src/hooks/useGroups.ts`

Uses React Query v5 (`useQuery`, `useMutation`, `useQueryClient`). All API calls go through the `api` axios instance from `client/src/lib/api.ts`. Types are imported from `@split/shared`.

- [ ] **Step 1: Create `client/src/hooks/useGroups.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type {
  GroupWithMembers, GroupMember, GroupBalance,
  CreateGroupRequest, UpdateGroupRequest,
} from '@split/shared';

export function useGroups() {
  return useQuery<GroupWithMembers[]>({
    queryKey: ['groups'],
    queryFn: async () => {
      const { data } = await api.get('/groups');
      return data;
    },
  });
}

export function useGroup(groupId: string) {
  return useQuery<GroupWithMembers>({
    queryKey: ['groups', groupId],
    queryFn: async () => {
      const { data } = await api.get(`/groups/${groupId}`);
      return data;
    },
    enabled: !!groupId,
  });
}

export function useGroupBalances(groupId: string) {
  return useQuery<GroupBalance[]>({
    queryKey: ['groups', groupId, 'balances'],
    queryFn: async () => {
      const { data } = await api.get(`/groups/${groupId}/balances`);
      return data;
    },
    enabled: !!groupId,
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation<GroupWithMembers, Error, CreateGroupRequest>({
    mutationFn: async (body) => {
      const { data } = await api.post('/groups', body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export function useUpdateGroup(groupId: string) {
  const qc = useQueryClient();
  return useMutation<GroupWithMembers, Error, UpdateGroupRequest>({
    mutationFn: async (body) => {
      const { data } = await api.put(`/groups/${groupId}`, body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      qc.invalidateQueries({ queryKey: ['groups', groupId] });
    },
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (groupId) => {
      await api.delete(`/groups/${groupId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export function useInviteMember(groupId: string) {
  const qc = useQueryClient();
  return useMutation<GroupMember, Error, { email: string }>({
    mutationFn: async (body) => {
      const { data } = await api.post(`/groups/${groupId}/invite`, body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups', groupId] }),
  });
}

export function useRemoveMember(groupId: string) {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (memberId) => {
      await api.delete(`/groups/${groupId}/members/${memberId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups', groupId] }),
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles in client**

Run: `cd /Users/romanp/Desktop/split/client && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
cd /Users/romanp/Desktop/split
git add client/src/hooks/useGroups.ts
git commit -m "feat: add group React Query hooks"
```

---

### Task 10: Client — Expense Hooks

**Files:**
- Create: `client/src/hooks/useExpenses.ts`

- [ ] **Step 1: Create `client/src/hooks/useExpenses.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type {
  Expense, ExpensesPage, Category,
  CreateExpenseRequest, UpdateExpenseRequest,
} from '@split/shared';

export function useExpenses(groupId: string, page = 1, limit = 20) {
  return useQuery<ExpensesPage>({
    queryKey: ['expenses', groupId, page, limit],
    queryFn: async () => {
      const { data } = await api.get('/expenses', { params: { groupId, page, limit } });
      return data;
    },
    enabled: !!groupId,
  });
}

export function useExpense(expenseId: string) {
  return useQuery<Expense>({
    queryKey: ['expenses', expenseId],
    queryFn: async () => {
      const { data } = await api.get(`/expenses/${expenseId}`);
      return data;
    },
    enabled: !!expenseId,
  });
}

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get('/categories');
      return data;
    },
    staleTime: Infinity,
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation<Expense, Error, CreateExpenseRequest>({
    mutationFn: async (body) => {
      const { data } = await api.post('/expenses', body);
      return data;
    },
    onSuccess: (expense) => {
      qc.invalidateQueries({ queryKey: ['expenses', expense.groupId] });
      qc.invalidateQueries({ queryKey: ['groups', expense.groupId, 'balances'] });
    },
  });
}

export function useUpdateExpense(expenseId: string) {
  const qc = useQueryClient();
  return useMutation<Expense, Error, UpdateExpenseRequest>({
    mutationFn: async (body) => {
      const { data } = await api.put(`/expenses/${expenseId}`, body);
      return data;
    },
    onSuccess: (expense) => {
      qc.invalidateQueries({ queryKey: ['expenses', expense.groupId] });
      qc.invalidateQueries({ queryKey: ['expenses', expenseId] });
      qc.invalidateQueries({ queryKey: ['groups', expense.groupId, 'balances'] });
    },
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation<void, Error, { expenseId: string; groupId: string }>({
    mutationFn: async ({ expenseId }) => {
      await api.delete(`/expenses/${expenseId}`);
    },
    onSuccess: (_, { groupId }) => {
      qc.invalidateQueries({ queryKey: ['expenses', groupId] });
      qc.invalidateQueries({ queryKey: ['groups', groupId, 'balances'] });
    },
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/romanp/Desktop/split/client && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
cd /Users/romanp/Desktop/split
git add client/src/hooks/useExpenses.ts
git commit -m "feat: add expense React Query hooks"
```

---

### Task 11: Client — Groups Pages

**Files:**
- Create: `client/src/components/GroupCard.tsx`
- Create: `client/src/pages/GroupsPage.tsx`
- Modify: `client/src/App.tsx`

`GroupsPage` shows a grid of `GroupCard`s and a "New Group" button that opens an inline modal. Use shadcn/ui Dialog for the create modal, Input, Button, and Label components.

- [ ] **Step 1: Create `client/src/components/GroupCard.tsx`**

```tsx
import { Link } from 'react-router-dom';
import type { GroupWithMembers } from '@split/shared';

interface Props {
  group: GroupWithMembers;
}

export function GroupCard({ group }: Props) {
  return (
    <Link
      to={`/groups/${group.id}`}
      className="block rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-3 mb-3">
        {group.imageUrl ? (
          <img src={group.imageUrl} alt={group.name} className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-lg">
            {group.name[0].toUpperCase()}
          </div>
        )}
        <div>
          <h3 className="font-semibold text-card-foreground">{group.name}</h3>
          <p className="text-xs text-muted-foreground">{group.members.length} members · {group.defaultCurrency}</p>
        </div>
      </div>
      {group.description && (
        <p className="text-sm text-muted-foreground line-clamp-2">{group.description}</p>
      )}
    </Link>
  );
}
```

- [ ] **Step 2: Create `client/src/pages/GroupsPage.tsx`**

```tsx
import { useState } from 'react';
import { useGroups, useCreateGroup } from '../hooks/useGroups';
import { GroupCard } from '../components/GroupCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../components/ui/dialog';

export function GroupsPage() {
  const { data: groups, isLoading } = useGroups();
  const createGroup = useCreateGroup();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [error, setError] = useState('');

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await createGroup.mutateAsync({ name, description: description || undefined, defaultCurrency: currency });
      setOpen(false);
      setName('');
      setDescription('');
      setCurrency('USD');
    } catch {
      setError('Failed to create group. Please try again.');
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Groups</h1>
        <Button onClick={() => setOpen(true)}>New Group</Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading groups…</div>
      ) : groups?.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="mb-4">No groups yet. Create one to start splitting expenses.</p>
          <Button onClick={() => setOpen(true)}>Create your first group</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups?.map((group) => <GroupCard key={group.id} group={group} />)}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Group</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="description">Description (optional)</Label>
              <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="currency">Default Currency</Label>
              <Input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createGroup.isPending}>
                {createGroup.isPending ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 3: Add `/groups` route to `client/src/App.tsx`**

Import `GroupsPage` and add a route inside the authenticated layout:
```tsx
import { GroupsPage } from './pages/GroupsPage';
// Inside <Route element={<AppLayout />}>:
<Route path="groups" element={<GroupsPage />} />
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd /Users/romanp/Desktop/split/client && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
cd /Users/romanp/Desktop/split
git add client/src/components/GroupCard.tsx client/src/pages/GroupsPage.tsx client/src/App.tsx
git commit -m "feat: add groups list page with create modal"
```

---

### Task 12: Client — Group Detail Page

**Files:**
- Create: `client/src/pages/GroupDetailPage.tsx`
- Modify: `client/src/App.tsx`

The group detail page has three tabs: Expenses (list with "Add Expense" button), Members (list with invite/remove), Balances (bar list). Uses shadcn/ui Tabs. The "Add Expense" button links to `/expenses/new?groupId=<id>`.

- [ ] **Step 1: Create `client/src/pages/GroupDetailPage.tsx`**

```tsx
import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useGroup, useGroupBalances, useInviteMember, useRemoveMember } from '../hooks/useGroups';
import { useExpenses } from '../hooks/useExpenses';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';

function formatBalance(balance: number, currency: string) {
  const abs = Math.abs(balance).toFixed(2);
  if (balance > 0) return `+${abs} ${currency}`;
  if (balance < 0) return `-${abs} ${currency}`;
  return `0 ${currency}`;
}

export function GroupDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { data: group, isLoading } = useGroup(id);
  const { data: balances } = useGroupBalances(id);
  const { data: expensesPage } = useExpenses(id);
  const inviteMember = useInviteMember(id);
  const removeMember = useRemoveMember(id);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const navigate = useNavigate();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError('');
    try {
      await inviteMember.mutateAsync({ email: inviteEmail });
      setInviteOpen(false);
      setInviteEmail('');
    } catch {
      setInviteError('Could not invite member. Check the email and try again.');
    }
  }

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading…</div>;
  if (!group) return <div className="p-6 text-destructive">Group not found.</div>;

  const isAdmin = group.members.find((m) => m.userId === currentUserId)?.role === 'ADMIN';

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
          {group.name[0].toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{group.name}</h1>
          {group.description && <p className="text-muted-foreground text-sm">{group.description}</p>}
        </div>
      </div>

      <Tabs defaultValue="expenses">
        <TabsList className="mb-4">
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="balances">Balances</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses">
          <div className="flex justify-end mb-4">
            <Button asChild>
              <Link to={`/expenses/new?groupId=${id}`}>Add Expense</Link>
            </Button>
          </div>
          {expensesPage?.expenses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No expenses yet.</p>
          ) : (
            <div className="space-y-2">
              {expensesPage?.expenses.map((expense) => (
                <Link
                  key={expense.id}
                  to={`/expenses/${expense.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-medium">{expense.description}</p>
                    <p className="text-sm text-muted-foreground">
                      Paid by {expense.paidBy.name} · {expense.date}
                    </p>
                  </div>
                  <span className="font-semibold">
                    {expense.amount.toFixed(2)} {expense.currency}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="members">
          {isAdmin && (
            <div className="flex justify-end mb-4">
              <Button onClick={() => setInviteOpen(true)}>Invite Member</Button>
            </div>
          )}
          <div className="space-y-2">
            {group.members.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  {m.user.avatarUrl ? (
                    <img src={m.user.avatarUrl} alt={m.user.name} className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                      {m.user.name[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-sm">{m.user.name}</p>
                    <p className="text-xs text-muted-foreground">{m.role}</p>
                  </div>
                </div>
                {isAdmin && m.userId !== currentUserId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMember.mutate(m.userId)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>Invite Member</DialogTitle></DialogHeader>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>
                {inviteError && <p className="text-sm text-destructive">{inviteError}</p>}
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={inviteMember.isPending}>
                    {inviteMember.isPending ? 'Inviting…' : 'Invite'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="balances">
          {balances?.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No balances.</p>
          ) : (
            <div className="space-y-2">
              {balances?.map((b) => (
                <div key={b.userId} className="flex items-center justify-between p-3 rounded-lg border">
                  <p className="font-medium">{b.name}</p>
                  <span className={`font-semibold ${b.balance > 0 ? 'text-green-600' : b.balance < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                    {formatBalance(b.balance, group.defaultCurrency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 2: Add `/groups/:id` route to `client/src/App.tsx`**

```tsx
import { GroupDetailPage } from './pages/GroupDetailPage';
// Inside <Route element={<AppLayout />}>:
<Route path="groups/:id" element={<GroupDetailPage />} />
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/romanp/Desktop/split/client && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
cd /Users/romanp/Desktop/split
git add client/src/pages/GroupDetailPage.tsx client/src/App.tsx
git commit -m "feat: add group detail page with expenses, members, and balances tabs"
```

---

### Task 13: Client — Expense Form & Detail Pages

**Files:**
- Create: `client/src/components/expense/SplitEditor.tsx`
- Create: `client/src/pages/expenses/ExpenseFormPage.tsx`
- Create: `client/src/pages/expenses/ExpenseDetailPage.tsx`
- Modify: `client/src/App.tsx`

`SplitEditor` renders different input controls based on `splitType`. `ExpenseFormPage` reads `?groupId=` from the URL for creation, or `expenseId` from params for editing. On success it navigates back to the group detail page.

- [ ] **Step 1: Create `client/src/components/expense/SplitEditor.tsx`**

```tsx
import type { SplitType, SplitInput } from '@split/shared';
import type { GroupMember } from '@split/shared';
import { Input } from '../ui/input';

interface Props {
  splitType: SplitType;
  members: GroupMember[];
  splits: SplitInput[];
  onChange: (splits: SplitInput[]) => void;
}

export function SplitEditor({ splitType, members, splits, onChange }: Props) {
  function updateSplit(userId: string, patch: Partial<SplitInput>) {
    onChange(splits.map((s) => (s.userId === userId ? { ...s, ...patch } : s)));
  }

  if (splitType === 'EQUAL') {
    return (
      <p className="text-sm text-muted-foreground">Split equally among {members.length} members.</p>
    );
  }

  return (
    <div className="space-y-2">
      {splits.map((split) => {
        const member = members.find((m) => m.userId === split.userId);
        return (
          <div key={split.userId} className="flex items-center gap-3">
            <span className="w-28 text-sm truncate">{member?.user.name ?? split.userId}</span>
            {splitType === 'EXACT' && (
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Amount"
                value={split.amount ?? ''}
                onChange={(e) => updateSplit(split.userId, { amount: parseFloat(e.target.value) || 0 })}
                className="w-28"
              />
            )}
            {splitType === 'PERCENTAGE' && (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="%"
                  value={split.percentage ?? ''}
                  onChange={(e) => updateSplit(split.userId, { percentage: parseFloat(e.target.value) || 0 })}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            )}
            {splitType === 'SHARES' && (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Shares"
                  value={split.shares ?? ''}
                  onChange={(e) => updateSplit(split.userId, { shares: parseInt(e.target.value) || 1 })}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">shares</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Create `client/src/pages/expenses/ExpenseFormPage.tsx`**

```tsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useGroup } from '../../hooks/useGroups';
import { useCreateExpense, useUpdateExpense, useExpense, useCategories } from '../../hooks/useExpenses';
import { useAuthStore } from '../../store/authStore';
import { SplitEditor } from '../../components/expense/SplitEditor';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import type { SplitType, SplitInput } from '@split/shared';

const SPLIT_TYPES: SplitType[] = ['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES'];

export function ExpenseFormPage() {
  const { id: expenseId } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const groupId = searchParams.get('groupId') ?? '';

  const { data: existingExpense } = useExpense(expenseId ?? '');
  const resolvedGroupId = existingExpense?.groupId ?? groupId;

  const { data: group } = useGroup(resolvedGroupId);
  const { data: categories } = useCategories();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense(expenseId ?? '');
  const currentUser = useAuthStore((s) => s.user);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [categoryId, setCategoryId] = useState('');
  const [splitType, setSplitType] = useState<SplitType>('EQUAL');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidById, setPaidById] = useState('');
  const [splits, setSplits] = useState<SplitInput[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (group && !paidById) {
      setPaidById(currentUser?.id ?? '');
      setSplits(group.members.map((m) => ({ userId: m.userId, amount: 0, percentage: 0, shares: 1 })));
      setCurrency(group.defaultCurrency);
    }
  }, [group, currentUser, paidById]);

  useEffect(() => {
    if (existingExpense) {
      setDescription(existingExpense.description);
      setAmount(String(existingExpense.amount));
      setCurrency(existingExpense.currency);
      setCategoryId(existingExpense.categoryId ?? '');
      setSplitType(existingExpense.splitType);
      setDate(existingExpense.date);
      setPaidById(existingExpense.paidById);
      setSplits(existingExpense.splits.map((s) => ({
        userId: s.userId,
        amount: s.amount,
        percentage: 0,
        shares: 1,
      })));
    }
  }, [existingExpense]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      if (expenseId && existingExpense) {
        await updateExpense.mutateAsync({ description, amount: parseFloat(amount), currency, categoryId: categoryId || null, splitType, date, splits });
        navigate(`/groups/${existingExpense.groupId}`);
      } else {
        const expense = await createExpense.mutateAsync({
          groupId: resolvedGroupId,
          paidById,
          description,
          amount: parseFloat(amount),
          currency,
          categoryId: categoryId || undefined,
          splitType,
          date,
          splits,
        });
        navigate(`/groups/${expense.groupId}`);
      }
    } catch {
      setError('Failed to save expense. Please try again.');
    }
  }

  if (!group) return <div className="p-6 text-muted-foreground">Loading…</div>;

  const isPending = createExpense.isPending || updateExpense.isPending;

  return (
    <div className="max-w-lg mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">{expenseId ? 'Edit Expense' : 'Add Expense'}</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1">
          <Label htmlFor="description">Description</Label>
          <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} required />
        </div>

        <div className="flex gap-3">
          <div className="space-y-1 flex-1">
            <Label htmlFor="amount">Amount</Label>
            <Input id="amount" type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div className="space-y-1 w-24">
            <Label htmlFor="currency">Currency</Label>
            <Input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>

        <div className="space-y-1">
          <Label htmlFor="paidBy">Paid by</Label>
          <select
            id="paidBy"
            value={paidById}
            onChange={(e) => setPaidById(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {group.members.map((m) => (
              <option key={m.userId} value={m.userId}>{m.user.name}</option>
            ))}
          </select>
        </div>

        {categories && categories.length > 0 && (
          <div className="space-y-1">
            <Label htmlFor="category">Category (optional)</Label>
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">None</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-2">
          <Label>Split Type</Label>
          <div className="flex gap-2 flex-wrap">
            {SPLIT_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSplitType(t)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${splitType === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-input hover:bg-muted'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Split Details</Label>
          <SplitEditor
            splitType={splitType}
            members={group.members}
            splits={splits}
            onChange={setSplits}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={isPending} className="flex-1">
            {isPending ? 'Saving…' : (expenseId ? 'Save Changes' : 'Add Expense')}
          </Button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Create `client/src/pages/expenses/ExpenseDetailPage.tsx`**

```tsx
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useExpense, useDeleteExpense } from '../../hooks/useExpenses';
import { useAuthStore } from '../../store/authStore';
import { useGroup } from '../../hooks/useGroups';
import { Button } from '../../components/ui/button';

export function ExpenseDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: expense, isLoading } = useExpense(id);
  const { data: group } = useGroup(expense?.groupId ?? '');
  const deleteExpense = useDeleteExpense();
  const currentUserId = useAuthStore((s) => s.user?.id);

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading…</div>;
  if (!expense) return <div className="p-6 text-destructive">Expense not found.</div>;

  const isAdmin = group?.members.find((m) => m.userId === currentUserId)?.role === 'ADMIN';
  const canEdit = expense.paidById === currentUserId || isAdmin;

  async function handleDelete() {
    if (!confirm('Delete this expense?')) return;
    await deleteExpense.mutateAsync({ expenseId: expense!.id, groupId: expense!.groupId });
    navigate(`/groups/${expense!.groupId}`);
  }

  return (
    <div className="max-w-lg mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{expense.description}</h1>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/expenses/${id}/edit`}>Edit</Link>
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleteExpense.isPending}>
              Delete
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-4 rounded-xl border p-5">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Amount</span>
          <span className="font-semibold">{expense.amount.toFixed(2)} {expense.currency}</span>
        </div>
        {expense.currency !== expense.baseCurrency && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Base Amount</span>
            <span>{expense.amountBase.toFixed(2)} {expense.baseCurrency}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Paid by</span>
          <span>{expense.paidBy.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Date</span>
          <span>{expense.date}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Split type</span>
          <span>{expense.splitType}</span>
        </div>
        {expense.category && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Category</span>
            <span>{expense.category.icon} {expense.category.name}</span>
          </div>
        )}
      </div>

      <div className="mt-6">
        <h2 className="font-semibold mb-3">Splits</h2>
        <div className="space-y-2">
          {expense.splits.map((split) => (
            <div key={split.id} className="flex justify-between items-center p-3 rounded-lg border">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{split.user?.name ?? split.userId}</span>
                {split.isSettled && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Settled</span>
                )}
              </div>
              <span className="text-sm font-semibold">{split.amount.toFixed(2)} {expense.baseCurrency}</span>
            </div>
          ))}
        </div>
      </div>

      {expense.receiptUrl && (
        <div className="mt-6">
          <h2 className="font-semibold mb-3">Receipt</h2>
          <img src={expense.receiptUrl} alt="Receipt" className="rounded-lg border max-w-full" />
        </div>
      )}

      <div className="mt-6">
        <Button variant="outline" asChild>
          <Link to={`/groups/${expense.groupId}`}>← Back to Group</Link>
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add expense routes to `client/src/App.tsx`**

```tsx
import { ExpenseFormPage } from './pages/expenses/ExpenseFormPage';
import { ExpenseDetailPage } from './pages/expenses/ExpenseDetailPage';
// Inside <Route element={<AppLayout />}>:
<Route path="expenses/new" element={<ExpenseFormPage />} />
<Route path="expenses/:id" element={<ExpenseDetailPage />} />
<Route path="expenses/:id/edit" element={<ExpenseFormPage />} />
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd /Users/romanp/Desktop/split/client && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Start the dev server and smoke test**

Run: `cd /Users/romanp/Desktop/split && npm run dev` (or the equivalent command in the root package.json)

Navigate to `/groups` — groups list should render. Create a group, click into it, add an expense, verify splits appear.

- [ ] **Step 7: Commit**

```bash
cd /Users/romanp/Desktop/split
git add client/src/components/expense/SplitEditor.tsx \
        client/src/pages/expenses/ExpenseFormPage.tsx \
        client/src/pages/expenses/ExpenseDetailPage.tsx \
        client/src/App.tsx
git commit -m "feat: add expense form and detail pages with split editor"
```

---

## Summary

After all 13 tasks complete, the app has:
- Full group CRUD with member invite/remove
- Expenses with EQUAL / EXACT / PERCENTAGE / SHARES splits (correct last-person rounding)
- Multi-currency: amounts stored in group's base currency using live exchange rates (24h cached)
- Balance computation per group member
- Optional receipt upload via Cloudinary
- Client pages: groups grid, group detail (expenses / members / balances tabs), expense form (with split editor), expense detail
