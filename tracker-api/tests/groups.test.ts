import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/prisma';

jest.mock('../src/prisma', () => ({
  prisma: {
    device: { findUnique: jest.fn() },
    group: { create: jest.fn(), findUnique: jest.fn() },
    groupMember: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    block: { findFirst: jest.fn(), upsert: jest.fn(), deleteMany: jest.fn() },
  },
}));

const app = createApp();
const DEVICE_ID = 'aaaaaaaa-0000-4000-8000-000000000001';

beforeEach(() => {
  jest.clearAllMocks();
  (prisma.device.findUnique as jest.Mock).mockResolvedValue({ id: DEVICE_ID });
});

describe('POST /groups', () => {
  it('creates a group and adds creator as OWNER', async () => {
    (prisma.group.create as jest.Mock).mockResolvedValue({
      id: 'group-1', name: 'Family', createdById: DEVICE_ID, createdAt: new Date(), members: [],
    });

    const res = await request(app)
      .post('/groups')
      .set('X-Device-Id', DEVICE_ID)
      .send({ name: 'Family' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Family');
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/groups')
      .set('X-Device-Id', DEVICE_ID)
      .send({});
    expect(res.status).toBe(400);
  });
});

describe('POST /groups/:id/join', () => {
  it('adds device as MEMBER', async () => {
    (prisma.group.findUnique as jest.Mock).mockResolvedValue({ id: 'group-1' });
    (prisma.groupMember.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.groupMember.create as jest.Mock).mockResolvedValue({
      groupId: 'group-1', deviceId: DEVICE_ID, role: 'MEMBER', joinedAt: new Date(),
    });

    const res = await request(app)
      .post('/groups/group-1/join')
      .set('X-Device-Id', DEVICE_ID)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('MEMBER');
  });

  it('returns 404 for unknown group', async () => {
    (prisma.group.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await request(app)
      .post('/groups/unknown/join')
      .set('X-Device-Id', DEVICE_ID)
      .send({});
    expect(res.status).toBe(404);
  });

  it('returns existing membership when already joined', async () => {
    (prisma.group.findUnique as jest.Mock).mockResolvedValue({ id: 'group-1' });
    (prisma.groupMember.findFirst as jest.Mock).mockResolvedValue({
      groupId: 'group-1', deviceId: DEVICE_ID, role: 'MEMBER', joinedAt: new Date(),
    });

    const res = await request(app)
      .post('/groups/group-1/join')
      .set('X-Device-Id', DEVICE_ID)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('MEMBER');
  });
});

describe('GET /groups/:id/members', () => {
  it('returns member list', async () => {
    (prisma.group.findUnique as jest.Mock).mockResolvedValue({ id: 'group-1' });
    (prisma.groupMember.findFirst as jest.Mock).mockResolvedValue({ groupId: 'group-1', deviceId: DEVICE_ID });
    (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([
      { deviceId: DEVICE_ID, role: 'OWNER', joinedAt: new Date() },
    ]);
    (prisma.block.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .get('/groups/group-1/members')
      .set('X-Device-Id', DEVICE_ID);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('returns 403 when not a member', async () => {
    (prisma.group.findUnique as jest.Mock).mockResolvedValue({ id: 'group-1' });
    (prisma.groupMember.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .get('/groups/group-1/members')
      .set('X-Device-Id', DEVICE_ID);

    expect(res.status).toBe(403);
  });
});
