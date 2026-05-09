import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../app';

const prisma = new PrismaClient();
const DOMAIN = '@qaexpenses.split';

interface UserCtx { token: string; userId: string }

async function setupUser(name: string, email: string): Promise<UserCtx> {
  await request(app).post('/api/auth/register').send({ name, email, password: 'password123' });
  const res = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
  return { token: res.body.accessToken, userId: res.body.user.id };
}

beforeEach(async () => {
  await prisma.expense.deleteMany({ where: { group: { createdBy: { email: { endsWith: DOMAIN } } } } });
  await prisma.group.deleteMany({ where: { createdBy: { email: { endsWith: DOMAIN } } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });
});

afterAll(async () => {
  await prisma.expense.deleteMany({ where: { group: { createdBy: { email: { endsWith: DOMAIN } } } } });
  await prisma.group.deleteMany({ where: { createdBy: { email: { endsWith: DOMAIN } } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });
  await prisma.$disconnect();
});

describe('POST /api/expenses', () => {
  it('creates an expense with EQUAL split and returns 201', async () => {
    const alice = await setupUser('Alice', `alice${DOMAIN}`);
    const bob = await setupUser('Bob', `bob${DOMAIN}`);

    const groupRes = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'Trip', defaultCurrency: 'USD' });
    const groupId = groupRes.body.id;

    await request(app)
      .post(`/api/groups/${groupId}/invite`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ email: `bob${DOMAIN}` });

    const groupDetail = await request(app).get(`/api/groups/${groupId}`).set('Authorization', `Bearer ${alice.token}`);
    const memberIds = groupDetail.body.members.map((m: { userId: string }) => m.userId);

    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({
        groupId,
        paidById: alice.userId,
        description: 'Dinner',
        amount: 100,
        currency: 'USD',
        splitType: 'EQUAL',
        date: '2025-01-15',
        splits: memberIds.map((id: string) => ({ userId: id })),
      });

    expect(res.status).toBe(201);
    expect(res.body.description).toBe('Dinner');
    expect(res.body.splits).toHaveLength(2);
    expect(res.body.splits[0].amount).toBe(50);
    expect(res.body.splits[1].amount).toBe(50);
  });

  it('returns 403 when requester is not a group member', async () => {
    const alice = await setupUser('Alice2', `alice2${DOMAIN}`);
    const carol = await setupUser('Carol', `carol${DOMAIN}`);

    const groupRes = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'Private', defaultCurrency: 'USD' });
    const groupId = groupRes.body.id;

    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${carol.token}`)
      .send({
        groupId,
        paidById: carol.userId,
        description: 'Snacks',
        amount: 20,
        currency: 'USD',
        splitType: 'EQUAL',
        date: '2025-01-15',
        splits: [{ userId: carol.userId }],
      });

    expect(res.status).toBe(403);
  });

  it('returns 400 for missing required fields', async () => {
    const alice = await setupUser('Alice3', `alice3${DOMAIN}`);
    const token = alice.token;

    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'No amount' });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/expenses', () => {
  it('requires groupId query param', async () => {
    const alice = await setupUser('Alice4', `alice4${DOMAIN}`);
    const res = await request(app).get('/api/expenses').set('Authorization', `Bearer ${alice.token}`);
    expect(res.status).toBe(400);
  });

  it('returns paginated expenses for the group', async () => {
    const alice = await setupUser('Alice5', `alice5${DOMAIN}`);

    const groupRes = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'Paginated Group', defaultCurrency: 'USD' });
    const groupId = groupRes.body.id;
    const aliceId = alice.userId;

    await request(app).post('/api/expenses').set('Authorization', `Bearer ${alice.token}`).send({
      groupId, paidById: aliceId, description: 'E1', amount: 10, currency: 'USD', splitType: 'EQUAL', date: '2025-01-01', splits: [{ userId: aliceId }],
    });
    await request(app).post('/api/expenses').set('Authorization', `Bearer ${alice.token}`).send({
      groupId, paidById: aliceId, description: 'E2', amount: 20, currency: 'USD', splitType: 'EQUAL', date: '2025-01-02', splits: [{ userId: aliceId }],
    });

    const res = await request(app)
      .get('/api/expenses')
      .set('Authorization', `Bearer ${alice.token}`)
      .query({ groupId, page: 1, limit: 10 });

    expect(res.status).toBe(200);
    expect(res.body.expenses).toHaveLength(2);
    expect(res.body.total).toBe(2);
    expect(res.body.hasMore).toBe(false);
  });
});

describe('DELETE /api/expenses/:id', () => {
  it('payer can delete their own expense', async () => {
    const alice = await setupUser('Alice6', `alice6${DOMAIN}`);
    const groupRes = await request(app).post('/api/groups').set('Authorization', `Bearer ${alice.token}`).send({ name: 'Del Group', defaultCurrency: 'USD' });
    const groupId = groupRes.body.id;

    const expRes = await request(app).post('/api/expenses').set('Authorization', `Bearer ${alice.token}`).send({
      groupId, paidById: alice.userId, description: 'To Delete', amount: 5, currency: 'USD', splitType: 'EQUAL', date: '2025-01-01', splits: [{ userId: alice.userId }],
    });

    const delRes = await request(app).delete(`/api/expenses/${expRes.body.id}`).set('Authorization', `Bearer ${alice.token}`);
    expect(delRes.status).toBe(204);
  });
});
