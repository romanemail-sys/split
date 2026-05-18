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

      for (const gm of groupMembers) {
        if (gm.deviceId === deviceId) continue;

        const block = await prisma.block.findFirst({
          where: {
            OR: [
              { blockerId: gm.deviceId, blockedId: deviceId },
              { blockerId: deviceId, blockedId: gm.deviceId },
            ],
          },
        });
        if (block) continue;

        io.to(`device:${gm.deviceId}`).emit('location:live', {
          deviceId,
          latitude,
          longitude,
          timestamp,
        });
      }
    });
  });
}
