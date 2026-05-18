import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';

declare global {
  namespace Express {
    interface Request {
      deviceId: string;
    }
  }
}

export async function deviceAuth(req: Request, res: Response, next: NextFunction) {
  const deviceId = req.headers['x-device-id'] as string | undefined;
  if (!deviceId) {
    return res.status(401).json({ error: 'X-Device-Id header required' });
  }
  const device = await prisma.device.findUnique({ where: { id: deviceId } });
  if (!device) {
    return res.status(401).json({ error: 'Unknown device' });
  }
  req.deviceId = deviceId;
  next();
}
