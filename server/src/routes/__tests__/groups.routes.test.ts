import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../app';

const prisma = new PrismaClient();
const DOMAIN = '@qagroups.split';

async function registerAndLogin(name: string, email: string) {
  await request(app).post('/api/auth/register').send({ name, email, password: 'password123' });
  const res = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
  return res.body.accessToken as string;
}

beforeEach(async () => {
  await prisma.group.deleteMany({
    where: { createdBy: { email: { endsWith: DOMAIN } } },
  });
  await prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });
});

afterAll(async () => {
  await prisma.group.deleteMany({
    where: { createdBy: { email: { endsWith: DOMAIN } } },
  });
  await prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });
  await prisma.$disconnect();
});

describe('POST /api/groups', () => {
  it('creates a group and returns 201 with creator as ADMIN', async () => {
    const token = await registerAndLogin('Alice', `alice${DOMAIN}`);
    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Trip', defaultCurrency: 'USD' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Trip');
    expect(res.body.members).toHaveLength(1);
    expect(res.body.members[0].role).toBe('ADMIN');
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/groups').send({ name: 'Trip' });
    expect(res.status).toBe(401);
  });

  it('returns 400 for missing name', async () => {
    const token = await registerAndLogin('Bob', `bob1${DOMAIN}`);
    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });
});

describe('GET /api/groups', () => {
  it('returns only groups the user belongs to', async () => {
    const tokenA = await registerAndLogin('Alice2', `alice2${DOMAIN}`);
    const tokenB = await registerAndLogin('Bob2', `bob2${DOMAIN}`);

    await request(app).post('/api/groups').set('Authorization', `Bearer ${tokenA}`).send({ name: 'Alice Group' });
    await request(app).post('/api/groups').set('Authorization', `Bearer ${tokenB}`).send({ name: 'Bob Group' });

    const res = await request(app).get('/api/groups').set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.every((g: { name: string }) => g.name === 'Alice Group')).toBe(true);
  });
});

describe('POST /api/groups/:id/invite', () => {
  it('allows admin to invite a user by email', async () => {
    const tokenA = await registerAndLogin('Admin', `admin1${DOMAIN}`);
    await request(app).post('/api/auth/register').send({ name: 'Guest', email: `guest1${DOMAIN}`, password: 'password123' });

    const groupRes = await request(app).post('/api/groups').set('Authorization', `Bearer ${tokenA}`).send({ name: 'Party' });
    const groupId = groupRes.body.id;

    const inviteRes = await request(app)
      .post(`/api/groups/${groupId}/invite`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ email: `guest1${DOMAIN}` });

    expect(inviteRes.status).toBe(201);
    expect(inviteRes.body.role).toBe('MEMBER');
  });

  it('returns 409 when user is already a member', async () => {
    const tokenA = await registerAndLogin('Admin2', `admin2${DOMAIN}`);
    await request(app).post('/api/auth/register').send({ name: 'Guest2', email: `guest2${DOMAIN}`, password: 'password123' });

    const groupRes = await request(app).post('/api/groups').set('Authorization', `Bearer ${tokenA}`).send({ name: 'Party2' });
    const groupId = groupRes.body.id;

    await request(app).post(`/api/groups/${groupId}/invite`).set('Authorization', `Bearer ${tokenA}`).send({ email: `guest2${DOMAIN}` });
    const res = await request(app).post(`/api/groups/${groupId}/invite`).set('Authorization', `Bearer ${tokenA}`).send({ email: `guest2${DOMAIN}` });

    expect(res.status).toBe(409);
  });
});

describe('GET /api/groups/:id/balances', () => {
  it('returns zero balance for group with no expenses', async () => {
    const token = await registerAndLogin('BalUser', `baluser${DOMAIN}`);
    const groupRes = await request(app).post('/api/groups').set('Authorization', `Bearer ${token}`).send({ name: 'Bal Group' });
    const groupId = groupRes.body.id;

    const res = await request(app).get(`/api/groups/${groupId}/balances`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body[0].balance).toBe(0);
  });
});
