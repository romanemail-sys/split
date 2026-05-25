import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';

const BCRYPT_ROUNDS = 12;

export interface UserAdminDTO {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  isActive: boolean;
  avatarUrl: string | null;
  createdAt: string;
}

function toAdminDTO(user: {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  isActive: boolean;
  avatarUrl: string | null;
  createdAt: Date;
}): UserAdminDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
    isActive: user.isActive,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISOString(),
  };
}

const SELECT = {
  id: true,
  name: true,
  email: true,
  isAdmin: true,
  isActive: true,
  avatarUrl: true,
  createdAt: true,
} as const;

export async function listUsers(): Promise<UserAdminDTO[]> {
  const users = await prisma.user.findMany({
    select: SELECT,
    orderBy: { createdAt: 'asc' },
  });
  return users.map(toAdminDTO);
}

export async function createUser(
  name: string,
  email: string,
  password: string
): Promise<UserAdminDTO> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error('EMAIL_IN_USE');

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, emailVerified: true },
    select: SELECT,
  });
  return toAdminDTO(user);
}

export async function setUserPassword(
  userId: string,
  newPassword: string,
): Promise<UserAdminDTO> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: SELECT });
  if (!user) throw new Error('USER_NOT_FOUND');

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
    select: SELECT,
  });
  return toAdminDTO(updated);
}

export async function setUserActive(
  userId: string,
  active: boolean,
  requestingUserId: string
): Promise<UserAdminDTO> {
  if (userId === requestingUserId) throw new Error('CANNOT_DEACTIVATE_SELF');

  const user = await prisma.user.findUnique({ where: { id: userId }, select: SELECT });
  if (!user) throw new Error('USER_NOT_FOUND');

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive: active },
    select: SELECT,
  });
  return toAdminDTO(updated);
}
