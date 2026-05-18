import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { deviceAuth } from '../middleware/deviceAuth';

export const locationsRouter = Router();

const RecordSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
  altitude: z.number().optional(),
  timestamp: z.string().datetime(),
});

const BatchSchema = z.object({
  records: z.array(RecordSchema).min(1).max(500),
});

locationsRouter.post('/', deviceAuth, async (req, res) => {
  const parsed = BatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const data = parsed.data.records.map((r) => ({
    ...r,
    timestamp: new Date(r.timestamp),
    deviceId: req.deviceId,
  }));

  const result = await prisma.locationRecord.createMany({ data });
  res.json({ count: result.count });
});
