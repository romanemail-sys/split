import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { adminAuth } from '../middleware/adminAuth';

export const adminRouter = Router();
adminRouter.use(adminAuth);

adminRouter.get('/config', async (_req, res) => {
  const configs = await prisma.appConfig.findMany();
  res.json(configs);
});

adminRouter.put('/config/:key', async (req, res) => {
  const parsed = z.object({ value: z.string() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const record = await prisma.appConfig.upsert({
    where: { key: req.params.key },
    update: { value: parsed.data.value },
    create: { key: req.params.key, value: parsed.data.value },
  });
  res.json(record);
});
