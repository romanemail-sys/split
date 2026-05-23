import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { register, login, refreshAccessToken, getMe, forgotPassword, resetPassword, verifyEmail } from '../services/auth.service';
import { config } from '../config';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const forgotSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({ token: z.string(), password: z.string().min(6) });

function setRefreshCookie(res: Response, token: string): void {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

router.post('/register', validate(registerSchema), async (req: Request, res: Response) => {
  try {
    const { refreshToken, ...rest } = await register(req.body);
    setRefreshCookie(res, refreshToken);
    res.status(201).json(rest);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'EMAIL_IN_USE') {
      res.status(409).json({ error: { code: 'EMAIL_IN_USE', message: 'Email already registered' } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Server error' } });
  }
});

router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { refreshToken, ...rest } = await login(req.body);
    setRefreshCookie(res, refreshToken);
    res.json(rest);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'INVALID_CREDENTIALS') {
      res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
      return;
    }
    if (err instanceof Error && err.message === 'ACCOUNT_DISABLED') {
      res.status(403).json({ error: { code: 'ACCOUNT_DISABLED', message: 'This account has been deactivated' } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Server error' } });
  }
});

router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('refreshToken');
  res.json({ success: true });
});

router.post('/refresh', async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken as string | undefined;
  if (!token) {
    res.status(401).json({ error: { code: 'NO_REFRESH_TOKEN', message: 'No refresh token' } });
    return;
  }
  try {
    const result = await refreshAccessToken(token);
    res.json(result);
  } catch {
    res.status(401).json({ error: { code: 'INVALID_REFRESH_TOKEN', message: 'Invalid refresh token' } });
  }
});

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await getMe((req as AuthenticatedRequest).userId);
    res.json(user);
  } catch {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
  }
});

router.post('/forgot-password', validate(forgotSchema), async (req: Request, res: Response) => {
  await forgotPassword(req.body.email).catch(() => {});
  res.json({ success: true });
});

router.post('/reset-password', validate(resetSchema), async (req: Request, res: Response) => {
  try {
    await resetPassword(req.body.token, req.body.password);
    res.json({ success: true });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'INVALID_OR_EXPIRED_TOKEN') {
      res.status(400).json({ error: { code: 'INVALID_OR_EXPIRED_TOKEN', message: 'Token invalid or expired' } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Server error' } });
  }
});

router.get('/verify-email', async (req: Request, res: Response) => {
  const token = req.query.token as string;
  if (!token) {
    res.status(400).json({ error: { code: 'MISSING_TOKEN', message: 'Token required' } });
    return;
  }
  try {
    await verifyEmail(token);
    res.redirect(`${config.CLIENT_URL}/login?verified=1`);
  } catch {
    res.redirect(`${config.CLIENT_URL}/login?error=invalid_token`);
  }
});

export default router;
