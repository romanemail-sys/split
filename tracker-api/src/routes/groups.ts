import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { deviceAuth } from '../middleware/deviceAuth';
import { canSeeDevice } from '../services/groupService';

export const groupsRouter = Router();
groupsRouter.use(deviceAuth);

groupsRouter.post('/', async (req, res) => {
  const parsed = z.object({ name: z.string().min(1).max(100) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const group = await prisma.group.create({
    data: {
      name: parsed.data.name,
      createdById: req.deviceId,
      members: { create: { deviceId: req.deviceId, role: 'OWNER' } },
    },
    include: { members: true },
  });
  res.status(201).json(group);
});

groupsRouter.post('/:id/join', async (req, res) => {
  const group = await prisma.group.findUnique({ where: { id: req.params.id } });
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const existing = await prisma.groupMember.findFirst({
    where: { groupId: req.params.id, deviceId: req.deviceId },
  });
  if (existing) return res.json(existing);

  const member = await prisma.groupMember.create({
    data: { groupId: req.params.id, deviceId: req.deviceId, role: 'MEMBER' },
  });
  res.json(member);
});

groupsRouter.get('/:id/members', async (req, res) => {
  const group = await prisma.group.findUnique({ where: { id: req.params.id } });
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const membership = await prisma.groupMember.findFirst({
    where: { groupId: req.params.id, deviceId: req.deviceId },
  });
  if (!membership) return res.status(403).json({ error: 'Not a member' });

  const allMembers = await prisma.groupMember.findMany({
    where: { groupId: req.params.id },
  });

  const visible = (
    await Promise.all(
      allMembers.map(async (m) => {
        const allowed = await canSeeDevice(req.deviceId, m.deviceId);
        return allowed ? m : null;
      })
    )
  ).filter(Boolean);

  res.json(visible);
});

groupsRouter.delete('/:id/members/me', async (req, res) => {
  await prisma.groupMember.delete({
    where: {
      groupId_deviceId: { groupId: req.params.id, deviceId: req.deviceId },
    },
  });
  res.json({ ok: true });
});

groupsRouter.post('/:id/block/:targetDeviceId', async (req, res) => {
  const { id: groupId, targetDeviceId } = req.params;

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const myMembership = await prisma.groupMember.findFirst({
    where: { groupId, deviceId: req.deviceId },
  });
  if (!myMembership) return res.status(403).json({ error: 'Not a member' });

  const targetMembership = await prisma.groupMember.findFirst({
    where: { groupId, deviceId: targetDeviceId },
  });
  if (!targetMembership) return res.status(404).json({ error: 'Target not in group' });

  await prisma.block.upsert({
    where: { blockerId_blockedId: { blockerId: req.deviceId, blockedId: targetDeviceId } },
    update: {},
    create: { blockerId: req.deviceId, blockedId: targetDeviceId },
  });
  res.json({ ok: true });
});

groupsRouter.delete('/:id/block/:targetDeviceId', async (req, res) => {
  await prisma.block.deleteMany({
    where: { blockerId: req.deviceId, blockedId: req.params.targetDeviceId },
  });
  res.json({ ok: true });
});
