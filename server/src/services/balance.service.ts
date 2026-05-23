import { prisma } from '../lib/prisma';

export async function computeGroupBalances(groupId: string) {
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  });

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  const currency = group?.defaultCurrency ?? 'USD';

  const userIds = members.map((m) => m.userId);
  const userMap = new Map(members.map((m) => ({ key: m.userId, val: m.user })).map(({ key, val }) => [key, val]));

  // Build a net debt matrix: net[A][B] = how much A owes B (can be negative, meaning B owes A)
  const net: Map<string, Map<string, number>> = new Map();
  for (const a of userIds) {
    net.set(a, new Map());
    for (const b of userIds) {
      if (a !== b) net.get(a)!.set(b, 0);
    }
  }

  // Fetch all unsettled splits for this group
  const splits = await prisma.expenseSplit.findMany({
    where: { isSettled: false, expense: { groupId } },
    include: { expense: { select: { paidById: true } } },
  });

  for (const split of splits) {
    const debtor = split.userId;
    const creditor = split.expense.paidById;
    if (debtor === creditor) continue; // payer's own share — skip

    const current = net.get(debtor)?.get(creditor) ?? 0;
    net.get(debtor)?.set(creditor, current + Number(split.amount));
  }

  // Reduce to unique pairs with a positive net
  const pairs: {
    fromUserId: string; fromName: string; fromAvatarUrl: string | null;
    toUserId: string; toName: string; toAvatarUrl: string | null;
    amount: number; currency: string;
  }[] = [];

  const seen = new Set<string>();
  for (const a of userIds) {
    for (const b of userIds) {
      if (a >= b) continue; // process each pair once
      const pairKey = `${a}:${b}`;
      if (seen.has(pairKey)) continue;
      seen.add(pairKey);

      const aOwesB = net.get(a)?.get(b) ?? 0;
      const bOwesA = net.get(b)?.get(a) ?? 0;
      const netAB = aOwesB - bOwesA;

      if (Math.abs(netAB) < 0.005) continue; // effectively zero

      const fromId = netAB > 0 ? a : b;
      const toId = netAB > 0 ? b : a;
      pairs.push({
        fromUserId: fromId,
        fromName: userMap.get(fromId)!.name,
        fromAvatarUrl: userMap.get(fromId)!.avatarUrl,
        toUserId: toId,
        toName: userMap.get(toId)!.name,
        toAvatarUrl: userMap.get(toId)!.avatarUrl,
        amount: Math.round(Math.abs(netAB) * 100) / 100,
        currency,
      });
    }
  }

  return pairs;
}

export async function settleMembers(groupId: string, fromUserId: string, toUserId: string, requesterId: string) {
  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: requesterId } },
  });
  if (!member) throw new Error('NOT_MEMBER');

  const isAdmin = member.role === 'ADMIN';
  const isParticipant = requesterId === fromUserId || requesterId === toUserId;
  if (!isAdmin && !isParticipant) throw new Error('FORBIDDEN');

  // Settle all unsettled splits between the two users in both directions
  const result = await prisma.expenseSplit.updateMany({
    where: {
      isSettled: false,
      OR: [
        { userId: fromUserId, expense: { groupId, paidById: toUserId } },
        { userId: toUserId, expense: { groupId, paidById: fromUserId } },
      ],
    },
    data: { isSettled: true, settledAt: new Date() },
  });

  return { settled: result.count };
}
