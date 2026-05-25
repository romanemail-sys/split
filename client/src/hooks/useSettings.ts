import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useChangePassword() {
  return useMutation<{ success: boolean }, Error, { currentPassword: string; newPassword: string }>({
    mutationFn: (body) => api.patch('/me/change-password', body).then((r) => r.data),
  });
}
