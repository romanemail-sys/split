import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
export function useAdminUsers() {
    return useQuery({
        queryKey: ['admin', 'users'],
        queryFn: () => api.get('/admin/users').then((r) => r.data),
    });
}
export function useCreateUser() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body) => api.post('/admin/users', body).then((r) => r.data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
    });
}
export function useToggleUserActive() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, active }) => api.patch(`/admin/users/${userId}/${active ? 'activate' : 'deactivate'}`).then((r) => r.data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
    });
}
export function useSetUserPassword() {
    return useMutation({
        mutationFn: ({ userId, password }) => api.patch(`/admin/users/${userId}/set-password`, { password }).then((r) => r.data),
    });
}
