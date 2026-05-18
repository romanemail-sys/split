import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { deviceAuth } from '../middleware/deviceAuth';

export const devicesRouter = Router();

const RegisterSchema = z.object({
  id: z.string().uuid(),
  name: z.string().max(100).optional(),
});

devicesRouter.post('/', async (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { id, name } = parsed.data;
  const device = await prisma.device.upsert({
    where: { id },
    update: { lastSeenAt: new Date(), ...(name ? { name } : {}) },
    create: { id, name, lastSeenAt: new Date() },
  });
  res.json(device);
});

devicesRouter.get('/:id', deviceAuth, async (req, res) => {
  const device = await prisma.device.findUnique({ where: { id: req.params.id } });
  if (!device) return res.status(404).json({ error: 'Not found' });
  res.json({ id: device.id, name: device.name });
});
