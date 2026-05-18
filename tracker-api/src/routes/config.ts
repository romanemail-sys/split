import { Router } from 'express';
import { prisma } from '../prisma';

export const configRouter = Router();

configRouter.get('/', async (_req, res) => {
  const records = await prisma.appConfig.findMany();
  const config = Object.fromEntries(records.map((r) => [r.key, r.value]));
  res.json(config);
});
