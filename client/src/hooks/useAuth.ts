import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';
import { LoginRequest, RegisterRequest } from '@split/shared';

export function useLogin() {
  const { setAuth } = useAuthStore();
  return useMutation({
    mutationFn: (data: LoginRequest) => api.post('/auth/login', data).then((r) => r.data),
    onSuccess: (data) => setAuth(data.user, data.accessToken),
  });
}

export function useRegister() {
  const { setAuth } = useAuthStore();
  return useMutation({
    mutationFn: (data: RegisterRequest) => api.post('/auth/register', data).then((r) => r.data),
    onSuccess: (data) => setAuth(data.user, data.accessToken),
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/auth/logout').then((r) => r.data),
    onSuccess: () => {
      logout();
      qc.clear();
    },
  });
}

export function useMe() {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/auth/me').then((r) => r.data),
    enabled: !!user,
  });
}
