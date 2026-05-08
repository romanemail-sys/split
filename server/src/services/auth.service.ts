import bcrypt from 'bcrypt';
import type { User as PrismaUser } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from './token.service';

const BCRYPT_ROUNDS = 12;

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    defaultCurrency: string;
    emailVerified: boolean;
    createdAt: string;
  };
  accessToken: string;
}

function toUserDTO(user: PrismaUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    defaultCurrency: user.defaultCurrency,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function register(data: RegisterRequest): Promise<AuthResponse & { refreshToken: string }> {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new Error('EMAIL_IN_USE');

  if (!data.password || data.password.length < 6) throw new Error('WEAK_PASSWORD');

  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: { name: data.name, email: data.email, passwordHash },
  });

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);
  return { user: toUserDTO(user), accessToken, refreshToken };
}

export async function login(data: LoginRequest): Promise<AuthResponse & { refreshToken: string }> {
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user || !user.passwordHash) throw new Error('INVALID_CREDENTIALS');

  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) throw new Error('INVALID_CREDENTIALS');

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);
  return { user: toUserDTO(user), accessToken, refreshToken };
}

export async function refreshAccessToken(token: string): Promise<{ accessToken: string }> {
  const payload = verifyRefreshToken(token);
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) throw new Error('USER_NOT_FOUND');
  return { accessToken: generateAccessToken(user.id) };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('USER_NOT_FOUND');
  return toUserDTO(user);
}
