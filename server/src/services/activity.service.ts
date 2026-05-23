import { prisma } from '../lib/prisma';

interface ActivityItem {
  type: 'EXPENSE_CREATED' | 'SPLIT_SETTLED' | 'MEMBER_JOINED';
  id: string;
  date: string;
  actorName: string;
  actorId: string;
  description: string;
  amount?: number;
  currency?: string;
  expenseId?: string;
  targetName?: string;
  groupId?: string;
  groupName?: string;
}

export async function getGroupActivity(groupId: string): Promise<ActivityItem[]> {
  const [expenses, settledSplits, memberships] = await Promise.all([
    prisma.expense.findMany({
      where: { groupId },
      include: {
        paidBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.expenseSplit.findMany({
      where: { isSettled: true, settledAt: { not: null }, expense: { groupId } },
      include: {
        user: { select: { id: true, name: true } },
        expense: { select: { id: true, description: true, baseCurrency: true } },
      },
      orderBy: { settledAt: 'desc' },
      take: 100,
    }),
    prisma.groupMember.findMany({
      where: { groupId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { joinedAt: 'desc' },
    }),
  ]);

  const items: ActivityItem[] = [];

  for (const e of expenses) {
    items.push({
      type: 'EXPENSE_CREATED',
      id: `expense-${e.id}`,
      date: e.createdAt.toISOString(),
      actorId: e.paidById,
      actorName: e.paidBy.name,
      description: e.description,
      amount: Number(e.amountBase),
      currency: e.baseCurrency,
      expenseId: e.id,
    });
  }

  for (const s of settledSplits) {
    items.push({
      type: 'SPLIT_SETTLED',
      id: `split-${s.id}`,
      date: s.settledAt!.toISOString(),
      actorId: s.userId,
      actorName: s.user.name,
      description: s.expense.description,
      amount: Number(s.amount),
      currency: s.expense.baseCurrency,
      expenseId: s.expense.id,
      targetName: s.user.name,
    });
  }

  for (const m of memberships) {
    items.push({
      type: 'MEMBER_JOINED',
      id: `member-${m.userId}`,
      date: m.joinedAt.toISOString(),
      actorId: m.userId,
      actorName: m.user.name,
      description: '',
    });
  }

  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return items.slice(0, 150);
}

export async function getUserActivity(userId: string): Promise<ActivityItem[]> {
  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    include: { group: { select: { id: true, name: true } } },
  });
  const groupIds = memberships.map((m) => m.groupId);
  if (groupIds.length === 0) return [];

  const groupNameMap = new Map(memberships.map((m) => [m.groupId, m.group.name]));

  const [expenses, settledSplits, joins] = await Promise.all([
    prisma.expense.findMany({
      where: { groupId: { in: groupIds } },
      include: { paidBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    prisma.expenseSplit.findMany({
      where: { isSettled: true, settledAt: { not: null }, expense: { groupId: { in: groupIds } } },
      include: {
        user: { select: { id: true, name: true } },
        expense: { select: { id: true, description: true, baseCurrency: true, groupId: true } },
      },
      orderBy: { settledAt: 'desc' },
      take: 200,
    }),
    prisma.groupMember.findMany({
      where: { groupId: { in: groupIds } },
      include: {
        user: { select: { id: true, name: true } },
        group: { select: { name: true } },
      },
      orderBy: { joinedAt: 'desc' },
      take: 50,
    }),
  ]);

  const items: ActivityItem[] = [];

  for (const e of expenses) {
    items.push({
      type: 'EXPENSE_CREATED',
      id: `expense-${e.id}`,
      date: e.createdAt.toISOString(),
      actorId: e.paidById,
      actorName: e.paidBy.name,
      description: e.description,
      amount: Number(e.amountBase),
      currency: e.baseCurrency,
      expenseId: e.id,
      groupId: e.groupId,
      groupName: groupNameMap.get(e.groupId),
    });
  }

  for (const s of settledSplits) {
    items.push({
      type: 'SPLIT_SETTLED',
      id: `split-${s.id}`,
      date: s.settledAt!.toISOString(),
      actorId: s.userId,
      actorName: s.user.name,
      description: s.expense.description,
      amount: Number(s.amount),
      currency: s.expense.baseCurrency,
      expenseId: s.expense.id,
      groupId: s.expense.groupId,
      groupName: groupNameMap.get(s.expense.groupId),
    });
  }

  for (const m of joins) {
    items.push({
      type: 'MEMBER_JOINED',
      id: `member-${m.groupId}-${m.userId}`,
      date: m.joinedAt.toISOString(),
      actorId: m.userId,
      actorName: m.user.name,
      description: '',
      groupId: m.groupId,
      groupName: m.group.name,
    });
  }

  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return items.slice(0, 150);
}
