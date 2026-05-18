import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/prisma';
import { config } from '../src/config';

jest.mock('../src/prisma', () => ({
  prisma: {
    appConfig: { findMany: jest.fn(), upsert: jest.fn() },
  },
}));

const app = createApp();

describe('GET /admin/config', () => {
  it('returns all config values with valid admin token', async () => {
    (prisma.appConfig.findMany as jest.Mock).mockResolvedValue([
      { key: 'trackingIntervalSeconds', value: '30', updatedAt: new Date() },
    ]);

    const res = await request(app)
      .get('/admin/config')
      .set('X-Admin-Token', config.adminToken);

    expect(res.status).toBe(200);
    expect(res.body[0].key).toBe('trackingIntervalSeconds');
  });

  it('returns 401 without admin token', async () => {
    const res = await request(app).get('/admin/config');
    expect(res.status).toBe(401);
  });
});

describe('PUT /admin/config/:key', () => {
  it('updates a config value', async () => {
    (prisma.appConfig.upsert as jest.Mock).mockResolvedValue({
      key: 'trackingIntervalSeconds', value: '60', updatedAt: new Date(),
    });

    const res = await request(app)
      .put('/admin/config/trackingIntervalSeconds')
      .set('X-Admin-Token', config.adminToken)
      .send({ value: '60' });

    expect(res.status).toBe(200);
    expect(res.body.value).toBe('60');
  });
});

describe('GET /config', () => {
  it('returns config as key-value object without auth', async () => {
    (prisma.appConfig.findMany as jest.Mock).mockResolvedValue([
      { key: 'trackingIntervalSeconds', value: '30' },
    ]);

    const res = await request(app).get('/config');
    expect(res.status).toBe(200);
    expect(res.body.trackingIntervalSeconds).toBe('30');
  });
});
