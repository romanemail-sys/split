import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
export function useDashboard() {
    return useQuery({
        queryKey: ['me', 'dashboard'],
        queryFn: async () => { const { data } = await api.get('/me/dashboard'); return data; },
    });
}
export function useAnalytics() {
    return useQuery({
        queryKey: ['me', 'analytics'],
        queryFn: async () => { const { data } = await api.get('/me/analytics'); return data; },
    });
}
export function useUserActivity() {
    return useQuery({
        queryKey: ['me', 'activity'],
        queryFn: async () => { const { data } = await api.get('/me/activity'); return data; },
    });
}
