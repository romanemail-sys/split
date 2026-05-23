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
import type { SplitType, SplitInput, GroupMember } from '@split/shared';

const SPLIT_TYPES: SplitType[] = ['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES'];

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').substring(0, 2).toUpperCase();
}

function MemberPicker({
  members,
  selectedIds,
  paidById,
  onToggle,
  onSelectAll,
}: {
  members: GroupMember[];
  selectedIds: Set<string>;
  paidById: string;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
}) {
  const { t } = useTranslation();
  const allSelected = members.every((m) => selectedIds.has(m.userId));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{t('expense.participants')}</Label>
        <button
          type="button"
          onClick={onSelectAll}
          className="text-xs text-blue-600 hover:underline"
        >
          {allSelected ? t('expense.deselectAll') : t('expense.selectAll')}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {members.map((m) => {
          const selected = selectedIds.has(m.userId);
          const isPayer = m.userId === paidById;
          return (
            <button
              key={m.userId}
              type="button"
              onClick={() => onToggle(m.userId)}
              className={`relative flex items-center gap-2.5 p-2.5 rounded-xl border-2 text-start transition-all ${
                selected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 bg-white opacity-60 hover:opacity-80'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  selected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
                }`}
              >
                {initials(m.user.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{m.user.name}</p>
                {isPayer && (
                  <p className="text-xs text-blue-500">{t('expense.payer')}</p>
                )}
              </div>
              {selected && (
                <span className="absolute top-1.5 end-1.5 w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center">
                  <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 text-white fill-current">
                    <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-slate-400">
        {t('expense.participantCount', { count: selectedIds.size, total: members.length })}
      </p>
    </div>
  );
}

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
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [initialized, setInitialized] = useState(false);

  // Initialize from group on first load
  useEffect(() => {
    if (group && !initialized) {
      setInitialized(true);
      setPaidById(currentUser?.id ?? '');
      const allIds = new Set(group.members.map((m) => m.userId));
      setSelectedMemberIds(allIds);
      setSplits(group.members.map((m) => ({ userId: m.userId, amount: 0, percentage: 0, shares: 1 })));
      setCurrency(group.defaultCurrency);
    }
  }, [group, currentUser, initialized]);

  // Initialize from existing expense when editing
  useEffect(() => {
    if (existingExpense) {
      setDescription(existingExpense.description);
      setAmount(String(existingExpense.amount));
      setCurrency(existingExpense.currency);
      setCategoryId(existingExpense.categoryId ?? '');
      setSplitType(existingExpense.splitType);
      setDate(existingExpense.date);
      setPaidById(existingExpense.paidById);
      const existingSplits = existingExpense.splits.map((s) => ({
        userId: s.userId,
        amount: s.amount,
        percentage: 0,
        shares: 1,
      }));
      setSplits(existingSplits);
      setSelectedMemberIds(new Set(existingExpense.splits.map((s) => s.userId)));
    }
  }, [existingExpense]);

  function toggleMember(userId: string) {
    const isSelected = selectedMemberIds.has(userId);
    if (isSelected && selectedMemberIds.size <= 1) return; // keep at least one

    const next = new Set(selectedMemberIds);
    if (isSelected) {
      next.delete(userId);
      setSplits((prev) => prev.filter((s) => s.userId !== userId));
    } else {
      next.add(userId);
      setSplits((prev) => [...prev, { userId, amount: 0, percentage: 0, shares: 1 }]);
    }
    setSelectedMemberIds(next);
  }

  function handleSelectAll() {
    if (!group) return;
    const allSelected = group.members.every((m) => selectedMemberIds.has(m.userId));
    if (allSelected) {
      // Deselect all except first
      const first = group.members[0];
      if (!first) return;
      setSelectedMemberIds(new Set([first.userId]));
      setSplits([{ userId: first.userId, amount: 0, percentage: 0, shares: 1 }]);
    } else {
      const allIds = new Set(group.members.map((m) => m.userId));
      setSelectedMemberIds(allIds);
      setSplits(group.members.map((m) => {
        const existing = splits.find((s) => s.userId === m.userId);
        return existing ?? { userId: m.userId, amount: 0, percentage: 0, shares: 1 };
      }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const activeSplits = splits.filter((s) => selectedMemberIds.has(s.userId));
      if (expenseId && existingExpense) {
        await updateExpense.mutateAsync({
          description, amount: parseFloat(amount), currency,
          categoryId: categoryId || null, splitType, date,
          splits: activeSplits,
        });
        navigate(`/groups/${existingExpense.groupId}`);
      } else {
        const expense = await createExpense.mutateAsync({
          groupId: resolvedGroupId, paidById, description,
          amount: parseFloat(amount), currency,
          categoryId: categoryId || undefined, splitType, date,
          splits: activeSplits,
        });
        navigate(`/groups/${expense.groupId}`);
      }
    } catch {
      setError(t('expense.failed'));
    }
  }

  if (!group) return <div className="p-6 text-slate-400">{t('expense.loading')}</div>;

  const selectedMembers = group.members.filter((m) => selectedMemberIds.has(m.userId));
  const isPending = createExpense.isPending || updateExpense.isPending;
  const parsedAmount = parseFloat(amount) || 0;

  return (
    <div className="max-w-lg mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-slate-900">
        {expenseId ? t('expense.editExpense') : t('expense.addExpense')}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Description */}
        <div className="space-y-1">
          <Label htmlFor="description">{t('expense.description')}</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        {/* Amount + Currency */}
        <div className="flex gap-3">
          <div className="space-y-1 flex-1">
            <Label htmlFor="amount">{t('expense.amount')}</Label>
            <Input
              id="amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1 w-52">
            <Label htmlFor="currency">{t('expense.currency')}</Label>
            <CurrencySelect id="currency" value={currency} onChange={setCurrency} />
          </div>
        </div>

        {/* Date */}
        <div className="space-y-1">
          <Label htmlFor="date">{t('expense.date')}</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        {/* Paid by */}
        <div className="space-y-1">
          <Label htmlFor="paidBy">{t('expense.paidBy')}</Label>
          <select
            id="paidBy"
            value={paidById}
            onChange={(e) => setPaidById(e.target.value)}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
          >
            {group.members.map((m) => (
              <option key={m.userId} value={m.userId}>{m.user.name}</option>
            ))}
          </select>
        </div>

        {/* Category */}
        {categories && categories.length > 0 && (
          <div className="space-y-1">
            <Label htmlFor="category">{t('expense.category')}</Label>
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="">{t('expense.noCategory')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Participant picker */}
        <MemberPicker
          members={group.members}
          selectedIds={selectedMemberIds}
          paidById={paidById}
          onToggle={toggleMember}
          onSelectAll={handleSelectAll}
        />

        {/* Split type */}
        <div className="space-y-2">
          <Label>{t('expense.splitType')}</Label>
          <div className="flex gap-2 flex-wrap">
            {SPLIT_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSplitType(type)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                  splitType === type
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {t(`expense.splitTypeOptions.${type}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Split details */}
        <div className="space-y-2">
          <Label>{t('expense.splitDetails')}</Label>
          <SplitEditor
            splitType={splitType}
            members={selectedMembers}
            splits={splits}
            onChange={setSplits}
            amount={parsedAmount}
            currency={currency}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)} className="flex-1">
            {t('expense.cancel')}
          </Button>
          <Button type="submit" disabled={isPending} className="flex-1">
            {isPending
              ? t('expense.saving')
              : expenseId
              ? t('expense.saveChanges')
              : t('expense.addExpenseBtn')}
          </Button>
        </div>
      </form>
    </div>
  );
}
