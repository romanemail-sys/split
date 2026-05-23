import { prisma } from '../lib/prisma';

export async function getDashboard(userId: string) {
  const [groupCount, expenseCount, totalOwedResult, totalIOweResult, recentExpenses] = await Promise.all([
    prisma.groupMember.count({ where: { userId } }),
    prisma.expense.count({ where: { group: { members: { some: { userId } } } } }),
    prisma.expenseSplit.aggregate({
      where: { isSettled: false, userId: { not: userId }, expense: { paidById: userId } },
      _sum: { amount: true },
    }),
    prisma.expenseSplit.aggregate({
      where: { isSettled: false, userId, expense: { paidById: { not: userId } } },
      _sum: { amount: true },
    }),
    prisma.expense.findMany({
      where: { group: { members: { some: { userId } } } },
      include: {
        paidBy: { select: { id: true, name: true } },
        group: { select: { id: true, name: true, defaultCurrency: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
  ]);

  return {
    groupCount,
    expenseCount,
    totalOwed: Math.round(Number(totalOwedResult._sum.amount ?? 0) * 100) / 100,
    totalIOwe: Math.round(Number(totalIOweResult._sum.amount ?? 0) * 100) / 100,
    recentExpenses: recentExpenses.map((e) => ({
      id: e.id,
      description: e.description,
      amount: Number(e.amountBase),
      currency: e.baseCurrency,
      date: e.date.toISOString().split('T')[0],
      paidByName: e.paidBy.name,
      paidById: e.paidById,
      groupId: e.group.id,
      groupName: e.group.name,
      isMyExpense: e.paidById === userId,
    })),
  };
}

export async function getAnalytics(userId: string) {
  const expenses = await prisma.expense.findMany({
    where: { group: { members: { some: { userId } } } },
    include: {
      category: { select: { name: true, icon: true } },
      splits: { where: { userId }, select: { amount: true } },
    },
    orderBy: { date: 'desc' },
    take: 500,
  });

  // Monthly spending = my share per month (last 6 months)
  const byMonth = new Map<string, number>();
  // Category breakdown = my share per category
  const byCat = new Map<string, { name: string; icon: string; amount: number; count: number }>();

  for (const e of expenses) {
    const myShare = e.splits[0] ? Math.round(Number(e.splits[0].amount) * 100) / 100 : 0;
    if (myShare <= 0) continue;

    const month = e.date.toISOString().substring(0, 7);
    byMonth.set(month, (byMonth.get(month) ?? 0) + myShare);

    const key = e.categoryId ?? '__none';
    const name = e.category?.name ?? 'Other';
    const icon = e.category?.icon ?? '📋';
    const prev = byCat.get(key) ?? { name, icon, amount: 0, count: 0 };
    byCat.set(key, { name, icon, amount: prev.amount + myShare, count: prev.count + 1 });
  }

  const sortedMonths = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, amount]) => ({ month, amount: Math.round(amount * 100) / 100 }));

  const sortedCategories = [...byCat.values()]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8)
    .map((c) => ({ ...c, amount: Math.round(c.amount * 100) / 100 }));

  const topExpenses = expenses
    .filter((e) => (e.splits[0] ? Number(e.splits[0].amount) : 0) > 0)
    .slice(0, 5)
    .map((e) => ({
      id: e.id,
      description: e.description,
      amount: Math.round(Number(e.splits[0]?.amount ?? 0) * 100) / 100,
      currency: e.baseCurrency,
      date: e.date.toISOString().split('T')[0],
    }));

  const totalSpent = sortedCategories.reduce((s, c) => s + c.amount, 0);

  return { byMonth: sortedMonths, byCategory: sortedCategories, topExpenses, totalSpent };
}
