import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type {
  Expense, ExpensesPage, Category,
  CreateExpenseRequest, UpdateExpenseRequest,
} from '@split/shared';

export function useExpenses(groupId: string, page = 1, limit = 20) {
  return useQuery<ExpensesPage>({
    queryKey: ['expenses', groupId, page, limit],
    queryFn: async () => {
      const { data } = await api.get('/expenses', { params: { groupId, page, limit } });
      return data;
    },
    enabled: !!groupId,
  });
}

export function useExpense(expenseId: string) {
  return useQuery<Expense>({
    queryKey: ['expenses', expenseId],
    queryFn: async () => {
      const { data } = await api.get(`/expenses/${expenseId}`);
      return data;
    },
    enabled: !!expenseId,
  });
}

export function useCategories() {
  return useQuery<Category[]>({
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
  return useMutation<Expense, Error, CreateExpenseRequest>({
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

export function useUpdateExpense(expenseId: string) {
  const qc = useQueryClient();
  return useMutation<Expense, Error, UpdateExpenseRequest>({
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
  return useMutation<void, Error, { expenseId: string; groupId: string }>({
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
  return useQuery<ExpensesPage>({
    queryKey: ['expenses', 'all', page, limit],
    queryFn: async () => {
      const { data } = await api.get('/expenses', { params: { page, limit } });
      return data;
    },
  });
}

export function useSettleSplit(expenseId: string, groupId?: string) {
  const qc = useQueryClient();
  return useMutation<{ groupId: string }, Error, string>({
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
