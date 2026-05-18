import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/prisma';

jest.mock('../src/prisma', () => ({
  prisma: {
    device: { findUnique: jest.fn() },
    locationRecord: { createMany: jest.fn(), findMany: jest.fn() },
    block: { findFirst: jest.fn() },
    groupMember: { findMany: jest.fn(), findFirst: jest.fn() },
  },
}));

const app = createApp();
const DEVICE_ID = 'aaaaaaaa-0000-4000-8000-000000000001';

describe('POST /locations', () => {
  beforeEach(() => {
    (prisma.device.findUnique as jest.Mock).mockResolvedValue({ id: DEVICE_ID });
  });

  it('returns 401 without X-Device-Id header', async () => {
    const res = await request(app).post('/locations').send({ records: [] });
    expect(res.status).toBe(401);
  });

  it('stores batch of location records', async () => {
    (prisma.locationRecord.createMany as jest.Mock).mockResolvedValue({ count: 2 });

    const res = await request(app)
      .post('/locations')
      .set('X-Device-Id', DEVICE_ID)
      .send({
        records: [
          { latitude: 32.08, longitude: 34.78, timestamp: '2026-05-18T10:00:00Z' },
          { latitude: 32.09, longitude: 34.79, timestamp: '2026-05-18T10:00:30Z' },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
  });

  it('returns 400 when records array is missing', async () => {
    const res = await request(app)
      .post('/locations')
      .set('X-Device-Id', DEVICE_ID)
      .send({});
    expect(res.status).toBe(400);
  });
});

describe('GET /locations', () => {
  beforeEach(() => {
    (prisma.device.findUnique as jest.Mock).mockResolvedValue({ id: DEVICE_ID });
  });

  it('returns own location history', async () => {
    (prisma.locationRecord.findMany as jest.Mock).mockResolvedValue([
      { id: 'loc1', deviceId: DEVICE_ID, latitude: 32.08, longitude: 34.78, timestamp: new Date() },
    ]);
    (prisma.block.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .get(`/locations?deviceId=${DEVICE_ID}`)
      .set('X-Device-Id', DEVICE_ID);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('returns 403 when target is not in a shared group', async () => {
    const OTHER = 'bbbbbbbb-0000-4000-8000-000000000002';
    (prisma.block.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.groupMember.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .get(`/locations?deviceId=${OTHER}`)
      .set('X-Device-Id', DEVICE_ID);

    expect(res.status).toBe(403);
  });

  it('returns 403 when target has blocked viewer', async () => {
    const OTHER = 'bbbbbbbb-0000-4000-8000-000000000002';
    (prisma.block.findFirst as jest.Mock).mockResolvedValue({ blockerId: OTHER, blockedId: DEVICE_ID });

    const res = await request(app)
      .get(`/locations?deviceId=${OTHER}`)
      .set('X-Device-Id', DEVICE_ID);

    expect(res.status).toBe(403);
  });
});
