import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import {
  createExpense, getExpense, updateExpense, deleteExpense, listExpenses, listAllExpenses, settleSplit,
} from '../services/expense.service';

const router = Router();
router.use(requireAuth);

function userId(req: Request): string {
  return (req as AuthenticatedRequest).userId;
}

const splitInputSchema = z.object({
  userId: z.string(),
  amount: z.number().min(0).optional(),
  percentage: z.number().min(0).optional(),
  shares: z.number().min(0).optional(),
});

const createExpenseSchema = z.object({
  groupId: z.string(),
  paidById: z.string(),
  description: z.string().min(1).max(200),
  amount: z.number().positive(),
  currency: z.string().length(3),
  categoryId: z.string().optional(),
  splitType: z.enum(['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  receiptUrl: z.string().url().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceRule: z.string().optional(),
  splits: z.array(splitInputSchema).min(1),
});

const updateExpenseSchema = z.object({
  description: z.string().min(1).max(200).optional(),
  amount: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  categoryId: z.string().nullable().optional(),
  splitType: z.enum(['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES']).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  receiptUrl: z.string().url().nullable().optional(),
  splits: z.array(splitInputSchema).min(1).optional(),
});

function handleError(res: Response, err: unknown) {
  if (err instanceof Error) {
    const map: Record<string, number> = {
      EXPENSE_NOT_FOUND: 404,
      NOT_MEMBER: 403,
      FORBIDDEN: 403,
      GROUP_NOT_FOUND: 404,
      CURRENCY_API_ERROR: 502,
    };
    const status = map[err.message];
    if (status) {
      res.status(status).json({ error: { code: err.message, message: err.message } });
      return;
    }
    if (err.message.startsWith('UNSUPPORTED_CURRENCY:')) {
      res.status(400).json({ error: { code: 'UNSUPPORTED_CURRENCY', message: err.message } });
      return;
    }
  }
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Server error' } });
}

router.get('/', async (req: Request, res: Response) => {
  const parsed = z.object({
    groupId: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }).safeParse(req.query);

  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid query params' } });
    return;
  }

  try {
    const result = parsed.data.groupId
      ? await listExpenses(userId(req), parsed.data.groupId, parsed.data.page, parsed.data.limit)
      : await listAllExpenses(userId(req), parsed.data.page, parsed.data.limit);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/', validate(createExpenseSchema), async (req: Request, res: Response) => {
  try {
    const expense = await createExpense(userId(req), req.body);
    res.status(201).json(expense);
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const expense = await getExpense(req.params.id, userId(req));
    res.json(expense);
  } catch (err) {
    handleError(res, err);
  }
});

router.put('/:id', validate(updateExpenseSchema), async (req: Request, res: Response) => {
  try {
    const expense = await updateExpense(req.params.id, userId(req), req.body);
    res.json(expense);
  } catch (err) {
    handleError(res, err);
  }
});

router.patch('/:id/splits/:splitId/settle', async (req: Request, res: Response) => {
  try {
    const split = await settleSplit(req.params.id, req.params.splitId, userId(req));
    res.json(split);
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await deleteExpense(req.params.id, userId(req));
    res.status(204).send();
  } catch (err) {
    handleError(res, err);
  }
});

export default router;
