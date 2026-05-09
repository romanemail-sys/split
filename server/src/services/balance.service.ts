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
