import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getExchangeRate } from '../services/currency.service';

const router = Router();

const querySchema = z.object({
  from: z.string().length(3),
  to: z.string().length(3),
});

router.get('/rate', async (req: Request, res: Response) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'from and to (3-char currency codes) are required' } });
    return;
  }
  try {
    const rate = await getExchangeRate(parsed.data.from.toUpperCase(), parsed.data.to.toUpperCase());
    res.json({ from: parsed.data.from.toUpperCase(), to: parsed.data.to.toUpperCase(), rate });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('UNSUPPORTED_CURRENCY:')) {
      res.status(400).json({ error: { code: 'UNSUPPORTED_CURRENCY', message: err.message } });
      return;
    }
    res.status(502).json({ error: { code: 'CURRENCY_API_ERROR', message: 'Currency service unavailable' } });
  }
});

export default router;
