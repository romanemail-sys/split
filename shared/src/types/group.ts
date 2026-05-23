export interface Group {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  defaultCurrency: string;
  createdById: string;
  createdAt: string;
}

export interface GroupMemberUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: 'ADMIN' | 'MEMBER';
  joinedAt: string;
  user: GroupMemberUser;
}

export interface GroupWithMembers extends Group {
  members: GroupMember[];
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  defaultCurrency?: string;
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string | null;
  defaultCurrency?: string;
}

export interface GroupBalance {
  fromUserId: string;
  fromName: string;
  fromAvatarUrl: string | null;
  toUserId: string;
  toName: string;
  toAvatarUrl: string | null;
  amount: number;
  currency: string;
}

export type ActivityType = 'EXPENSE_CREATED' | 'SPLIT_SETTLED' | 'MEMBER_JOINED' | 'MEMBER_REMOVED';

export interface ActivityItem {
  type: ActivityType;
  id: string;
  date: string;
  actorName: string;
  actorId: string;
  description: string;
  amount?: number;
  currency?: string;
  expenseId?: string;
  targetName?: string;
}
