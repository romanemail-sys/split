import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../app';

const prisma = new PrismaClient();

beforeEach(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@routetest.split' } } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@routetest.split' } } });
  await prisma.$disconnect();
});

describe('POST /api/auth/register', () => {
  it('returns 201 with user and accessToken', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Route User',
      email: 'user1@routetest.split',
      password: 'password123',
    });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('user1@routetest.split');
    expect(typeof res.body.accessToken).toBe('string');
  });

  it('returns 409 for duplicate email', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'A', email: 'user2@routetest.split', password: 'password123',
    });
    const res = await request(app).post('/api/auth/register').send({
      name: 'B', email: 'user2@routetest.split', password: 'password123',
    });
    expect(res.status).toBe(409);
  });

  it('returns 400 for missing fields', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'x@test.com' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('returns 200 with user and accessToken', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Login User', email: 'user3@routetest.split', password: 'mypassword',
    });
    const res = await request(app).post('/api/auth/login').send({
      email: 'user3@routetest.split', password: 'mypassword',
    });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('user3@routetest.split');
  });

  it('returns 401 for wrong password', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'C', email: 'user4@routetest.split', password: 'correct123',
    });
    const res = await request(app).post('/api/auth/login').send({
      email: 'user4@routetest.split', password: 'wrong',
    });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns current user with valid token', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Me User', email: 'user5@routetest.split', password: 'password123',
    });
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${reg.body.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('user5@routetest.split');
  });
});

describe('POST /api/auth/logout', () => {
  it('returns 200 and clears cookie', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
