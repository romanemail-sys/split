import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAdmin, AdminRequest } from '../middleware/adminAuth';
import { listUsers, createUser, setUserActive, setUserPassword } from '../services/admin.service';

const router = Router();

router.use(requireAdmin);

const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6),
});

// GET /api/admin/users
router.get('/users', async (_req: Request, res: Response) => {
  const users = await listUsers();
  res.json(users);
});

// POST /api/admin/users
router.post('/users', validate(createUserSchema), async (req: Request, res: Response) => {
  try {
    const user = await createUser(req.body.name, req.body.email, req.body.password);
    res.status(201).json(user);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'EMAIL_IN_USE') {
      res.status(409).json({ error: { code: 'EMAIL_IN_USE', message: 'Email already in use' } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Server error' } });
  }
});

// PATCH /api/admin/users/:id/set-password
const setPasswordSchema = z.object({ password: z.string().min(6) });
router.patch('/users/:id/set-password', validate(setPasswordSchema), async (req: Request, res: Response) => {
  try {
    const user = await setUserPassword(req.params.id, req.body.password);
    res.json(user);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'USER_NOT_FOUND') {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Server error' } });
  }
});

// PATCH /api/admin/users/:id/deactivate
router.patch('/users/:id/deactivate', async (req: Request, res: Response) => {
  try {
    const requestingUserId = (req as AdminRequest).userId;
    const user = await setUserActive(req.params.id, false, requestingUserId);
    res.json(user);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'CANNOT_DEACTIVATE_SELF') {
      res.status(400).json({ error: { code: 'CANNOT_DEACTIVATE_SELF', message: 'You cannot deactivate your own account' } });
      return;
    }
    if (err instanceof Error && err.message === 'USER_NOT_FOUND') {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Server error' } });
  }
});

// PATCH /api/admin/users/:id/activate
router.patch('/users/:id/activate', async (req: Request, res: Response) => {
  try {
    const requestingUserId = (req as AdminRequest).userId;
    const user = await setUserActive(req.params.id, true, requestingUserId);
    res.json(user);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'USER_NOT_FOUND') {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Server error' } });
  }
});

export default router;
