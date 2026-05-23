import { Router, Request, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { getDashboard, getAnalytics } from '../services/dashboard.service';
import { getUserActivity } from '../services/activity.service';

const router = Router();
router.use(requireAuth);

function userId(req: Request): string {
  return (req as AuthenticatedRequest).userId;
}

router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const data = await getDashboard(userId(req));
    res.json(data);
  } catch {
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Server error' } });
  }
});

router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const data = await getAnalytics(userId(req));
    res.json(data);
  } catch {
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Server error' } });
  }
});

router.get('/activity', async (req: Request, res: Response) => {
  try {
    const data = await getUserActivity(userId(req));
    res.json(data);
  } catch {
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Server error' } });
  }
});

export default router;
