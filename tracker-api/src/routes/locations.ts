import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { deviceAuth } from '../middleware/deviceAuth';
import { canSeeDevice } from '../services/groupService';

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

locationsRouter.get('/', deviceAuth, async (req, res) => {
  const targetDeviceId = req.query.deviceId as string | undefined;
  if (!targetDeviceId) return res.status(400).json({ error: 'deviceId query param required' });

  const allowed = await canSeeDevice(req.deviceId, targetDeviceId);
  if (!allowed) return res.status(403).json({ error: 'Access denied' });

  const from = req.query.from ? new Date(req.query.from as string) : undefined;
  const to = req.query.to ? new Date(req.query.to as string) : undefined;

  const records = await prisma.locationRecord.findMany({
    where: {
      deviceId: targetDeviceId,
      ...(from || to
        ? { timestamp: { ...(from && { gte: from }), ...(to && { lte: to }) } }
        : {}),
    },
    orderBy: { timestamp: 'asc' },
    take: 5000,
  });

  res.json(records);
});
