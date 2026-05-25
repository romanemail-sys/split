import { prisma } from '../lib/prisma';
import { getExchangeRate } from './currency.service';
import type { Expense as PrismaExpense, ExpenseSplit as PrismaSplit, Category, Prisma } from '@prisma/client';

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

type SplitWithUser = PrismaSplit & {
  user: { id: string; name: string; avatarUrl: string | null };
};

type ExpenseWithRelations = PrismaExpense & {
  paidBy: { id: string; name: string; avatarUrl: string | null };
  splits: SplitWithUser[];
  category: Category | null;
  group?: { id: string; name: string } | null;
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
    group: e.group ?? undefined,
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
  group: { select: { id: true, name: true } },
} satisfies Prisma.ExpenseInclude;

export async function createExpense(requesterId: string, data: CreateExpenseData) {
  await requireGroupMember(data.groupId, requesterId);

  const group = await prisma.group.findUnique({ where: { id: data.groupId } });
  if (!group) throw new Error('GROUP_NOT_FOUND');

  const baseCurrency = group.defaultCurrency;
  const rate = await getExchangeRate(data.currency, baseCurrency);
  const amountBase = Math.round(data.amount * rate * 100) / 100;

  // For EXACT splits the user enters amounts in the expense currency — convert to base currency
  const splitsInput = data.splitType === 'EXACT'
    ? data.splits.map((s) => ({ ...s, amount: Math.round((s.amount! * rate) * 100) / 100 }))
    : data.splits;

  const splits = calculateSplits(amountBase, data.splitType, splitsInput);

  const expense = await prisma.$transaction(async (tx) => {
    return tx.expense.create({
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
          create: splits.map((s) => ({ userId: s.userId, amount: s.amount })),
        },
      },
      include: expenseInclude,
    });
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
    const splitsInput = data.splits && newSplitType === 'EXACT'
      ? data.splits.map((s) => ({ ...s, amount: Math.round((s.amount! * rate) * 100) / 100 }))
      : data.splits;
    const splits = splitsInput ? calculateSplits(amountBase, newSplitType, splitsInput) : null;

    return tx.expense.update({
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
  });

  return toExpenseDTO(expense as ExpenseWithRelations);
}

export async function settleSplit(expenseId: string, splitId: string, requesterId: string) {
  const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!expense) throw new Error('EXPENSE_NOT_FOUND');

  const split = await prisma.expenseSplit.findUnique({ where: { id: splitId } });
  if (!split || split.expenseId !== expenseId) throw new Error('EXPENSE_NOT_FOUND');

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: expense.groupId, userId: requesterId } },
  });
  if (!member) throw new Error('NOT_MEMBER');

  const canSettle = split.userId === requesterId || expense.paidById === requesterId || member.role === 'ADMIN';
  if (!canSettle) throw new Error('FORBIDDEN');

  const updated = await prisma.expenseSplit.update({
    where: { id: splitId },
    data: { isSettled: true, settledAt: new Date() },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  });

  return {
    id: updated.id,
    expenseId: updated.expenseId,
    groupId: expense.groupId,
    userId: updated.userId,
    amount: Number(updated.amount),
    isSettled: updated.isSettled,
    settledAt: updated.settledAt?.toISOString() ?? null,
    user: updated.user,
  };
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

export async function listAllExpenses(userId: string, page: number, limit: number) {
  const memberships = await prisma.groupMember.findMany({ where: { userId } });
  const groupIds = memberships.map((m) => m.groupId);

  if (groupIds.length === 0) return { expenses: [], total: 0, page, limit, hasMore: false };

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where: { groupId: { in: groupIds } },
      include: expenseInclude,
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.expense.count({ where: { groupId: { in: groupIds } } }),
  ]);

  return {
    expenses: expenses.map((e) => toExpenseDTO(e as ExpenseWithRelations)),
    total,
    page,
    limit,
    hasMore: page * limit < total,
  };
}
