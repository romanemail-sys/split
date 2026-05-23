import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface DashboardData {
  groupCount: number;
  expenseCount: number;
  totalOwed: number;
  totalIOwe: number;
  recentExpenses: {
    id: string;
    description: string;
    amount: number;
    currency: string;
    date: string;
    paidByName: string;
    paidById: string;
    groupId: string;
    groupName: string;
    isMyExpense: boolean;
  }[];
}

export interface AnalyticsData {
  byMonth: { month: string; amount: number }[];
  byCategory: { name: string; icon: string; amount: number; count: number }[];
  topExpenses: { id: string; description: string; amount: number; currency: string; date: string }[];
  totalSpent: number;
}

export interface ActivityItem {
  type: 'EXPENSE_CREATED' | 'SPLIT_SETTLED' | 'MEMBER_JOINED';
  id: string;
  date: string;
  actorName: string;
  actorId: string;
  description: string;
  amount?: number;
  currency?: string;
  expenseId?: string;
  groupId?: string;
  groupName?: string;
}

export function useDashboard() {
  return useQuery<DashboardData>({
    queryKey: ['me', 'dashboard'],
    queryFn: async () => { const { data } = await api.get('/me/dashboard'); return data; },
  });
}

export function useAnalytics() {
  return useQuery<AnalyticsData>({
    queryKey: ['me', 'analytics'],
    queryFn: async () => { const { data } = await api.get('/me/analytics'); return data; },
  });
}

export function useUserActivity() {
  return useQuery<ActivityItem[]>({
    queryKey: ['me', 'activity'],
    queryFn: async () => { const { data } = await api.get('/me/activity'); return data; },
  });
}
