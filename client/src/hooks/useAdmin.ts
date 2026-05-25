import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface UserAdminDTO {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  isActive: boolean;
  avatarUrl: string | null;
  createdAt: string;
}

export function useAdminUsers() {
  return useQuery<UserAdminDTO[]>({
    queryKey: ['admin', 'users'],
    queryFn: () => api.get('/admin/users').then((r) => r.data),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation<UserAdminDTO, Error, { name: string; email: string; password: string }>({
    mutationFn: (body) => api.post('/admin/users', body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useToggleUserActive() {
  const qc = useQueryClient();
  return useMutation<UserAdminDTO, Error, { userId: string; active: boolean }>({
    mutationFn: ({ userId, active }) =>
      api.patch(`/admin/users/${userId}/${active ? 'activate' : 'deactivate'}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useSetUserPassword() {
  return useMutation<UserAdminDTO, Error, { userId: string; password: string }>({
    mutationFn: ({ userId, password }) =>
      api.patch(`/admin/users/${userId}/set-password`, { password }).then((r) => r.data),
  });
}

// ── Admin group management ─────────────────────────────────────────────────

export interface GroupAdminDTO {
  id: string;
  name: string;
  description: string | null;
  defaultCurrency: string;
  createdById: string;
  createdAt: string;
  frozen: boolean;
  memberCount: number;
  expenseCount: number;
}

export function useAdminGroups() {
  return useQuery<GroupAdminDTO[]>({
    queryKey: ['admin', 'groups'],
    queryFn: () => api.get('/admin/groups').then((r) => r.data),
  });
}

export function useAdminCreateGroup() {
  const qc = useQueryClient();
  return useMutation<GroupAdminDTO, Error, { name: string; description?: string; defaultCurrency?: string }>({
    mutationFn: (body) => api.post('/admin/groups', body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'groups'] }),
  });
}

export function useAdminFreezeGroup() {
  const qc = useQueryClient();
  return useMutation<GroupAdminDTO, Error, { groupId: string; freeze: boolean }>({
    mutationFn: ({ groupId, freeze }) =>
      api.patch(`/admin/groups/${groupId}/${freeze ? 'freeze' : 'unfreeze'}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'groups'] });
      qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useAdminDeleteGroup() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (groupId) => api.delete(`/admin/groups/${groupId}`).then(() => undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'groups'] });
      qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useSendBalanceReport() {
  return useMutation<{ sent: number; errors: number }, Error, void>({
    mutationFn: () => api.post('/admin/send-balance-report').then((r) => r.data),
  });
}
