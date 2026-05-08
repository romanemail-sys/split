import { PrismaClient } from '@prisma/client';
import { register, login } from '../auth.service';

const prisma = new PrismaClient();

beforeEach(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: '@test.split' } } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: '@test.split' } } });
  await prisma.$disconnect();
});

describe('auth.service', () => {
  describe('register', () => {
    it('creates a user and returns user + tokens', async () => {
      const result = await register({
        name: 'Test User',
        email: 'test1@test.split',
        password: 'password123',
      });
      expect(result.user.email).toBe('test1@test.split');
      expect(result.user.name).toBe('Test User');
      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');
    });

    it('throws if email already registered', async () => {
      await register({ name: 'A', email: 'test2@test.split', password: 'password' });
      await expect(
        register({ name: 'B', email: 'test2@test.split', password: 'password' })
      ).rejects.toThrow('EMAIL_IN_USE');
    });
  });

  describe('login', () => {
    it('returns user + tokens for valid credentials', async () => {
      await register({ name: 'C', email: 'test3@test.split', password: 'mypassword' });
      const result = await login({ email: 'test3@test.split', password: 'mypassword' });
      expect(result.user.email).toBe('test3@test.split');
    });

    it('throws for wrong password', async () => {
      await register({ name: 'D', email: 'test4@test.split', password: 'correct' });
      await expect(
        login({ email: 'test4@test.split', password: 'wrong' })
      ).rejects.toThrow('INVALID_CREDENTIALS');
    });

    it('throws for unknown email', async () => {
      await expect(
        login({ email: 'nobody@test.split', password: 'any' })
      ).rejects.toThrow('INVALID_CREDENTIALS');
    });
  });
});
