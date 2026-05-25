import { prisma } from '../lib/prisma';
import type { Group, GroupMember } from '@prisma/client';

interface CreateGroupData {
  name: string;
  description?: string;
  defaultCurrency?: string;
}

interface UpdateGroupData {
  name?: string;
  description?: string | null;
  defaultCurrency?: string;
}

type MemberWithUser = GroupMember & {
  user: { id: string; name: string; email: string; avatarUrl: string | null };
};

type GroupWithMembers = Group & { members: MemberWithUser[] };

function toGroupDTO(group: Group) {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    imageUrl: group.imageUrl,
    defaultCurrency: group.defaultCurrency,
    createdById: group.createdById,
    createdAt: group.createdAt.toISOString(),
  };
}

function toMemberDTO(member: MemberWithUser) {
  return {
    id: member.id,
    groupId: member.groupId,
    userId: member.userId,
    role: member.role as 'ADMIN' | 'MEMBER',
    joinedAt: member.joinedAt.toISOString(),
    user: member.user,
  };
}

async function requireAdmin(groupId: string, userId: string): Promise<void> {
  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!member) throw new Error('NOT_MEMBER');
  if (member.role !== 'ADMIN') throw new Error('FORBIDDEN');
}

async function requireMember(groupId: string, userId: string): Promise<void> {
  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!member) throw new Error('NOT_MEMBER');
}

const memberInclude = {
  include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
} as const;

export async function createGroup(userId: string, data: CreateGroupData) {
  const group = await prisma.group.create({
    data: {
      name: data.name,
      description: data.description ?? null,
      defaultCurrency: data.defaultCurrency ?? 'USD',
      createdById: userId,
      members: { create: { userId, role: 'ADMIN' } },
    },
    include: { members: memberInclude },
  });
  const g = group as unknown as GroupWithMembers;
  return { ...toGroupDTO(g), members: g.members.map(toMemberDTO) };
}

export async function getGroup(groupId: string, userId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { members: memberInclude },
  });
  if (!group) throw new Error('GROUP_NOT_FOUND');
  const g = group as unknown as GroupWithMembers;
  if (!g.members.some((m) => m.userId === userId)) throw new Error('NOT_MEMBER');
  return { ...toGroupDTO(g), members: g.members.map(toMemberDTO) };
}

export async function listGroups(userId: string) {
  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    include: {
      group: { include: { members: memberInclude } },
    },
    orderBy: { group: { createdAt: 'desc' } },
  });
  return memberships.map((m) => {
    const g = m.group as unknown as GroupWithMembers;
    return { ...toGroupDTO(g), members: g.members.map(toMemberDTO) };
  });
}

export async function updateGroup(groupId: string, userId: string, data: UpdateGroupData) {
  await requireAdmin(groupId, userId);
  const group = await prisma.group.update({
    where: { id: groupId },
    data,
    include: { members: memberInclude },
  });
  const g = group as unknown as GroupWithMembers;
  return { ...toGroupDTO(g), members: g.members.map(toMemberDTO) };
}

export async function deleteGroup(groupId: string, userId: string): Promise<void> {
  await requireAdmin(groupId, userId);
  await prisma.group.delete({ where: { id: groupId } });
}

export async function addMember(groupId: string, requesterId: string, email: string) {
  await requireAdmin(groupId, requesterId);
  const target = await prisma.user.findUnique({ where: { email } });
  if (!target) throw new Error('USER_NOT_FOUND');
  const existing = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: target.id } },
  });
  if (existing) throw new Error('ALREADY_MEMBER');
  const member = await prisma.groupMember.create({
    data: { groupId, userId: target.id, role: 'MEMBER' },
    ...memberInclude,
  });
  return toMemberDTO(member as unknown as MemberWithUser);
}

export async function removeMember(groupId: string, requesterId: string, targetUserId: string): Promise<void> {
  await requireAdmin(groupId, requesterId);
  await prisma.groupMember.delete({
    where: { groupId_userId: { groupId, userId: targetUserId } },
  });
}

export async function listMembers(groupId: string, userId: string) {
  await requireMember(groupId, userId);
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    ...memberInclude,
  });
  return (members as unknown as MemberWithUser[]).map(toMemberDTO);
}

export async function searchInviteCandidates(groupId: string, requesterId: string, query: string) {
  await requireAdmin(groupId, requesterId);

  // Get IDs of users already in the group
  const existing = await prisma.groupMember.findMany({
    where: { groupId },
    select: { userId: true },
  });
  const existingIds = existing.map((m) => m.userId);

  const q = query.trim();
  const users = await prisma.user.findMany({
    where: {
      id: { notIn: existingIds },
      isActive: true,
      ...(q && {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      }),
    },
    select: { id: true, name: true, email: true, avatarUrl: true },
    take: 20,
    orderBy: { name: 'asc' },
  });

  return users;
}
