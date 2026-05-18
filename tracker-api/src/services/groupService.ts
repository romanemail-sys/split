import { prisma } from '../prisma';

export async function canSeeDevice(viewerDeviceId: string, targetDeviceId: string): Promise<boolean> {
  if (viewerDeviceId === targetDeviceId) return true;

  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: targetDeviceId, blockedId: viewerDeviceId },
        { blockerId: viewerDeviceId, blockedId: targetDeviceId },
      ],
    },
  });
  if (block) return false;

  const viewerGroups = await prisma.groupMember.findMany({
    where: { deviceId: viewerDeviceId },
    select: { groupId: true },
  });
  const groupIds = viewerGroups.map((m) => m.groupId);
  if (groupIds.length === 0) return false;

  const sharedGroup = await prisma.groupMember.findFirst({
    where: { deviceId: targetDeviceId, groupId: { in: groupIds } },
  });
  return !!sharedGroup;
}
