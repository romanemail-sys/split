import bcrypt from 'bcrypt';
import crypto from 'crypto';
import type { User as PrismaUser } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from './token.service';
import { sendVerificationEmail, sendPasswordResetEmail } from './email.service';

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
    isAdmin: boolean;
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
    isAdmin: user.isAdmin,
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

  if (!user.isActive) throw new Error('ACCOUNT_DISABLED');

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

export async function forgotPassword(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return; // silent — don't reveal whether email exists

  const token = crypto.randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: { resetPasswordToken: token, resetPasswordExpiry: expiry },
  });

  await sendPasswordResetEmail(email, token);
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: token,
      resetPasswordExpiry: { gt: new Date() },
    },
  });
  if (!user) throw new Error('INVALID_OR_EXPIRED_TOKEN');

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetPasswordToken: null, resetPasswordExpiry: null },
  });
}

export async function sendEmailVerification(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('USER_NOT_FOUND');
  const token = crypto.randomBytes(32).toString('hex');
  await prisma.user.update({ where: { id: userId }, data: { verifyEmailToken: token } });
  await sendVerificationEmail(user.email, token);
}

export async function verifyEmail(token: string): Promise<void> {
  const user = await prisma.user.findFirst({ where: { verifyEmailToken: token } });
  if (!user) throw new Error('INVALID_TOKEN');
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verifyEmailToken: null },
  });
}
