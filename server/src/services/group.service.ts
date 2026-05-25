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
    inviteCode: (group as Group & { inviteCode?: string }).inviteCode ?? null,
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

export async function duplicateGroup(groupId: string, requesterId: string, newName: string) {
  await requireAdmin(groupId, requesterId);

  const source = await prisma.group.findUnique({
    where: { id: groupId },
    include: { members: true },
  });
  if (!source) throw new Error('GROUP_NOT_FOUND');

  const newGroup = await prisma.$transaction(async (tx) => {
    const group = await tx.group.create({
      data: {
        name: newName,
        description: source.description,
        defaultCurrency: source.defaultCurrency,
        createdById: requesterId,
      },
    });

    await tx.groupMember.createMany({
      data: source.members.map((m) => ({
        groupId: group.id,
        userId: m.userId,
        role: m.userId === requesterId ? 'ADMIN' : m.role,
      })),
    });

    return tx.group.findUnique({
      where: { id: group.id },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
      },
    });
  });

  const g = newGroup as GroupWithMembers;
  return { ...toGroupDTO(g), members: g.members.map(toMemberDTO) };
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

// ── Join / invite-link helpers ─────────────────────────────────────────────

/** Public preview of a group used on the join page (no membership required). */
export async function lookupGroup(query: string) {
  const q = query.trim();
  if (!q) throw new Error('EMPTY_QUERY');

  // Try exact inviteCode match first, then exact ID, then name search
  const byCode = await prisma.group.findUnique({ where: { inviteCode: q } });
  if (byCode) {
    const count = await prisma.groupMember.count({ where: { groupId: byCode.id } });
    return [{ id: byCode.id, name: byCode.name, description: byCode.description, defaultCurrency: byCode.defaultCurrency, memberCount: count, inviteCode: byCode.inviteCode }];
  }

  const byId = await prisma.group.findUnique({ where: { id: q } });
  if (byId) {
    const count = await prisma.groupMember.count({ where: { groupId: byId.id } });
    return [{ id: byId.id, name: byId.name, description: byId.description, defaultCurrency: byId.defaultCurrency, memberCount: count, inviteCode: byId.inviteCode }];
  }

  // Name search (case-insensitive contains)
  const byName = await prisma.group.findMany({
    where: { name: { contains: q, mode: 'insensitive' } },
    take: 10,
    orderBy: { name: 'asc' },
  });
  const results = await Promise.all(byName.map(async (g) => {
    const count = await prisma.groupMember.count({ where: { groupId: g.id } });
    return { id: g.id, name: g.name, description: g.description, defaultCurrency: g.defaultCurrency, memberCount: count, inviteCode: g.inviteCode };
  }));
  return results;
}

/** Any authenticated user can join a group via its invite code or ID. */
export async function joinGroup(identifier: string, userId: string) {
  // resolve by inviteCode, then by ID
  let group = await prisma.group.findUnique({ where: { inviteCode: identifier } });
  if (!group) group = await prisma.group.findUnique({ where: { id: identifier } });
  if (!group) throw new Error('GROUP_NOT_FOUND');

  const existing = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId } },
  });
  if (existing) throw new Error('ALREADY_MEMBER');

  const member = await prisma.groupMember.create({
    data: { groupId: group.id, userId, role: 'MEMBER' },
    ...memberInclude,
  });
  return { group: toGroupDTO(group), member: toMemberDTO(member as unknown as MemberWithUser) };
}

/** Admin: generate a fresh invite code (revokes the old link). */
export async function resetInviteCode(groupId: string, requesterId: string) {
  await requireAdmin(groupId, requesterId);
  const { randomUUID } = await import('crypto');
  const group = await prisma.group.update({
    where: { id: groupId },
    data: { inviteCode: randomUUID() },
  });
  return { inviteCode: group.inviteCode };
}
