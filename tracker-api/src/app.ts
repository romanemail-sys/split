import express from 'express';
import cors from 'cors';
import { devicesRouter } from './routes/devices';
import { locationsRouter } from './routes/locations';
import { groupsRouter } from './routes/groups';
import { configRouter } from './routes/config';
import { adminRouter } from './routes/admin';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/devices', devicesRouter);
  app.use('/locations', locationsRouter);
  app.use('/groups', groupsRouter);
  app.use('/config', configRouter);
  app.use('/admin', adminRouter);
  return app;
}
