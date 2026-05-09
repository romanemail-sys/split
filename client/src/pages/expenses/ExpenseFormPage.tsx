import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGroup } from '../../hooks/useGroups';
import { useCreateExpense, useUpdateExpense, useExpense, useCategories } from '../../hooks/useExpenses';
import { useAuthStore } from '../../stores/auth.store';
import { SplitEditor } from '../../components/expense/SplitEditor';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { CurrencySelect } from '../../components/CurrencySelect';
import type { SplitType, SplitInput } from '@split/shared';

const SPLIT_TYPES: SplitType[] = ['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES'];

export function ExpenseFormPage() {
  const { t } = useTranslation();
  const { id: expenseId } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const groupId = searchParams.get('groupId') ?? '';

  const { data: existingExpense } = useExpense(expenseId ?? '');
  const resolvedGroupId = existingExpense?.groupId ?? groupId;

  const { data: group } = useGroup(resolvedGroupId);
  const { data: categories } = useCategories();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense(expenseId ?? '');
  const currentUser = useAuthStore((s) => s.user);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [categoryId, setCategoryId] = useState('');
  const [splitType, setSplitType] = useState<SplitType>('EQUAL');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidById, setPaidById] = useState('');
  const [splits, setSplits] = useState<SplitInput[]>([]);
  const [error, setError] = useState('');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (group && !initialized) {
      setInitialized(true);
      setPaidById(currentUser?.id ?? '');
      setSplits(group.members.map((m) => ({ userId: m.userId, amount: 0, percentage: 0, shares: 1 })));
      setCurrency(group.defaultCurrency);
    }
  }, [group, currentUser, initialized]);

  useEffect(() => {
    if (existingExpense) {
      setDescription(existingExpense.description);
      setAmount(String(existingExpense.amount));
      setCurrency(existingExpense.currency);
      setCategoryId(existingExpense.categoryId ?? '');
      setSplitType(existingExpense.splitType);
      setDate(existingExpense.date);
      setPaidById(existingExpense.paidById);
      setSplits(existingExpense.splits.map((s) => ({ userId: s.userId, amount: s.amount, percentage: 0, shares: 1 })));
    }
  }, [existingExpense]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      if (expenseId && existingExpense) {
        await updateExpense.mutateAsync({ description, amount: parseFloat(amount), currency, categoryId: categoryId || null, splitType, date, splits });
        navigate(`/groups/${existingExpense.groupId}`);
      } else {
        const expense = await createExpense.mutateAsync({ groupId: resolvedGroupId, paidById, description, amount: parseFloat(amount), currency, categoryId: categoryId || undefined, splitType, date, splits });
        navigate(`/groups/${expense.groupId}`);
      }
    } catch {
      setError(t('expense.failed'));
    }
  }

  if (!group) return <div className="p-6 text-slate-400">{t('expense.loading')}</div>;

  const isPending = createExpense.isPending || updateExpense.isPending;

  return (
    <div className="max-w-lg mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-slate-900">{expenseId ? t('expense.editExpense') : t('expense.addExpense')}</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1">
          <Label htmlFor="description">{t('expense.description')}</Label>
          <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} required />
        </div>
        <div className="flex gap-3">
          <div className="space-y-1 flex-1">
            <Label htmlFor="amount">{t('expense.amount')}</Label>
            <Input id="amount" type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div className="space-y-1 w-52">
            <Label htmlFor="currency">{t('expense.currency')}</Label>
            <CurrencySelect id="currency" value={currency} onChange={setCurrency} />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="date">{t('expense.date')}</Label>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="paidBy">{t('expense.paidBy')}</Label>
          <select id="paidBy" value={paidById} onChange={(e) => setPaidById(e.target.value)} className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900">
            {group.members.map((m) => (<option key={m.userId} value={m.userId}>{m.user.name}</option>))}
          </select>
        </div>
        {categories && categories.length > 0 && (
          <div className="space-y-1">
            <Label htmlFor="category">{t('expense.category')}</Label>
            <select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900">
              <option value="">{t('expense.noCategory')}</option>
              {categories.map((c) => (<option key={c.id} value={c.id}>{c.icon} {c.name}</option>))}
            </select>
          </div>
        )}
        <div className="space-y-2">
          <Label>{t('expense.splitType')}</Label>
          <div className="flex gap-2 flex-wrap">
            {SPLIT_TYPES.map((t_type) => (
              <button key={t_type} type="button" onClick={() => setSplitType(t_type)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${splitType === t_type ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                {t_type}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>{t('expense.splitDetails')}</Label>
          <SplitEditor splitType={splitType} members={group.members} splits={splits} onChange={setSplits} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)} className="flex-1">{t('expense.cancel')}</Button>
          <Button type="submit" disabled={isPending} className="flex-1">
            {isPending ? t('expense.saving') : (expenseId ? t('expense.saveChanges') : t('expense.addExpenseBtn'))}
          </Button>
        </div>
      </form>
    </div>
  );
}
