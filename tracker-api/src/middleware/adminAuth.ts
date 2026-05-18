import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export function adminAuth(req: Request, res: Response, next: NextFunction) {
  if (req.headers['x-admin-token'] !== config.adminToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
