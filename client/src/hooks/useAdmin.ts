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
