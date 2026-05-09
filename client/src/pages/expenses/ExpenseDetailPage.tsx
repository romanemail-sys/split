import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useExpense, useDeleteExpense } from '../../hooks/useExpenses';
import { useAuthStore } from '../../stores/auth.store';
import { useGroup } from '../../hooks/useGroups';
import { Button } from '../../components/ui/button';
import { useCurrencyRate } from '../../hooks/useCurrencyRate';

export function ExpenseDetailPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: expense, isLoading } = useExpense(id);
  const { data: group } = useGroup(expense?.groupId ?? '');
  const deleteExpense = useDeleteExpense();
  const currentUserId = useAuthStore((s) => s.user?.id);

  if (isLoading) return <div className="p-6 text-slate-400">{t('expense.loading')}</div>;
  if (!expense) return <div className="p-6 text-red-600">{t('expense.notFound')}</div>;

  const isAdmin = group?.members.find((m) => m.userId === currentUserId)?.role === 'ADMIN';
  const canEdit = expense.paidById === currentUserId || isAdmin;

  async function handleDelete() {
    if (!confirm(t('expense.confirmDelete'))) return;
    await deleteExpense.mutateAsync({ expenseId: expense!.id, groupId: expense!.groupId });
    navigate(`/groups/${expense!.groupId}`);
  }

  const currencyMismatch = expense.currency !== expense.baseCurrency;
  const { data: rateData } = useCurrencyRate(expense.currency, expense.baseCurrency);

  return (
    <div className="max-w-lg mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{expense.description}</h1>
        {canEdit && (
          <div className="flex gap-2">
            <Link to={`/expenses/${id}/edit`} className="inline-flex items-center justify-center rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
              {t('expense.edit')}
            </Link>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleteExpense.isPending}>
              {t('expense.delete')}
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 p-5 bg-white">
        <div className="flex justify-between">
          <span className="text-slate-500">{t('expense.amount')}</span>
          <span className="font-semibold text-expense">{expense.amount.toFixed(2)} {expense.currency}</span>
        </div>
        {currencyMismatch && (
          <div className="flex justify-between">
            <span className="text-slate-500">{t('expense.baseAmount')}</span>
            <span className="text-slate-700">{expense.amountBase.toFixed(2)} {expense.baseCurrency}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-slate-500">{t('expense.paidBy')}</span>
          <span className="text-slate-900">{expense.paidBy.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">{t('expense.date')}</span>
          <span className="text-slate-900">{expense.date}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">{t('expense.splitTypeLabel')}</span>
          <span className="text-slate-900">{expense.splitType}</span>
        </div>
        {expense.category && (
          <div className="flex justify-between">
            <span className="text-slate-500">{t('expense.categoryLabel')}</span>
            <span className="text-slate-900">{expense.category.icon} {expense.category.name}</span>
          </div>
        )}
      </div>
      {currencyMismatch && rateData && (
        <div className="mt-2 text-xs text-slate-400 text-end">
          {t('expense.exchangeRate', {
            from: rateData.from,
            rate: rateData.rate.toFixed(4),
            to: rateData.to,
          })}
        </div>
      )}

      <div className="mt-6">
        <h2 className="font-semibold mb-3 text-slate-900">{t('expense.splits')}</h2>
        <div className="space-y-2">
          {expense.splits.map((split) => (
            <div key={split.id} className="flex justify-between items-center p-3 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-900">{split.user?.name ?? split.userId}</span>
                {split.isSettled && (
                  <span className="text-xs bg-green-100 text-income px-2 py-0.5 rounded-full">{t('expense.settled')}</span>
                )}
              </div>
              <span className={`text-sm font-semibold ${split.isSettled ? 'text-income' : 'text-expense'}`}>
                {split.amount.toFixed(2)} {expense.baseCurrency}
              </span>
            </div>
          ))}
        </div>
      </div>

      {expense.receiptUrl && (
        <div className="mt-6">
          <h2 className="font-semibold mb-3 text-slate-900">{t('expense.receipt')}</h2>
          <img src={expense.receiptUrl} alt={t('expense.receipt')} className="rounded-lg border border-slate-200 max-w-full" />
        </div>
      )}

      <div className="mt-6">
        <Link to={`/groups/${expense.groupId}`} className="text-sm text-blue-600 hover:text-blue-800 transition-colors">
          {t('expense.backToGroup')}
        </Link>
      </div>
    </div>
  );
}
