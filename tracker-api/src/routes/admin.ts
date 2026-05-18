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

const NUMERIC_KEYS = new Set(['trackingIntervalSeconds']);

adminRouter.put('/config/:key', async (req, res) => {
  const valueSchema = NUMERIC_KEYS.has(req.params.key)
    ? z.object({ value: z.string().regex(/^\d+$/, 'must be a positive integer') })
    : z.object({ value: z.string() });
  const parsed = valueSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const record = await prisma.appConfig.upsert({
    where: { key: req.params.key },
    update: { value: parsed.data.value },
    create: { key: req.params.key, value: parsed.data.value },
  });
  res.json(record);
});
