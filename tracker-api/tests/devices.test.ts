import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/prisma';

jest.mock('../src/prisma', () => ({
  prisma: {
    device: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

const app = createApp();

describe('POST /devices', () => {
  it('registers a new device and returns it', async () => {
    const deviceId = 'aaaaaaaa-0000-4000-8000-000000000001';
    (prisma.device.upsert as jest.Mock).mockResolvedValue({
      id: deviceId,
      name: null,
      createdAt: new Date(),
      lastSeenAt: new Date(),
    });

    const res = await request(app).post('/devices').send({ id: deviceId });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(deviceId);
  });

  it('returns 400 when id is missing', async () => {
    const res = await request(app).post('/devices').send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 when id is not a UUID', async () => {
    const res = await request(app).post('/devices').send({ id: 'not-a-uuid' });
    expect(res.status).toBe(400);
  });
});

describe('GET /devices/:id', () => {
  it('returns device when found', async () => {
    const deviceId = 'aaaaaaaa-0000-4000-8000-000000000001';
    (prisma.device.findUnique as jest.Mock).mockResolvedValue({
      id: deviceId,
      name: 'My Phone',
      createdAt: new Date(),
      lastSeenAt: new Date(),
    });

    const res = await request(app).get(`/devices/${deviceId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(deviceId);
  });

  it('returns 404 when device not found', async () => {
    (prisma.device.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await request(app).get('/devices/nonexistent');
    expect(res.status).toBe(404);
  });
});
