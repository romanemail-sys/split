import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import {
  createGroup, getGroup, listGroups, updateGroup, deleteGroup,
  addMember, removeMember, listMembers, searchInviteCandidates,
} from '../services/group.service';
import { computeGroupBalances, settleMembers } from '../services/balance.service';
import { getGroupActivity } from '../services/activity.service';

const router = Router();
router.use(requireAuth);

const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  defaultCurrency: z.string().length(3).optional(),
});

const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  defaultCurrency: z.string().length(3).optional(),
});

const inviteSchema = z.object({ email: z.string().email() });

function userId(req: Request): string {
  return (req as AuthenticatedRequest).userId;
}

function handleError(res: Response, err: unknown) {
  if (err instanceof Error) {
    const map: Record<string, number> = {
      GROUP_NOT_FOUND: 404, NOT_MEMBER: 403, FORBIDDEN: 403,
      USER_NOT_FOUND: 404, ALREADY_MEMBER: 409,
    };
    const status = map[err.message];
    if (status) {
      res.status(status).json({ error: { code: err.message, message: err.message } });
      return;
    }
  }
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Server error' } });
}

router.get('/', async (req: Request, res: Response) => {
  const groups = await listGroups(userId(req));
  res.json(groups);
});

router.post('/', validate(createGroupSchema), async (req: Request, res: Response) => {
  try {
    const group = await createGroup(userId(req), req.body);
    res.status(201).json(group);
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const group = await getGroup(req.params.id, userId(req));
    res.json(group);
  } catch (err) {
    handleError(res, err);
  }
});

router.put('/:id', validate(updateGroupSchema), async (req: Request, res: Response) => {
  try {
    const group = await updateGroup(req.params.id, userId(req), req.body);
    res.json(group);
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await deleteGroup(req.params.id, userId(req));
    res.status(204).send();
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/:id/members', async (req: Request, res: Response) => {
  try {
    const members = await listMembers(req.params.id, userId(req));
    res.json(members);
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/:id/invite-candidates', async (req: Request, res: Response) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const candidates = await searchInviteCandidates(req.params.id, userId(req), q);
    res.json(candidates);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/:id/invite', validate(inviteSchema), async (req: Request, res: Response) => {
  try {
    const member = await addMember(req.params.id, userId(req), req.body.email);
    res.status(201).json(member);
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/:id/members/:userId', async (req: Request, res: Response) => {
  try {
    await removeMember(req.params.id, userId(req), req.params.userId);
    res.status(204).send();
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/:id/balances', async (req: Request, res: Response) => {
  try {
    await getGroup(req.params.id, userId(req));
    const balances = await computeGroupBalances(req.params.id);
    res.json(balances);
  } catch (err) {
    handleError(res, err);
  }
});

const settleMembersSchema = z.object({
  fromUserId: z.string(),
  toUserId: z.string(),
});

router.post('/:id/settle-members', validate(settleMembersSchema), async (req: Request, res: Response) => {
  try {
    const result = await settleMembers(req.params.id, req.body.fromUserId, req.body.toUserId, userId(req));
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/:id/activity', async (req: Request, res: Response) => {
  try {
    await getGroup(req.params.id, userId(req));
    const activity = await getGroupActivity(req.params.id);
    res.json(activity);
  } catch (err) {
    handleError(res, err);
  }
});

export default router;
