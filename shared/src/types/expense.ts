export type SplitType = 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
}

export interface ExpenseSplit {
  id: string;
  expenseId: string;
  userId: string;
  amount: number;
  isSettled: boolean;
  settledAt: string | null;
  user?: { id: string; name: string; avatarUrl: string | null };
}

export interface Expense {
  id: string;
  groupId: string;
  paidById: string;
  description: string;
  amount: number;
  currency: string;
  amountBase: number;
  baseCurrency: string;
  categoryId: string | null;
  splitType: SplitType;
  date: string;
  receiptUrl: string | null;
  isRecurring: boolean;
  recurrenceRule: string | null;
  createdAt: string;
  paidBy: { id: string; name: string; avatarUrl: string | null };
  splits: ExpenseSplit[];
  category?: Category | null;
}

export interface SplitInput {
  userId: string;
  amount?: number;
  percentage?: number;
  shares?: number;
}

export interface CreateExpenseRequest {
  groupId: string;
  paidById: string;
  description: string;
  amount: number;
  currency: string;
  categoryId?: string;
  splitType: SplitType;
  date: string;
  receiptUrl?: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
  splits: SplitInput[];
}

export interface UpdateExpenseRequest {
  description?: string;
  amount?: number;
  currency?: string;
  categoryId?: string | null;
  splitType?: SplitType;
  date?: string;
  receiptUrl?: string | null;
  splits?: SplitInput[];
}

export interface ExpensesPage {
  expenses: Expense[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
