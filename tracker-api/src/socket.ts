import { Server, Socket } from 'socket.io';
import { prisma } from './prisma';

export function registerSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    const deviceId = socket.handshake.auth.deviceId as string | undefined;
    if (!deviceId) {
      socket.disconnect();
      return;
    }

    socket.join(`device:${deviceId}`);

    socket.on('join:group', async (groupId: string) => {
      const member = await prisma.groupMember.findFirst({
        where: { groupId, deviceId },
      });
      if (member) socket.join(`group:${groupId}`);
    });

    socket.on('location:update', async (payload: {
      groupId: string;
      latitude: number;
      longitude: number;
      timestamp: string;
    }) => {
      const { groupId, latitude, longitude, timestamp } = payload;

      const member = await prisma.groupMember.findFirst({
        where: { groupId, deviceId },
      });
      if (!member) return;

      const groupMembers = await prisma.groupMember.findMany({
        where: { groupId },
        select: { deviceId: true },
      });

      const memberIds = groupMembers.map((m) => m.deviceId).filter((id) => id !== deviceId);
      if (memberIds.length === 0) return;

      const blockRows = await prisma.block.findMany({
        where: {
          OR: [
            { blockerId: deviceId, blockedId: { in: memberIds } },
            { blockedId: deviceId, blockerId: { in: memberIds } },
          ],
        },
      });
      const blockedSet = new Set([
        ...blockRows.map((b) => b.blockedId),
        ...blockRows.map((b) => b.blockerId),
      ]);
      blockedSet.delete(deviceId);

      for (const recipientId of memberIds) {
        if (blockedSet.has(recipientId)) continue;
        io.to(`device:${recipientId}`).emit('location:live', {
          deviceId,
          latitude,
          longitude,
          timestamp,
        });
      }
    });
  });
}
