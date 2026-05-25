import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
export function useExpenses(groupId, page = 1, limit = 20) {
    return useQuery({
        queryKey: ['expenses', groupId, page, limit],
        queryFn: async () => {
            const { data } = await api.get('/expenses', { params: { groupId, page, limit } });
            return data;
        },
        enabled: !!groupId,
    });
}
export function useExpense(expenseId) {
    return useQuery({
        queryKey: ['expenses', expenseId],
        queryFn: async () => {
            const { data } = await api.get(`/expenses/${expenseId}`);
            return data;
        },
        enabled: !!expenseId,
    });
}
export function useCategories() {
    return useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const { data } = await api.get('/categories');
            return data;
        },
        staleTime: Infinity,
    });
}
export function useCreateExpense() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (body) => {
            const { data } = await api.post('/expenses', body);
            return data;
        },
        onSuccess: (expense) => {
            qc.invalidateQueries({ queryKey: ['expenses', expense.groupId] });
            qc.invalidateQueries({ queryKey: ['groups', expense.groupId, 'balances'] });
        },
    });
}
export function useUpdateExpense(expenseId) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (body) => {
            const { data } = await api.put(`/expenses/${expenseId}`, body);
            return data;
        },
        onSuccess: (expense) => {
            qc.invalidateQueries({ queryKey: ['expenses', expense.groupId] });
            qc.invalidateQueries({ queryKey: ['expenses', expenseId] });
            qc.invalidateQueries({ queryKey: ['groups', expense.groupId, 'balances'] });
        },
    });
}
export function useDeleteExpense() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ expenseId }) => {
            await api.delete(`/expenses/${expenseId}`);
        },
        onSuccess: (_, { groupId }) => {
            qc.invalidateQueries({ queryKey: ['expenses', groupId] });
            qc.invalidateQueries({ queryKey: ['groups', groupId, 'balances'] });
        },
    });
}
export function useAllExpenses(page = 1, limit = 20) {
    return useQuery({
        queryKey: ['expenses', 'all', page, limit],
        queryFn: async () => {
            const { data } = await api.get('/expenses', { params: { page, limit } });
            return data;
        },
    });
}
export function useSettleSplit(expenseId, groupId) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (splitId) => {
            const { data } = await api.patch(`/expenses/${expenseId}/splits/${splitId}/settle`);
            return data;
        },
        onSuccess: (data) => {
            const gid = groupId ?? data.groupId;
            qc.invalidateQueries({ queryKey: ['expenses', expenseId] });
            if (gid) {
                qc.invalidateQueries({ queryKey: ['groups', gid, 'balances'] });
                qc.invalidateQueries({ queryKey: ['groups', gid, 'activity'] });
            }
        },
    });
}
