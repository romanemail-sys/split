import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type {
  GroupWithMembers, GroupMember, GroupBalance, ActivityItem,
  CreateGroupRequest, UpdateGroupRequest,
} from '@split/shared';

export function useGroups() {
  return useQuery<GroupWithMembers[]>({
    queryKey: ['groups'],
    queryFn: async () => {
      const { data } = await api.get('/groups');
      return data;
    },
  });
}

export function useGroup(groupId: string) {
  return useQuery<GroupWithMembers>({
    queryKey: ['groups', groupId],
    queryFn: async () => {
      const { data } = await api.get(`/groups/${groupId}`);
      return data;
    },
    enabled: !!groupId,
  });
}

export function useGroupBalances(groupId: string) {
  return useQuery<GroupBalance[]>({
    queryKey: ['groups', groupId, 'balances'],
    queryFn: async () => {
      const { data } = await api.get(`/groups/${groupId}/balances`);
      return data;
    },
    enabled: !!groupId,
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation<GroupWithMembers, Error, CreateGroupRequest>({
    mutationFn: async (body) => {
      const { data } = await api.post('/groups', body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export function useUpdateGroup(groupId: string) {
  const qc = useQueryClient();
  return useMutation<GroupWithMembers, Error, UpdateGroupRequest>({
    mutationFn: async (body) => {
      const { data } = await api.put(`/groups/${groupId}`, body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      qc.invalidateQueries({ queryKey: ['groups', groupId] });
    },
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (groupId) => {
      await api.delete(`/groups/${groupId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export function useInviteMember(groupId: string) {
  const qc = useQueryClient();
  return useMutation<GroupMember, Error, { email: string }>({
    mutationFn: async (body) => {
      const { data } = await api.post(`/groups/${groupId}/invite`, body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups', groupId] }),
  });
}

export function useGroupActivity(groupId: string) {
  return useQuery<ActivityItem[]>({
    queryKey: ['groups', groupId, 'activity'],
    queryFn: async () => {
      const { data } = await api.get(`/groups/${groupId}/activity`);
      return data;
    },
    enabled: !!groupId,
  });
}

export function useSettleMembers(groupId: string) {
  const qc = useQueryClient();
  return useMutation<{ settled: number }, Error, { fromUserId: string; toUserId: string }>({
    mutationFn: async (body) => {
      const { data } = await api.post(`/groups/${groupId}/settle-members`, body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups', groupId, 'balances'] });
      qc.invalidateQueries({ queryKey: ['expenses', groupId] });
      qc.invalidateQueries({ queryKey: ['groups', groupId, 'activity'] });
    },
  });
}

export function useRemoveMember(groupId: string) {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (memberId) => {
      await api.delete(`/groups/${groupId}/members/${memberId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups', groupId] }),
  });
}
