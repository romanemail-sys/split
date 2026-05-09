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
  userId: string;
  name: string;
  avatarUrl: string | null;
  balance: number;
}
