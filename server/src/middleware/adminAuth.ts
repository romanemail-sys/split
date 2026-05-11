import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/token.service';
import { prisma } from '../lib/prisma';

export interface AdminRequest extends Request {
  userId: string;
}

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing token' } });
    return;
  }

  let userId: string;
  try {
    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);
    userId = payload.userId;
  } catch {
    res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true, isActive: true },
  });

  if (!user || !user.isActive || !user.isAdmin) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Admin access required' } });
    return;
  }

  (req as AdminRequest).userId = userId;
  next();
}
