import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { getDashboard, getAnalytics } from '../services/dashboard.service';
import { getUserActivity } from '../services/activity.service';
import { changePassword } from '../services/auth.service';

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

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

router.patch('/change-password', validate(changePasswordSchema), async (req: Request, res: Response) => {
  try {
    await changePassword(userId(req), req.body.currentPassword, req.body.newPassword);
    res.json({ success: true });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'WRONG_PASSWORD') {
      res.status(400).json({ error: { code: 'WRONG_PASSWORD', message: 'Current password is incorrect' } });
      return;
    }
    if (err instanceof Error && err.message === 'NO_PASSWORD') {
      res.status(400).json({ error: { code: 'NO_PASSWORD', message: 'This account uses Google sign-in' } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Server error' } });
  }
});

export default router;
